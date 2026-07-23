import { useState, useEffect } from "react";
import { LuBlend } from "react-icons/lu";
import { ClaudeIcon } from "./claude-icon.tsx";
import { GeminiIcon } from "./gemini-icon.tsx";
import { GrokIcon } from "./grok-icon.tsx";
import { OpenAIIcon } from "./openai-icon.tsx";
import { GroqIcon } from "./groq-icon.tsx";
import { OpenRouterIcon } from "./open-router-icon.tsx";

const ICON_ALIASES: Record<string, string> = {
  "perplexity-agent": "perplexity",
  "gitlab-duo": "gitlab",
  "vercel-ai-gateway": "vercel",
  google: "gemini",
  anthropic: "anthropic",
};

export function ModelProviderIcon({
  provider,
  className,
}: {
  provider: string;
  className?: string;
}) {
  const [hasError, setHasError] = useState(false);

  useEffect(() => {
    setHasError(false);
  }, [provider]);

  if (!provider) {
    return <LuBlend className={className} />;
  }

  const normalized = provider.trim().toLowerCase();
  const aliased = ICON_ALIASES[normalized] || normalized;

  if (!hasError) {
    return (
      <img
        src={`/providers/${aliased}.png`}
        alt={provider}
        className={className}
        onError={() => setHasError(true)}
      />
    );
  }

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
  ) : provider === "openRouter" || provider === "openrouter" ? (
    <OpenRouterIcon className={className} />
  ) : (
    <LuBlend className={className} />
  );
}
