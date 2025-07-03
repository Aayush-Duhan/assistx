import { google } from '@ai-sdk/google';
import { streamText } from 'ai';
import { AI_SCREENSHOT_SYSTEM_PROMPT, replaceContextPlaceholder } from '../utils/prompts';
import { userContextStore } from '../stores/userContextStore';
import { settingsStore, AIProviderKey } from '../stores/settingsStore';
import { getEnvVar } from '../utils/env';

export interface AiStreamOptions {
    messages: any[];
    abortSignal?: AbortSignal;
}

// Legacy interface for backwards compatibility
export interface AiStreamOptionsLegacy {
    userMessage: string;
    screenshot?: {
        contentType: string;
        url: string;
    };
    abortSignal?: AbortSignal;
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
    }>;
}

/**
 * Service for handling AI API calls using Vercel AI SDK with Google Gemini
 */
export class AiApiService {
    private providerConfigs: Record<AIProviderKey, { apiKey: string; envKey: string }>;

    constructor() {
        const apiKey = getEnvVar('GOOGLE_GENERATIVE_AI_API_KEY');
        
        this.providerConfigs = {
            google: {
                apiKey: apiKey || '',
                envKey: 'GOOGLE_GENERATIVE_AI_API_KEY',
            },
        };
    }

    /**
     * Get the appropriate provider instance based on the selected provider
     */
    private getProviderInstance(provider: AIProviderKey, model: string) {
        switch (provider) {
            case 'google':
                return google(model);
            default:
                throw new Error(`Unsupported provider: ${provider}`);
        }
    }

    /**
     * Stream AI response using full message array (new method)
     */
    async streamResponse(options: AiStreamOptions): Promise<AiStreamResult> {
        const { messages, abortSignal } = options;

        try {
            // Get the provider instance based on current settings
            const modelInstance = this.getProviderInstance(
                settingsStore.selectedProvider,
                settingsStore.selectedModel
            );

            const result = streamText({
                model: modelInstance,
                messages,
                maxTokens: 4000,
                temperature: 0.1, // Lower temperature for more focused responses
                abortSignal,
            });

            return {
                textStream: result.textStream,
                finishPromise: (async () => {
                    try {
                        const finalResult = await result;
                        return {
                            text: await finalResult.text,
                            finishReason: await finalResult.finishReason,
                            usage: await finalResult.usage,
                        };
                    } catch (finishError) {
                        console.error('Error in finishPromise:', finishError);
                        throw finishError;
                    }
                })()
            };
        } catch (error) {
            console.error('AI API Error:', error);
            throw new Error(`AI service error: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
    }

    /**
     * Stream AI response using legacy interface (for backwards compatibility)
     */
    async streamResponseLegacy(options: AiStreamOptionsLegacy): Promise<AiStreamResult> {
        const { userMessage, screenshot, abortSignal } = options;

        // Get user context and inject it into the system prompt
        const userContext = userContextStore.getUserContext() || "No additional context provided.";
        const finalSystemPrompt = replaceContextPlaceholder(AI_SCREENSHOT_SYSTEM_PROMPT, userContext);
        
        // Prepare messages
        const messages: any[] = [
            {
                role: 'system',
                content: finalSystemPrompt,
            },
            {
                role: 'user',
                content: userMessage,
                ...(screenshot && {
                    experimental_attachments: [{
                        name: 'screenshot.webp',
                        contentType: screenshot.contentType,
                        url: screenshot.url,
                    }]
                })
            }
        ];

        return this.streamResponse({ messages, abortSignal });
    }

    /**
     * Check if the AI service is properly configured for the current provider
     */
    isConfigured(): boolean {
        const currentProvider = settingsStore.selectedProvider;
        const config = this.providerConfigs[currentProvider];
        
        if (!config.apiKey) {
            console.warn(`${config.envKey} not found in environment variables. AI features will not work for ${currentProvider}.`);
            return false;
        }
        
        return true;
    }

    /**
     * Get configuration status for all providers
     */
    getProviderConfigStatus(): Record<AIProviderKey, boolean> {
        return Object.fromEntries(
            Object.entries(this.providerConfigs).map(([provider, config]) => [
                provider,
                !!config.apiKey
            ])
        ) as Record<AIProviderKey, boolean>;
    }
}

// Create and export singleton instance
export const aiApiService = new AiApiService(); 