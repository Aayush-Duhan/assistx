import { addIpcRendererHandler, sendToIpcMain } from "@/shared/ipc";

// accelerator -> callbacks
const acceleratorCallbacks = new Map<string, Set<() => void>>();

// start from clean slate on renderer load
sendToIpcMain("reset-global-shortcuts", null);

addIpcRendererHandler("global-shortcut-triggered", ({ accelerator }) => {
    const set = acceleratorCallbacks.get(accelerator);
    if (!set) return;

    for (const callback of set) {
        callback();
    }
});

/** No-op if the callback was already registered. */
export function registerGlobalShortcut(accelerator: string, callback: () => void) {
    let set = acceleratorCallbacks.get(accelerator);
    if (!set) {
        set = new Set();
        acceleratorCallbacks.set(accelerator, set);
        sendToIpcMain("register-global-shortcut", { accelerator });
    }

    set.add(callback);
}

/** No-op if the callback was not registered. */
export function unregisterGlobalShortcut(accelerator: string, callback: () => void) {
    const set = acceleratorCallbacks.get(accelerator);
    if (!set) return;

    set.delete(callback);
    if (set.size === 0) {
        acceleratorCallbacks.delete(accelerator);
        sendToIpcMain("unregister-global-shortcut", { accelerator });
    }
}
