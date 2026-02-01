import { useState, useCallback } from "react";

/**
 * Hook to copy text to clipboard with visual feedback
 */
export function useCopy(duration = 2000) {
  const [copied, setCopied] = useState(false);

  const copy = useCallback(
    async (text: string) => {
      try {
        await navigator.clipboard.writeText(text);
        setCopied(true);
        setTimeout(() => setCopied(false), duration);
      } catch (err) {
        console.error("Failed to copy:", err);
      }
    },
    [duration],
  );

  return { copied, copy };
}
