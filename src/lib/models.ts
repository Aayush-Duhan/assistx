import { openai } from "@ai-sdk/openai";
import { google } from "@ai-sdk/google";
import { anthropic } from "@ai-sdk/anthropic";
import { xai } from "@ai-sdk/xai";
import { openrouter } from "@openrouter/ai-sdk-provider";
import { LanguageModel } from "ai";
import { ChatModel } from "@/types/chat";

const staticModels: Record<string, Record<string, LanguageModel>> = {
    openai: {
        "gpt-4.1": openai("gpt-4.1"),
        "gpt-4.1-mini": openai("gpt-4.1-mini"),
        "o4-mini": openai("o4-mini"),
        "o3": openai("o3"),
        "gpt-5": openai("gpt-5"),
        "gpt-5-mini": openai("gpt-5-mini"),
        "gpt-5-nano": openai("gpt-5-nano"),
    },
    google: {
        "gemini-2.5-flash-lite": google("gemini-2.5-flash-lite"),
        "gemini-2.5-flash": google("gemini-2.5-flash"),
        "gemini-2.5-pro": google("gemini-2.5-pro"),
    },
    anthropic: {
        "claude-4-sonnet": anthropic("claude-4-sonnet-20250514"),
        "claude-4-opus": anthropic("claude-4-opus-20250514"),
        "claude-3-7-sonnet": anthropic("claude-3-7-sonnet-20250219"),
    },
    xai: {
        "grok-4": xai("grok-4"),
        "grok-3": xai("grok-3"),
        "grok-3-mini": xai("grok-3-mini"),
    },
    openRouter: {
        "gpt-oss-20b:free": openrouter("openai/gpt-oss-20b:free"),
        "qwen3-8b:free": openrouter("qwen/qwen3-8b:free"),
        "qwen3-14b:free": openrouter("qwen/qwen3-14b:free"),
        "qwen3-coder:free": openrouter("qwen/qwen3-coder:free"),
        "deepseek-r1:free": openrouter("deepseek/deepseek-r1-0528:free"),
        "deepseek-v3:free": openrouter("deepseek/deepseek-chat-v3-0324:free"),
        "gemini-2.0-flash-exp:free": openrouter("google/gemini-2.0-flash-exp:free"),
    },
};

// Fallback default model
const fallbackModel = staticModels.openai["gpt-4.1"];

export const customModelProvider = {
    modelsInfo: Object.entries(staticModels).map(([provider, models]) => ({
        provider,
        models: Object.entries(models).map(([name]) => ({
            name,
        })),
    })),
    getModel: (model?: ChatModel): LanguageModel => {
        if (!model) return fallbackModel;
        return staticModels[model.provider]?.[model.model] || fallbackModel;
    },
}