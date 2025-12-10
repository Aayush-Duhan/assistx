import { useCallback } from "react";
import { useAiResponse } from "./useAiResponse";
import { action } from "../types";
import { useScreenEnabled } from "@/hooks/useScreenEnabled";

type SubmitInput = {
  /** If defined, assumes the input is triggered from a live insight */
  action?: action;
  manualInput: string;
  displayInput: string;
};

export function useSubmit() {
  const { triggerAi } = useAiResponse();
  const [shouldUseScreen] = useScreenEnabled();

  return useCallback(
    (input: SubmitInput) => {
      triggerAi({
        shouldCaptureScreenshot: shouldUseScreen,
        manualInput: input.manualInput.trim(),
        displayInput: input.displayInput.trim(),
        metadata: input.action ? { action: input.action } : undefined,
      });
    },
    [triggerAi, shouldUseScreen],
  );
}
