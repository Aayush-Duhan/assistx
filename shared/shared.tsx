/** Shared state with the main process and the other renderers. */

import { type PropsWithChildren, useEffect } from "react";
import {
  sharedStateStore,
  hydrateSharedState,
  useSharedStateStore,
} from "@/stores/sharedStateStore";
import type { SharedState } from "./sharedState.ts";

/**
 * Provider that hydrates the SharedState store from Electron main.
 * Renders children only after initial state is available.
 *
 * Backward-compatible: existing consumers of useSharedState() and
 * updateState() continue to work without changes.
 */
export function SharedStateProvider({ children }: PropsWithChildren) {
  const state = useSharedStateStore((s) => s.state);

  useEffect(() => {
    const dispose = hydrateSharedState();
    return dispose;
  }, []);

  if (!state) {
    return null;
  }

  return <>{children}</>;
}

/**
 * Returns the current SharedState (non-null — only callable under SharedStateProvider).
 *
 * ponytail: Replace callers with narrow selectors (useSharedStateStore(s => s.state.field))
 * when migrating individual consumers. Drop this wrapper after all callers use selectors.
 */
export const useSharedState = (): SharedState => {
  const state = useSharedStateStore((s) => s.state);
  if (!state) {
    throw new Error("useSharedState must be used within a SharedStateProvider");
  }
  return state;
};

/**
 * Update shared state by doing a round trip through main.
 * Strips undefined fields before sending.
 */
export function updateState(update: Partial<SharedState>) {
  sharedStateStore.getState().update(update);
}
