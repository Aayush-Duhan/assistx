import { google } from "@ai-sdk/google";
import { streamText } from "ai";
// TODO: [SERVER MIGRATION] Prompts are now on server (server/src/prompts.ts)
// TODO: [SERVER MIGRATION] Env/API keys are now on server (server/src/env.ts)
// This entire service will be migrated to server. Client will call server API endpoints.
import { settingsStore, AIProviderKey } from "../stores/settingsStore";

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
  private providerConfigs: Record<AIProviderKey, { apiKey: string; apiKeyVar: string }>;

  constructor() {
    // TODO: [SERVER MIGRATION] API keys are now managed on server (server/src/env.ts)
    // This service will be replaced with server API calls
    this.providerConfigs = {
      google: {
        apiKey: "", // Will be handled by server
        apiKeyVar: "GOOGLE_GENERATIVE_AI_API_KEY",
      },
    };
  }

  private getProviderInstance(provider: AIProviderKey, model: string) {
    switch (provider) {
      case "google":
        return google(model);
      default:
        throw new Error(`Unsupported provider: ${provider}`);
    }
  }

  async streamResponse(options: AiStreamOptions): Promise<AiStreamResult> {
    const { messages, systemPrompt, abortSignal } = options;

    try {
      const modelInstance = this.getProviderInstance(
        settingsStore.selectedProvider,
        settingsStore.selectedModel,
      );

      const result = streamText({
        model: modelInstance,
        messages,
        system: systemPrompt,
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
                    promptTokens: (usage as any).promptTokens ?? 0,
                    completionTokens: (usage as any).completionTokens ?? 0,
                    totalTokens:
                      (usage as any).totalTokens ??
                      ((usage as any).promptTokens ?? 0) + ((usage as any).completionTokens ?? 0),
                  }
                : undefined,
              sources: await finalResult.sources,
              // Note: groundingMetadata access needs to be updated for v5
              groundingMetadata: undefined,
            };
          } catch (finishError) {
            console.error("Error in finishPromise:", finishError);
            throw finishError;
          }
        })(),
      };
    } catch (error) {
      console.error("AI API Error:", error);
      throw new Error(
        `AI service error: ${error instanceof Error ? error.message : "Unknown error"}`,
        { cause: error },
      );
    }
  }

  /**
   * @deprecated This method will be replaced by server API calls.
   * TODO: [SERVER MIGRATION] Client will call POST /api/ai/stream with:
   *   - promptType: 'system' | 'screenshot'
   *   - userContext: string
   *   - userMessage: string
   *   - screenshot?: base64 data
   * Server will inject the prompt and handle the AI call.
   */
  async streamResponseLegacy(options: AiStreamOptionsLegacy): Promise<AiStreamResult> {
    const { userMessage, screenshot, abortSignal, useSearchGrounding = false } = options;

    // TODO: [SERVER MIGRATION] This will be replaced with a server API call
    // Server will:
    // 1. Get prompt from server/src/prompts.ts
    // 2. Replace context placeholder
    // 3. Make AI API call
    // 4. Stream response back to client
    throw new Error("streamResponseLegacy is deprecated. Migrate to server API endpoints.");

    const messages: any[] = [
      {
        role: "user",
        content: [
          { type: "text", text: userMessage },
          ...(screenshot
            ? [
                {
                  type: "image",
                  image: screenshot.url,
                },
              ]
            : []),
        ],
      },
    ];

    return this.streamResponse({ messages, abortSignal, useSearchGrounding, systemPrompt: "" });
  }

  isConfigured(): boolean {
    const currentProvider = settingsStore.selectedProvider;
    const config = this.providerConfigs[currentProvider];

    if (!config.apiKey) {
      console.warn(
        `${config.apiKeyVar} not found in environment variables. AI features will not work for ${currentProvider}.`,
      );
      return false;
    }

    return true;
  }

  getProviderConfigStatus(): Record<AIProviderKey, boolean> {
    return Object.fromEntries(
      Object.entries(this.providerConfigs).map(([provider, config]) => [provider, !!config.apiKey]),
    ) as Record<AIProviderKey, boolean>;
  }
}

export const aiApiService = new AiApiService();
