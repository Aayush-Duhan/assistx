/** Shared state with the main process and the other renderers. */

import { createContext, type PropsWithChildren, useContext, useEffect, useState } from "react";
import { addIpcRendererHandler, invokeIpcMain, sendToIpcMain } from "./ipc.ts";
import type { SharedState } from "./sharedState.ts";

// in the future, use something like zustand for partial rerenders if it
// becomes a problem; premature optimization at this point
const Context = createContext<SharedState>(null as unknown as SharedState);

export function SharedStateProvider({ children }: PropsWithChildren) {
    console.log('[SharedStateProvider] Rendering');
    const [state, setState] = useState<SharedState | null>(null);

    useEffect(() => {
        console.log('[SharedStateProvider] useEffect running');
        // subscribe to shared state changes
        addIpcRendererHandler("update-shared-state", (newState) => {
            console.log('[SharedStateProvider] Received state update:', newState);
            setState(newState);
        });

        // grab initial state
        console.log('[SharedStateProvider] Invoking get-shared-state');
        void invokeIpcMain("get-shared-state", null)
            .then((result) => {
                console.log('[SharedStateProvider] Got initial state:', result);
                setState(result);
            })
            .catch((err) => {
                console.error('[SharedStateProvider] Error getting shared state:', err);
            });
    }, []);

    console.log('[SharedStateProvider] Current state:', state);
    if (!state) {
        console.log('[SharedStateProvider] State is null, returning null');
        return null;
    }

    console.log('[SharedStateProvider] Rendering children');
    return <Context value={state}>{children}</Context>;
}

export const useSharedState = () => useContext(Context);

// update shared state by doing a round trip through main
export function updateState(update: Partial<SharedState>) {
    sendToIpcMain("update-shared-state", update);
}
