/**
 * Window utility functions for Electron IPC communication.
 * These functions handle window visibility, focus, and external URL opening.
 */
import { electron } from '@/services/electron';
// Type definitions
export interface WindowUtilities {
    toggleWindowVisibility: (forceVisible?: boolean) => void;
    openExternalUrl: (url: string) => void;
    focusWindow: () => void;
    hideWindow: () => void;
}

/**
 * Toggles the visibility of the main application window.
 * It sends an IPC message to the main process, which is responsible
 * for showing or hiding the BrowserWindow.
 *
 * @param forceVisible - If true, ensures the window is shown and focused.
 *                       If false or undefined, it toggles the current state.
 */
export function toggleWindowVisibility(forceVisible?: boolean): void {
    if (typeof window === 'undefined' || !window.electron.ipcRenderer) {
        console.warn('IPC renderer not available');
        return;
    }

    if (forceVisible) {
        // This event tells the main process to ensure the window is visible and focused.
        electron.focusWindow();
    } else {
        // This event tells the main process to toggle the window's visibility.
        // The original de-obfuscated code used a global variable for this, but an
        // IPC call is a more robust pattern for an Electron app.
        electron.toggleVisibility();
    }
}

/**
 * Forces the window to be visible and focused.
 * This is a convenience function that calls toggleWindowVisibility with forceVisible=true.
 */
export function focusWindow(): void {
    toggleWindowVisibility(true);
}

/**
 * Hides the application window.
 * Sends an IPC message to the main process to hide the window.
 */
export function hideWindow(): void {
    electron.hideWindow();
}

/**
 * A simple utility to open a URL in the user's default external browser.
 *
 * @param url - The URL to open. Should be a valid HTTP/HTTPS URL.
 */
export function openExternalUrl(url: string): void {
    // Validate URL format
    try {
        new URL(url);
    } catch (error) {
        console.error('Invalid URL provided to openExternalUrl:', url);
        return;
    }

    // This sends the URL to the main process, which can safely open it
    // using Electron's `shell.openExternal()` method.
    electron.openExternalUrl(url);
}

/**
 * Utility object containing all window functions for easy import.
 * This provides a convenient way to import all window utilities at once.
 */
export const WindowUtils: WindowUtilities = {
    toggleWindowVisibility,
    openExternalUrl,
    focusWindow,
    hideWindow,
} as const;

/**
 * Type guard to check if we're running in an Electron renderer process.
 * @returns true if running in Electron renderer, false otherwise
 */
export function isElectronRenderer(): boolean {
    return typeof window !== 'undefined' && 
           typeof window.electron.ipcRenderer !== 'undefined';
}

/**
 * Safe wrapper for IPC operations that checks for Electron availability.
 * @param operation - The IPC operation to perform
 * @param fallback - Optional fallback function to call if IPC is not available
 */
export function safeIpcOperation(
    operation: () => void, 
    fallback?: () => void
): void {
    if (isElectronRenderer()) {
        operation();
    } else {
        console.warn('IPC operation attempted outside Electron renderer process');
        fallback?.();
    }
} 