import { google } from "@ai-sdk/google";
import { streamText } from "ai";
// TODO: [SERVER MIGRATION] Prompts are now on server (server/src/prompts.ts)
// TODO: [SERVER MIGRATION] Env/API keys are now on server (server/src/env.ts)
// This entire service will be migrated to server. Client will call server API endpoints.
import { apiFetch } from "../lib/api";
import { widgetPreferencesStore } from "../stores/widgetPreferencesStore";

export interface AiStreamOptions {
  messages: any[];
  systemPrompt?: string;
  abortSignal?: AbortSignal;
  useSearchGrounding?: boolean;
}

export interface AiStreamOptionsLegacy {
  userMessage: string;
  screenshot?: {
    contentType: string;
    url: string;
  };
  abortSignal?: AbortSignal;
  useSearchGrounding?: boolean;
}

export interface AiStreamResult {
  textStream: AsyncIterable<string>;
  finishPromise: Promise<{
    text: string;
    finishReason: string;
    usage?: {
      promptTokens: number;
      completionTokens: number;
      totalTokens: number;
    };
    sources?: any[];
    groundingMetadata?: any;
  }>;
}

export class AiApiService {
  async streamResponse(options: AiStreamOptions): Promise<AiStreamResult> {
    const { messages, systemPrompt, abortSignal } = options;

    try {
      const selectedModel = widgetPreferencesStore.getState().selectedModel;
      const provider = selectedModel?.provider ?? "google";
      const model = selectedModel?.model ?? "gemini-2.5-flash";

      if (provider === "google") {
        return this.streamViaAiSdk(google(model), messages, systemPrompt, abortSignal);
      }
      // Every other provider goes through the server's OpenAI-compatible proxy,
      // which resolves credentials from the provider connection.
      return await this.streamViaServerProxy(provider, model, messages, systemPrompt, abortSignal);
    } catch (error) {
      console.error("AI API Error:", error);
      const err = new Error(
        `AI service error: ${error instanceof Error ? error.message : "Unknown error"}`,
      );
      (err as any).cause = error;
      throw err;
    }
  }

  private streamViaAiSdk(
    modelInstance: ReturnType<typeof google>,
    messages: any[],
    systemPrompt?: string,
    abortSignal?: AbortSignal,
  ): AiStreamResult {
    const result = streamText({
      model: modelInstance,
      messages,
      instructions: systemPrompt,
      maxOutputTokens: 4000,
      temperature: 0.1,
      abortSignal,
    });

    return {
      textStream: result.textStream,
      finishPromise: (async () => {
        try {
          const finalResult = await result;
          const usage = await finalResult.usage;
          return {
            text: await finalResult.text,
            finishReason: (await finalResult.finishReason) as string,
            usage: usage
              ? {
                  promptTokens: usage.inputTokens ?? 0,
                  completionTokens: usage.outputTokens ?? 0,
                  totalTokens:
                    usage.totalTokens ?? (usage.inputTokens ?? 0) + (usage.outputTokens ?? 0),
                }
              : undefined,
            sources: await finalResult.sources,
            groundingMetadata: undefined,
          };
        } catch (finishError) {
          console.error("Error in finishPromise:", finishError);
          throw finishError;
        }
      })(),
    };
  }

  private async streamViaServerProxy(
    provider: string,
    model: string,
    messages: any[],
    systemPrompt?: string,
    abortSignal?: AbortSignal,
  ): Promise<AiStreamResult> {
    const res = await apiFetch("/chat/completions", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        provider,
        model,
        messages,
        system: systemPrompt,
        maxOutputTokens: 4000,
        temperature: 0.1,
        stream: true,
      }),
      signal: abortSignal,
    });
    if (!res.ok || !res.body) {
      const detail = await res.text().catch(() => "");
      throw new Error(`Chat request failed (${res.status}): ${detail.slice(0, 300)}`);
    }

    // Parse the upstream OpenAI SSE stream into text deltas
    const reader = res.body.getReader();
    const decoder = new TextDecoder();
    let buffer = "";
    let done = false;
    let finishReason = "stop";
    let usage: { promptTokens: number; completionTokens: number; totalTokens: number } | undefined;

    const pullNextEvent = async (): Promise<string | null> => {
      for (;;) {
        const idx = buffer.indexOf("\n\n");
        if (idx !== -1) {
          const event = buffer.slice(0, idx);
          buffer = buffer.slice(idx + 2);
          return event;
        }
        if (done) {
          const last = buffer;
          buffer = "";
          return last.length > 0 ? last : null;
        }
        const chunk = await reader.read();
        if (chunk.done) {
          done = true;
        } else {
          buffer += decoder.decode(chunk.value, { stream: true });
        }
      }
    };

    let fullText = "";
    let resolveDone: () => void = () => {};
    const donePromise = new Promise<void>((r) => {
      resolveDone = r;
    });
    abortSignal?.addEventListener("abort", resolveDone, { once: true });

    const textStream = (async function* () {
      try {
        for (;;) {
          const event = await pullNextEvent();
          if (event === null) return;
          for (const line of event.split("\n")) {
            if (!line.startsWith("data:")) continue;
            const data = line.slice(5).trim();
            if (data === "[DONE]") return;
            try {
              const json = JSON.parse(data);
              const delta = json.choices?.[0]?.delta;
              if (typeof delta?.content === "string" && delta.content) {
                fullText += delta.content;
                yield delta.content;
              }
              if (json.choices?.[0]?.finish_reason) finishReason = json.choices[0].finish_reason;
              if (json.usage) {
                usage = {
                  promptTokens: json.usage.prompt_tokens ?? 0,
                  completionTokens: json.usage.completion_tokens ?? 0,
                  totalTokens: json.usage.total_tokens ?? 0,
                };
              }
            } catch {
              // Ignore malformed keep-alive lines
            }
          }
        }
      } finally {
        resolveDone();
      }
    })();

    const finishPromise = donePromise.then(() => ({
      text: fullText,
      finishReason,
      usage: usage ?? undefined,
      sources: undefined,
      groundingMetadata: undefined,
    }));

    return { textStream, finishPromise };
  }

  /**
   * @deprecated This method will be replaced by server API calls.
   */
  async streamResponseLegacy(_options: AiStreamOptionsLegacy): Promise<AiStreamResult> {
    throw new Error("streamResponseLegacy is deprecated. Migrate to server API endpoints.");
  }

  isConfigured(): boolean {
    const selectedModel = widgetPreferencesStore.getState().selectedModel;
    return selectedModel !== null;
  }
}

export const aiApiService = new AiApiService();
