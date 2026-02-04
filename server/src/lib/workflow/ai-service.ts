/**
 * Workflow AI Service
 * Provides AI capabilities for workflow node execution
 *
 * Integrates with the existing aimodels infrastructure to provide
 * text generation for LLM nodes and tool calling for Tool nodes.
 */

import { generateText, type ModelMessage } from "ai";
import { logger } from "../pino/logger";
import { getApiKeyForProvider } from "../../db";
import {
  createLocalCtx,
  getModel,
  isModelSupported,
  type LocalCtx,
  type SupportedModel,
  type ApiKeyConfig,
} from "../aimodels/models";

/**
 * Create LocalCtx from database API keys
 */
function createContextFromDB(): LocalCtx {
  const apiKeys: ApiKeyConfig = {
    openai: getApiKeyForProvider("openai") ?? undefined,
    anthropic: getApiKeyForProvider("anthropic") ?? undefined,
    groq: getApiKeyForProvider("groq") ?? undefined,
    perplexity: getApiKeyForProvider("perplexity") ?? undefined,
    openrouter: getApiKeyForProvider("openrouter") ?? undefined,
    google: getApiKeyForProvider("google") ?? undefined,
  };

  return createLocalCtx(apiKeys);
}

/**
 * Message format for LLM node
 */
export interface LLMMessage {
  role: "user" | "assistant" | "system";
  content: string;
}

/**
 * LLM generation options
 */
export interface LLMGenerationOptions {
  model: {
    provider: string;
    modelId: string;
  };
  messages: LLMMessage[];
  temperature?: number;
}

/**
 * LLM generation result
 */
export interface LLMGenerationResult {
  success: boolean;
  response?: string;
  error?: string;
  usage?: {
    inputTokens: number;
    outputTokens: number;
    totalTokens: number;
  };
}

/**
 * Generate text using LLM
 *
 * @param options - LLM generation options
 * @returns Generation result with response or error
 */
export async function generateLLMResponse(
  options: LLMGenerationOptions,
): Promise<LLMGenerationResult> {
  const { model, messages, temperature } = options;

  // Construct model slug
  const modelSlug = `${model.provider}/${model.modelId}`;

  // Validate model
  if (!isModelSupported(modelSlug)) {
    logger.warn("workflow.llm.unsupported", "Unsupported model, falling back", {
      modelSlug,
    });
    // Fall back to a common model
    return generateLLMResponse({
      ...options,
      model: { provider: "openai", modelId: "gpt-4o-mini" },
    });
  }

  try {
    // Create context from database API keys
    const ctx = createContextFromDB();

    // Get the language model
    const languageModel = getModel(ctx, modelSlug as SupportedModel, "workflow-llm");

    // Convert messages to ModelMessage format
    const modelMessages: ModelMessage[] = messages.map((msg) => ({
      role: msg.role,
      content: msg.content,
    }));

    // Generate text
    const result = await generateText({
      model: languageModel,
      messages: modelMessages,
      temperature: temperature ?? 0.7,
    });

    logger.info("workflow.llm.success", "LLM generation completed", {
      modelSlug,
      inputTokens: result.usage?.inputTokens,
      outputTokens: result.usage?.outputTokens,
    });

    return {
      success: true,
      response: result.text,
      usage: result.usage
        ? {
            inputTokens: result.usage.inputTokens ?? 0,
            outputTokens: result.usage.outputTokens ?? 0,
            totalTokens: (result.usage.inputTokens ?? 0) + (result.usage.outputTokens ?? 0),
          }
        : undefined,
    };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);

    logger.error(
      error instanceof Error ? error : new Error(errorMessage),
      "workflow.llm.error",
      "LLM generation failed",
      { modelSlug },
    );

    return {
      success: false,
      error: errorMessage,
    };
  }
}

/**
 * Check if a model is available (has API key configured)
 */
export function isModelAvailable(provider: string): boolean {
  const apiKey = getApiKeyForProvider(provider);
  return apiKey !== null && apiKey.length > 0;
}

/**
 * Get list of available providers based on configured API keys
 */
export function getAvailableProviders(): string[] {
  const providers = ["openai", "anthropic", "groq", "perplexity", "google"];
  return providers.filter((p) => isModelAvailable(p));
}
