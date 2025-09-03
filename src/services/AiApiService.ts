import { google } from '@ai-sdk/google';
import { streamText } from 'ai';
import { AI_SCREENSHOT_SYSTEM_PROMPT, replaceContextPlaceholder } from '../utils/prompts';
import { userContextStore } from '../stores/userContextStore';
import { settingsStore, AIProviderKey } from '../stores/settingsStore';
import { getEnvVar } from '../utils/env';

export interface AiStreamOptions {
    messages: any[];
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

    private getProviderInstance(provider: AIProviderKey, model: string, useSearchGrounding: boolean = false) {
        switch (provider) {
            case 'google':
                return google(model, {
                    useSearchGrounding,
                });
            default:
                throw new Error(`Unsupported provider: ${provider}`);
        }
    }

    async streamResponse(options: AiStreamOptions): Promise<AiStreamResult> {
        const { messages, abortSignal, useSearchGrounding = false } = options;

        try {
            const modelInstance = this.getProviderInstance(
                settingsStore.selectedProvider,
                settingsStore.selectedModel,
                useSearchGrounding
            );

            const result = streamText({
                model: modelInstance,
                messages,
                maxTokens: 4000,
                temperature: 0.1,
                abortSignal,
            });

            return {
                textStream: result.textStream,
                finishPromise: (async () => {
                    try {
                        const finalResult = await result;
                        const providerMetadata = await finalResult.providerMetadata;
                        return {
                            text: await finalResult.text,
                            finishReason: await finalResult.finishReason,
                            usage: await finalResult.usage,
                            sources: await finalResult.sources,
                            groundingMetadata: (providerMetadata as any)?.google?.groundingMetadata,
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

    async streamResponseLegacy(options: AiStreamOptionsLegacy): Promise<AiStreamResult> {
        const { userMessage, screenshot, abortSignal, useSearchGrounding = false } = options;

        const userContext = userContextStore.getUserContext() || "No additional context provided.";
        const finalSystemPrompt = replaceContextPlaceholder(AI_SCREENSHOT_SYSTEM_PROMPT, userContext);
        
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

        return this.streamResponse({ messages, abortSignal, useSearchGrounding });
    }

    isConfigured(): boolean {
        const currentProvider = settingsStore.selectedProvider;
        const config = this.providerConfigs[currentProvider];
        
        if (!config.apiKey) {
            console.warn(`${config.envKey} not found in environment variables. AI features will not work for ${currentProvider}.`);
            return false;
        }
        
        return true;
    }

    getProviderConfigStatus(): Record<AIProviderKey, boolean> {
        return Object.fromEntries(
            Object.entries(this.providerConfigs).map(([provider, config]) => [
                provider,
                !!config.apiKey
            ])
        ) as Record<AIProviderKey, boolean>;
    }
}

export const aiApiService = new AiApiService(); 