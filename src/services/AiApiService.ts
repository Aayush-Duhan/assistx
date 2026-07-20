import { google } from "@ai-sdk/google";
import { streamText } from "ai";
// TODO: [SERVER MIGRATION] Prompts are now on server (server/src/prompts.ts)
// TODO: [SERVER MIGRATION] Env/API keys are now on server (server/src/env.ts)
// This entire service will be migrated to server. Client will call server API endpoints.
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
  private getProviderInstance(provider: string, model: string) {
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
      const selectedModel = widgetPreferencesStore.getState().selectedModel;
      const provider = selectedModel?.provider ?? "google";
      const model = selectedModel?.model ?? "gemini-2.5-flash";

      const modelInstance = this.getProviderInstance(provider, model);

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
      const err = new Error(
        `AI service error: ${error instanceof Error ? error.message : "Unknown error"}`
      );
      (err as any).cause = error;
      throw err;
    }
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

