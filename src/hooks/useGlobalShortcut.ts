import { useSharedState } from "@/shared/shared";
import { useEffect } from "react";
import { useEventCallback } from "usehooks-ts";
import { registerGlobalShortcut, unregisterGlobalShortcut } from "@/lib/globalShortcut";

/** Defaults to enable = "onlyWhenVisible", unless specified. */
export function useGlobalShortcut(
  accelerator?: string,
  callback?: () => void,
  options?: { enable?: boolean | "onlyWhenVisible" },
) {
  const enable = options?.enable ?? "onlyWhenVisible";

  const stableCallback = useEventCallback(() => {
    callback?.();
  });

  const { windowHidden, recordingKeybinding } = useSharedState();

  const resolvedEnable = recordingKeybinding
    ? false
    : enable === "onlyWhenVisible"
      ? !windowHidden
      : enable;

  const hasCallback = !!callback;

  useEffect(() => {
    if (resolvedEnable && accelerator && stableCallback && hasCallback) {
      // delay the registration by a tick to ensure rapid state changes get
      // batched together
      const timeout = setTimeout(() => {
        registerGlobalShortcut(accelerator, stableCallback);
      }, 0);

      return () => {
        clearTimeout(timeout);
        // no-ops if stableCallback is not registered
        unregisterGlobalShortcut(accelerator, stableCallback);
      };
    }
  }, [accelerator, stableCallback, hasCallback, resolvedEnable]);
}
