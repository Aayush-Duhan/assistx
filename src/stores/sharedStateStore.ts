import { createStore, useStore } from "zustand";
import { addIpcRendererHandler, invokeIpcMain, sendToIpcMain } from "@/shared/ipc";
import type { SharedState } from "@/shared/sharedState";

interface SharedStateStoreState {
  state: SharedState | null;
}

interface SharedStateStoreActions {
  /** Apply a full snapshot from main (IPC broadcast or initial fetch) */
  applySnapshot: (snapshot: SharedState) => void;
  /** Send a partial update to main. Undefined fields are stripped. */
  update: (partial: Partial<SharedState>) => void;
}

type SharedStateStore = SharedStateStoreState & SharedStateStoreActions;

/**
 * Vanilla Zustand store — usable from both React and imperative code.
 *
 * Ownership: Electron main is the source of truth.
 * This store is a mirror that stays in sync via IPC.
 *
 * Hydration: subscribe first, then fetch initial state.
 * If a broadcast arrives before the fetch resolves, the broadcast wins
 * (it's newer). The fetch result is still applied since main state
 * is always the latest merged state.
 */
export const sharedStateStore = createStore<SharedStateStore>((set) => ({
  state: null,

  applySnapshot: (snapshot: SharedState) => {
    set({ state: snapshot });
  },

  update: (partial: Partial<SharedState>) => {
    // Strip undefined fields — main should never receive undefined
    const clean: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(partial)) {
      if (value !== undefined) {
        clean[key] = value;
      }
    }
    if (Object.keys(clean).length > 0) {
      sendToIpcMain("update-shared-state", clean as Partial<SharedState>);
    }
  },
}));

/**
 * Subscribe to IPC broadcasts and fetch initial state.
 * Call once per renderer window (in the root provider or store init).
 * Returns a dispose function.
 */
export function hydrateSharedState(): () => void {
  // Subscribe to broadcasts first (race-safe)
  const dispose = addIpcRendererHandler("update-shared-state", (newState) => {
    sharedStateStore.getState().applySnapshot(newState);
  });

  // Then fetch current state
  void invokeIpcMain("get-shared-state", null)
    .then((result) => {
      sharedStateStore.getState().applySnapshot(result);
    })
    .catch((err) => {
      console.error("[sharedStateStore] Error fetching initial state:", err);
    });

  return dispose;
}

/**
 * React hook for the shared state store.
 * Use with a selector for narrow re-renders:
 *   const theme = useSharedStateStore(s => s.state?.theme)
 */
export function useSharedStateStore<T>(selector: (state: SharedStateStore) => T): T {
  return useStore(sharedStateStore, selector);
}
