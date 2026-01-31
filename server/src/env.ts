/**
 * @file env.ts
 * Environment variable utilities for the server.
 * All API keys and sensitive configuration should be managed here.
 *
 * TODO: In the future, API keys may be stored in SQLite instead of environment variables.
 */

import { logger } from "./lib/pino/logger";

/**
 * Get environment variable value from process.env
 * @param key - The environment variable key
 * @returns The value or undefined if not set
 */
export function getEnvVar(key: string): string | undefined {
  return process.env[key];
}

/**
 * Get environment variable value, throwing if not set
 * @param key - The environment variable key
 * @returns The value
 * @throws Error if the environment variable is not set
 */
export function getRequiredEnvVar(key: string): string {
  const value = process.env[key];
  if (!value) {
    throw new Error(`Required environment variable ${key} is not set`);
  }
  return value;
}

// ============================================================================
// AI Provider API Keys
// ============================================================================

/**
 * Get OpenAI API key from environment
 */
export function getOpenAIApiKey(): string | undefined {
  return getEnvVar("OPENAI_API_KEY");
}

/**
 * Get Anthropic API key from environment
 */
export function getAnthropicApiKey(): string | undefined {
  return getEnvVar("ANTHROPIC_API_KEY");
}

/**
 * Get Google AI API key from environment
 */
export function getGoogleAIApiKey(): string | undefined {
  return getEnvVar("GOOGLE_GENERATIVE_AI_API_KEY");
}

/**
 * Get Groq API key from environment
 */
export function getGroqApiKey(): string | undefined {
  return getEnvVar("GROQ_API_KEY");
}

/**
 * Get Perplexity API key from environment
 */
export function getPerplexityApiKey(): string | undefined {
  return getEnvVar("PERPLEXITY_API_KEY");
}

/**
 * Get OpenRouter API key from environment
 */
export function getOpenRouterApiKey(): string | undefined {
  return getEnvVar("OPENROUTER_API_KEY");
}

// ============================================================================
// Other Service API Keys
// ============================================================================

/**
 * Get Deepgram API key from environment
 */
export function getDeepgramApiKey(): string | undefined {
  return getEnvVar("DEEPGRAM_API_KEY");
}

/**
 * Get Deepgram API key, throwing if not set
 */
export function getRequiredDeepgramApiKey(): string {
  return getRequiredEnvVar("DEEPGRAM_API_KEY");
}

// ============================================================================
// Environment Configuration
// ============================================================================

/**
 * Environment configuration interface
 *
 * TODO: In the future, these may come from SQLite instead of environment variables.
 */
export interface EnvConfig {
  // AI Providers
  openaiApiKey?: string;
  anthropicApiKey?: string;
  googleAIApiKey?: string;
  groqApiKey?: string;
  perplexityApiKey?: string;
  openrouterApiKey?: string;
  // Other Services
  deepgramApiKey?: string;
}

/**
 * Get all environment configuration
 * Useful for validating configuration on startup
 */
export function getEnvConfig(): EnvConfig {
  return {
    openaiApiKey: getOpenAIApiKey(),
    anthropicApiKey: getAnthropicApiKey(),
    googleAIApiKey: getGoogleAIApiKey(),
    groqApiKey: getGroqApiKey(),
    perplexityApiKey: getPerplexityApiKey(),
    openrouterApiKey: getOpenRouterApiKey(),
    deepgramApiKey: getDeepgramApiKey(),
  };
}

/**
 * Get API key configuration for AI models.
 * Use this to create LocalAiCtx from environment variables.
 */
export function getApiKeyConfig() {
  return {
    openai: getOpenAIApiKey(),
    anthropic: getAnthropicApiKey(),
    google: getGoogleAIApiKey(),
    groq: getGroqApiKey(),
    perplexity: getPerplexityApiKey(),
    openrouter: getOpenRouterApiKey(),
  };
}

/**
 * Validate that all required environment variables are set
 * @throws Error if any required variable is missing
 */
export function validateEnvConfig(): void {
  const config = getEnvConfig();
  const missing: string[] = [];

  // Only Deepgram is required for basic functionality
  if (!config.deepgramApiKey) {
    missing.push("DEEPGRAM_API_KEY");
  }

  // AI providers are optional - warn but don't fail
  const aiProviders = {
    OPENAI_API_KEY: config.openaiApiKey,
    ANTHROPIC_API_KEY: config.anthropicApiKey,
    GOOGLE_GENERATIVE_AI_API_KEY: config.googleAIApiKey,
    GROQ_API_KEY: config.groqApiKey,
    PERPLEXITY_API_KEY: config.perplexityApiKey,
    OPENROUTER_API_KEY: config.openrouterApiKey,
  };

  const missingAiProviders = Object.entries(aiProviders)
    .filter(([_, value]) => !value)
    .map(([key]) => key);

  if (missing.length > 0) {
    logger.warn("env.validation", `Missing required environment variables: ${missing.join(", ")}`, {
      missing,
    });
  }

  if (missingAiProviders.length > 0) {
    logger.info(
      "env.validation",
      `Optional AI provider keys not configured: ${missingAiProviders.join(", ")}`,
      { missingProviders: missingAiProviders },
    );
  }
}
