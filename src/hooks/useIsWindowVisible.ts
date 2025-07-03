import { electron } from '@/services/electron';
// Type definitions
type VisibilityListener = () => void;

// A global state variable to track visibility across re-renders.
let isWindowVisible: boolean = true;

// A set of all active listeners for visibility changes.
const visibilityListeners = new Set<VisibilityListener>();

// Listen for the 'unhide-window' event from the main process.
// This event is likely triggered when the user uses the global shortcut to show the app.
electron.subscribe('unhide-window', () => {
        isWindowVisible = true;
        // Notify all active hooks that the state has changed.
        for (const listener of visibilityListeners) {
            listener();
        }
    });


/**
 * A utility function to toggle the window's visibility state.
 * This is called by UI elements like the "Show/Hide" shortcut.
 */
export function toggleWindowVisibility(): void {
    isWindowVisible = !isWindowVisible;
    for (const listener of visibilityListeners) {
        listener();
    }
} 
