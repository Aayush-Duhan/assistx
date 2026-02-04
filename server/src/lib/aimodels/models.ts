/**
 * @file models.ts
 * AI provider context and model utilities for local (single-user) Fastify backend.
 * No Cloudflare, PostHog, or multi-tenancy dependencies.
 */

import type { AnthropicProvider } from "@ai-sdk/anthropic";
import type { OpenRouterProvider } from "@openrouter/ai-sdk-provider";
import { createAnthropic } from "@ai-sdk/anthropic";
import type { GoogleGenerativeAIProvider } from "@ai-sdk/google";
import { createGoogleGenerativeAI } from "@ai-sdk/google";
import type { GroqProvider } from "@ai-sdk/groq";
import { createGroq } from "@ai-sdk/groq";
import type { OpenAIProvider, OpenAIResponsesProviderOptions } from "@ai-sdk/openai";
import { createOpenAI } from "@ai-sdk/openai";
import type { PerplexityProvider } from "@ai-sdk/perplexity";
import { createPerplexity } from "@ai-sdk/perplexity";
import type { LanguageModelV3 } from "@ai-sdk/provider";
import { createOpenRouter } from "@openrouter/ai-sdk-provider";
import { z } from "zod";

// ============================================================================
// Types
// ============================================================================

/**
 * AI provider context for local (single-user) Fastify backend.
 * No Cloudflare, PostHog, or multi-tenancy dependencies.
 */
export type LocalAiCtx = {
  openai: OpenAIProvider;
  anthropic: AnthropicProvider;
  groq: GroqProvider;
  perplexity: PerplexityProvider;
  openrouter: OpenRouterProvider;
  google: GoogleGenerativeAIProvider;
};

/**
 * Simplified context for Fastify backend.
 * Single-user, local SQLite database, no cloud dependencies.
 * Use `request.ctx` from ctxPlugin for AI and database access in routes.
 */
export type LocalCtx = {
  ai: LocalAiCtx;
};

// ============================================================================
// Providers
// ============================================================================

const PROVIDERS = {
  anthropic: (ctx: LocalCtx) => ctx.ai.anthropic,
  openai: (ctx: LocalCtx) => ctx.ai.openai.responses,
  groq: (ctx: LocalCtx) => ctx.ai.groq,
  perplexity: (ctx: LocalCtx) => ctx.ai.perplexity,
  openrouter: (ctx: LocalCtx) => (modelId: string) => ctx.ai.openrouter.chat(modelId),
  google: (ctx: LocalCtx) => ctx.ai.google,
};

export type SupportedProvider = keyof typeof PROVIDERS;

const SUPPORTED_PROVIDERS = Object.keys(PROVIDERS) as SupportedProvider[];

// ============================================================================
// Model Schema (Zod)
// ============================================================================

/**
 * Schema for supported models - All providers included.
 */
export const supportedModelSchema = z.union([
  // anthropic
  z.literal("anthropic/claude-4-sonnet-20250514"),
  z.literal("anthropic/claude-opus-4-1"), // smartest model
  z.literal("anthropic/claude-opus-4-0"),
  z.literal("anthropic/claude-sonnet-4-0"),
  z.literal("anthropic/claude-3-7-sonnet-latest"),
  z.literal("anthropic/claude-3-5-haiku-latest"), // fastest model

  // openai
  z.literal("openai/gpt-4.1"),
  z.literal("openai/gpt-4.1-mini"),
  z.literal("openai/gpt-4.1-nano"),
  z.literal("openai/gpt-4o"),
  z.literal("openai/gpt-4o-mini"),
  z.literal("openai/o3"),
  z.literal("openai/o4-mini"),
  z.literal("openai/gpt-5"),
  z.literal("openai/gpt-5-mini"),
  z.literal("openai/gpt-5-nano"),
  z.literal("openai/gpt-5-chat-latest"),

  // groq
  z.literal("groq/meta-llama/llama-4-scout-17b-16e-instruct"),
  z.literal("groq/meta-llama/llama-4-maverick-17b-128e-instruct"),
  z.literal("groq/moonshotai/kimi-k2-instruct"),
  z.literal("groq/openai/gpt-oss-120b"),
  z.literal("groq/openai/gpt-oss-20b"),

  // perplexity
  z.literal("perplexity/sonar"),
  z.literal("perplexity/sonar-pro"),

  // openrouter
  z.literal("openrouter/qwen3-coder:free"),
  z.literal("openrouter/deepseek-v3:free"),

  // google - https://ai.google.dev/gemini-api/docs/models
  z.literal("google/gemini-2.5-pro"), // smartest model
  z.literal("google/gemini-2.5-flash"),
  z.literal("google/gemini-2.5-flash-lite"),
  z.literal("google/gemini-2.0-flash"),
  z.literal("google/gemini-2.0-flash-lite"), // fastest model
]);

const SUPPORTED_MODELS = supportedModelSchema.options.map((schema) => schema.value);

export type SupportedModel = z.infer<typeof supportedModelSchema>;

// ============================================================================
// Model Utilities
// ============================================================================

/**
 * Type guard to check if a string is a supported model.
 */
export function isModelSupported(model: string): model is SupportedModel {
  return (SUPPORTED_MODELS as string[]).includes(model);
}

/**
 * Parse a model slug into provider and model ID.
 * @example parseModelSlug("openai/gpt-4.1") => { provider: "openai", modelId: "gpt-4.1" }
 */
export function parseModelSlug(slug: SupportedModel): {
  provider: SupportedProvider;
  modelId: string;
} {
  const parts = slug.split("/");

  const provider = parts[0] as SupportedProvider;
  const modelId = parts.slice(1).join("/");

  if (!SUPPORTED_PROVIDERS.includes(provider)) {
    throw new Error(`provider ${provider} not supported`);
  }

  return { provider, modelId };
}

/**
 * Get a language model instance for the given model slug.
 * No PostHog tracing - direct model access for local usage.
 * In routes, use `request.ctx.ai` from ctxPlugin to get provider instances.
 */
export function getModel(ctx: LocalCtx, modelSlug: SupportedModel, _tag?: string): LanguageModelV3 {
  const { provider, modelId } = parseModelSlug(modelSlug);
  return PROVIDERS[provider](ctx)(modelId);
}

// ============================================================================
// GPT-5 Options Configuration
// ============================================================================

const GPT5_MODELS: SupportedModel[] = ["openai/gpt-5", "openai/gpt-5-mini", "openai/gpt-5-nano"];

const GPT5_OPTIONS = {
  live_insights: {
    textVerbosity: "low",
    reasoningEffort: "minimal",
  },
  live_suggestions: {
    textVerbosity: "low",
    reasoningEffort: "minimal",
  },
  trigger_ai_non_reasoning: {
    textVerbosity: "low",
    reasoningEffort: "minimal",
  },
  trigger_ai_reasoning: {
    textVerbosity: "high",
    reasoningEffort: "low",
  },
  smart_mode_tool: {
    textVerbosity: "high",
    reasoningEffort: "minimal",
  },
  live_nerdy_suggestions: {
    textVerbosity: "low",
    reasoningEffort: "minimal",
  },
  tell_me_more: {
    textVerbosity: "medium",
    reasoningEffort: "minimal",
  },
  summarize_meetings: {
    textVerbosity: "low",
    reasoningEffort: "minimal",
  },
  session_enterprise_analytics: {
    textVerbosity: "low",
    reasoningEffort: "low",
  },
} as const satisfies Record<string, OpenAIResponsesProviderOptions>;

export type GPT5UseCase = keyof typeof GPT5_OPTIONS;

/**
 * Get provider options for a specific model and use case.
 * Returns OpenAI-specific options for GPT-5 models, empty object otherwise.
 */
export function getProviderOptions(
  model: SupportedModel,
  useCase: GPT5UseCase,
): { openai?: OpenAIResponsesProviderOptions } {
  return GPT5_MODELS.includes(model) ? { openai: GPT5_OPTIONS[useCase] } : {};
}

// ============================================================================
// API Key Configuration
// ============================================================================

/**
 * API key configuration for local storage.
 *
 * TODO: In the future, these will be stored in SQLite instead of environment variables.
 */
export type ApiKeyConfig = {
  openai?: string;
  anthropic?: string;
  groq?: string;
  perplexity?: string;
  openrouter?: string;
  google?: string;
};

/**
 * Create a LocalAiCtx from API keys.
 * This replaces the Cloudflare environment-based configuration.
 *
 * TODO: API keys will come from SQLite once implemented.
 */
export function createLocalAiCtx(apiKeys: ApiKeyConfig): LocalAiCtx {
  return {
    openai: createOpenAI({ apiKey: apiKeys.openai ?? "" }),
    anthropic: createAnthropic({ apiKey: apiKeys.anthropic ?? "" }),
    groq: createGroq({ apiKey: apiKeys.groq ?? "" }),
    perplexity: createPerplexity({ apiKey: apiKeys.perplexity ?? "" }),
    openrouter: createOpenRouter({ apiKey: apiKeys.openrouter ?? "" }),
    google: createGoogleGenerativeAI({ apiKey: apiKeys.google ?? "" }),
  };
}

/**
 * Create a complete LocalCtx from API keys.
 * Use this as the entry point for creating context in your Fastify backend.
 * For routes, use `request.ctx` from ctxPlugin which handles this automatically.
 */
export function createLocalCtx(apiKeys: ApiKeyConfig): LocalCtx {
  return {
    ai: createLocalAiCtx(apiKeys),
  };
}
