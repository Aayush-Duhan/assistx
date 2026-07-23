/**
 * @file routes/chat.routes.ts
 * Chat proxy: resolves the active connection for a provider and streams back
 * OpenAI-format SSE. OpenAI-compatible upstreams are proxied raw (tolerates
 * non-standard SSE chunks, e.g. opencode zen); claude/gemini formats go through
 * the AI SDK, which handles their auth scheme, body shape and image parts.
 */

import type { FastifyInstance } from "fastify";
import { createAnthropic } from "@ai-sdk/anthropic";
import { createGoogleGenerativeAI } from "@ai-sdk/google";
import { streamText } from "ai";
import { getProviderConnections } from "../db";
import { PROVIDERS, PROVIDER_MODELS, REGISTRY } from "../lib/providers";

interface ChatBody {
  provider: string;
  model: string;
  messages: any[];
  system?: string;
  maxOutputTokens?: number;
  temperature?: number;
  stream?: boolean;
}

/** The picker may send a display name; resolve it back to the upstream model id. */
function resolveModelId(provider: string, model: string): string {
  const models = PROVIDER_MODELS[provider] || [];
  const match = models.find((m: any) => m.id === model || m.name === model);
  return match?.id || model;
}

function stripSuffix(url: string, suffixes: string[]): string {
  for (const s of suffixes) {
    if (url.endsWith(s)) return url.slice(0, -s.length);
  }
  return url.replace(/\/$/, "");
}

/** Convert ai-sdk message parts ({type:"image", image}) to OpenAI chat format. */
function toOpenAIMessages(messages: any[], system?: string): any[] {
  const convert = (msg: any) => {
    if (!Array.isArray(msg?.content)) return msg;
    return {
      ...msg,
      content: msg.content.map((part: any) =>
        part?.type === "image" && typeof part.image === "string"
          ? { type: "image_url", image_url: { url: part.image } }
          : part,
      ),
    };
  };
  const out = messages.map(convert);
  if (system) out.unshift({ role: "system", content: system });
  return out;
}

export async function chatRoutes(fastify: FastifyInstance): Promise<void> {
  fastify.post<{ Body: ChatBody }>(
    "/completions",
    { bodyLimit: 20 * 1024 * 1024 },
    async (request, reply) => {
      const { provider, model, messages, system, maxOutputTokens, temperature, stream } =
        request.body || {};
      if (!provider || !model || !Array.isArray(messages)) {
        return reply.status(400).send({ error: "provider, model and messages are required" });
      }

      const connections = getProviderConnections().filter((c: any) => c.provider === provider);
      const connection: any = connections.find((c: any) => c.isActive === true) || connections[0];
      const registryEntry: any = REGISTRY.find((e: any) => e.id === provider);

      // Custom endpoints (openai-compatible / anthropic-compatible) have no registry
      // transport — build one from the connection's saved baseUrl
      let transport: any = PROVIDERS[provider];
      if (!transport?.baseUrl) {
        const customBase: string | undefined = connection?.providerSpecificData?.baseUrl;
        if (!customBase) {
          return reply.status(400).send({ error: `No chat transport for provider: ${provider}` });
        }
        const base = customBase.replace(/\/$/, "");
        transport =
          provider === "anthropic-compatible"
            ? { baseUrl: `${base}/messages`, format: "claude" }
            : { baseUrl: `${base}/chat/completions`, format: "openai" };
      }

      const apiKey = connection?.apiKey || connection?.accessToken || "";
      if (!apiKey && !registryEntry?.noAuth && !transport.noAuth) {
        return reply.status(400).send({
          error: `No credentials configured for ${provider}. Add a connection in Providers.`,
        });
      }

      const format = transport.format || "openai";
      const controller = new AbortController();
      request.raw.on("close", () => controller.abort());
      const modelId = resolveModelId(provider, model);

      // ── Claude / Gemini formats: AI SDK handles auth, body shape, image parts ──
      if (format === "claude" || format === "gemini") {
        const languageModel =
          format === "claude"
            ? createAnthropic({
                baseURL: stripSuffix(transport.baseUrl, ["/messages"]),
                apiKey,
                headers: transport.headers || {},
              })(modelId)
            : createGoogleGenerativeAI({
                baseURL: stripSuffix(transport.baseUrl, ["/models"]),
                apiKey,
              })(modelId);

        let hijacked = false;
        try {
          const result = streamText({
            model: languageModel,
            messages,
            instructions: system,
            maxOutputTokens: maxOutputTokens ?? 4000,
            temperature,
            abortSignal: controller.signal,
          });

          reply.hijack();
          hijacked = true;
          const raw = reply.raw;
          raw.writeHead(200, { "Content-Type": "text/event-stream", "Cache-Control": "no-cache" });

          for await (const part of result.stream) {
            const p = part as any;
            if (p.type === "text-delta") {
              const text = p.delta ?? p.text ?? "";
              if (text) {
                raw.write(
                  `data: ${JSON.stringify({ choices: [{ index: 0, delta: { content: text } }] })}\n\n`,
                );
              }
            } else if (p.type === "error") {
              raw.write(
                `data: ${JSON.stringify({ error: { message: p.error instanceof Error ? p.error.message : String(p.error) } })}\n\n`,
              );
            }
          }
          // usage is PromiseLike — await it before emitting the finish event
          let resolvedUsage: any;
          try {
            resolvedUsage = await (result as any).usage;
          } catch {
            resolvedUsage = undefined;
          }
          raw.write(
            `data: ${JSON.stringify({
              choices: [{ index: 0, delta: {}, finish_reason: "stop" }],
              usage: {
                prompt_tokens: resolvedUsage?.inputTokens ?? 0,
                completion_tokens: resolvedUsage?.outputTokens ?? 0,
                total_tokens: resolvedUsage?.totalTokens ?? 0,
              },
            })}\n\n`,
          );
          raw.write("data: [DONE]\n\n");
          raw.end();
        } catch (err) {
          if (!hijacked) {
            return reply.status(502).send({
              error: `Upstream request failed: ${err instanceof Error ? err.message : String(err)}`,
            });
          }
          reply.raw.end();
        }
        return;
      }

      // ── OpenAI-compatible upstreams: raw passthrough (tolerates extra SSE events) ──
      if (format !== "openai" && format !== "ollama") {
        return reply
          .status(400)
          .send({ error: `Unsupported transport format for chat: ${format}` });
      }

      const headers: Record<string, string> = {
        "Content-Type": "application/json",
        ...transport.headers,
      };
      if (apiKey) headers["Authorization"] = `Bearer ${apiKey}`;

      const wantStream = stream !== false;
      let upstream: Response;
      try {
        upstream = await fetch(transport.baseUrl, {
          method: "POST",
          headers,
          body: JSON.stringify({
            model: modelId,
            messages: toOpenAIMessages(messages, system),
            stream: wantStream,
            // No stream_options: some upstreams (e.g. opencode zen) reject them
            ...(maxOutputTokens ? { max_tokens: maxOutputTokens } : {}),
            ...(temperature !== undefined ? { temperature } : {}),
          }),
          signal: controller.signal,
        });
      } catch (err) {
        return reply.status(502).send({
          error: `Upstream request failed: ${err instanceof Error ? err.message : String(err)}`,
        });
      }

      if (!upstream.ok || !upstream.body) {
        const text = await upstream.text().catch(() => "");
        return reply
          .status(upstream.status || 502)
          .send({ error: `Upstream error: ${text.slice(0, 500)}` });
      }

      reply.hijack();
      const raw = reply.raw;
      raw.writeHead(upstream.status, {
        "Content-Type": upstream.headers.get("content-type") || "text/event-stream",
        "Cache-Control": "no-cache",
      });
      const reader = upstream.body.getReader();
      try {
        for (;;) {
          const { done, value } = await reader.read();
          if (done) break;
          raw.write(Buffer.from(value));
        }
      } catch {
        raw.destroy();
        return;
      }
      raw.end();
    },
  );
}
