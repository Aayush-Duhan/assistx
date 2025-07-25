import { useState, useEffect } from "react";
import { send, on } from "../services/electron";

let isCommandBarVisible = false;

const visibilityListeners = new Set<() => void>();

function notifyListeners() {
    for (const listener of visibilityListeners) {
        listener();
    }
}

export function showCommandBar() {
    if (!isCommandBarVisible) {
        isCommandBarVisible = true;
        notifyListeners();
    }
}

export function hideCommandBar() {
    if (isCommandBarVisible) {
        isCommandBarVisible = false;
        notifyListeners();
    }
}

export function useIsCommandBarVisible() {
    const [isVisible, setIsVisible] = useState(() => isCommandBarVisible);

    useEffect(() => {
        const listener = () => setIsVisible(isCommandBarVisible);
        visibilityListeners.add(listener);
        return () => {
            visibilityListeners.delete(listener);
        };
    }, []);

    return isVisible;
}

export function isCommandBarCurrentlyVisible() {
    return isCommandBarVisible;
}

export function subscribeToVisibility(callback: () => void): () => void {
    visibilityListeners.add(callback);
    return () => {
        visibilityListeners.delete(callback);
    };
}

on('unhide-window', showCommandBar);

const toggleListeners = new Set<() => void>();

send('reset-global-shortcuts', null);
on('global-shortcut-triggered', ({ accelerator }) => {
    if (accelerator === 'CommandOrControl+\\') {
        isCommandBarVisible ? hideCommandBar() : showCommandBar();
    }
});

export function useVisibilitytoggle(callback: () => void) {
    useEffect(() => {
        toggleListeners.add(callback);
        return () => {
            toggleListeners.delete(callback);
        };
    }, [callback]);
}