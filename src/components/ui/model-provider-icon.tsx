import { BlendIcon } from "lucide-react";
import { ClaudeIcon } from "./claude-icon.tsx";
import { GeminiIcon } from "./gemini-icon.tsx";
import { GrokIcon } from "./grok-icon.tsx";
import { OpenAIIcon } from "./openai-icon.tsx";
import { GroqIcon } from "./groq-icon.tsx";
import { OpenRouterIcon } from "./open-router-icon.tsx";

export function ModelProviderIcon({
  provider,
  className,
}: { provider: string; className?: string }) {
  return provider === "openai" ? (
    <OpenAIIcon className={className} />
  ) : provider === "xai" ? (
    <GrokIcon className={className} />
  ) : provider === "anthropic" ? (
    <ClaudeIcon className={className} />
  ) : provider === "google" ? (
    <GeminiIcon className={className} />
  ) : provider === "groq" ? (
    <GroqIcon className={className} />
  ) : provider === "openRouter" ? (
    <OpenRouterIcon className={className} />
  ) : (
    <BlendIcon className={className} />
  );
}