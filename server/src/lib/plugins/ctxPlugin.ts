import { type AnthropicProvider, createAnthropic } from "@ai-sdk/anthropic";
import { createGoogleGenerativeAI, type GoogleGenerativeAIProvider } from "@ai-sdk/google";
import { createGroq, type GroqProvider } from "@ai-sdk/groq";
import { createOpenAI, type OpenAIProvider } from "@ai-sdk/openai";
import { createPerplexity, type PerplexityProvider } from "@ai-sdk/perplexity";
import { createOpenRouter, type OpenRouterProvider } from "@openrouter/ai-sdk-provider";
import type { FastifyInstance, FastifyRequest } from "fastify";
import fp from "fastify-plugin";
import { appLogger } from "../../app";
import { getApiKeyForProvider, getDatabase } from "../../db";
import type { Logger } from "../pino";

type AiCtx = {
  openai: OpenAIProvider;
  anthropic: AnthropicProvider;
  groq: GroqProvider;
  perplexity: PerplexityProvider;
  openrouter: OpenRouterProvider;
  google: GoogleGenerativeAIProvider;
};

// Database type from Drizzle
type DB = ReturnType<typeof getDatabase>;

/**
 * Create AI context with providers initialized from database API keys.
 * Falls back to environment variables if no database key is found.
 */
export function createAiCtx(): AiCtx {
  // Fetch API keys from database, fallback to env vars
  const openaiKey = getApiKeyForProvider("openai") ?? process.env.OPENAI_API_KEY ?? "";
  const anthropicKey = getApiKeyForProvider("anthropic") ?? process.env.ANTHROPIC_API_KEY ?? "";
  const groqKey = getApiKeyForProvider("groq") ?? process.env.GROQ_API_KEY ?? "";
  const perplexityKey = getApiKeyForProvider("perplexity") ?? process.env.PERPLEXITY_API_KEY ?? "";
  const openrouterKey = getApiKeyForProvider("openrouter") ?? process.env.OPENROUTER_API_KEY ?? "";
  const googleKey = getApiKeyForProvider("google") ?? process.env.GOOGLE_API_KEY ?? "";

  return {
    openai: createOpenAI({ apiKey: openaiKey }),
    anthropic: createAnthropic({ apiKey: anthropicKey }),
    groq: createGroq({ apiKey: groqKey }),
    perplexity: createPerplexity({ apiKey: perplexityKey }),
    openrouter: createOpenRouter({ apiKey: openrouterKey }),
    google: createGoogleGenerativeAI({ apiKey: googleKey }),
  };
}

export type AppCtx = {
  ai: AiCtx;
  db: DB;
  logger: Logger;
};

declare module "fastify" {
  interface FastifyRequest {
    ctx: AppCtx | null;
  }
}

let _ai: AiCtx;
let _db: DB;

async function ctxPlugin(fastify: FastifyInstance) {
  _db = getDatabase();
  _ai = createAiCtx();

  fastify.decorateRequest("ctx", null);

  fastify.addHook("onRequest", async (request: FastifyRequest) => {
    request.ctx = {
      ai: _ai,
      db: _db,
      logger: appLogger.child(`req-${request.id}`),
    };
  });
}

export default fp(ctxPlugin, {
  name: "ctx-plugin",
});
