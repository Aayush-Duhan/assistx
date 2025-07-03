/**
 * Represents a single display connected to the system.
 */
export interface Display {
    id: number;
    label: string;
    bounds: { x: number; y: number; width: number; height: number };
    scaleFactor: number;
    primary: boolean;
    current: boolean; // Custom flag to indicate if it's the window's current display
}

/**
 * Represents the data for an application that is using the microphone.
 */
export interface MicUsedData {
    app: string; // e.g., "Google Chrome"
}

/**
 * A singleton service to manage the state of available displays.
 * It subscribes to updates from the main process and notifies its own listeners.
 */
class DisplayService {
    private displays: Display[] = [];
    private listeners = new Set<(displays: Display[]) => void>();
    private isInitialized = false;

    constructor() {
        this.initialize();
    }

    private initialize() {
        if (this.isInitialized || typeof window.electron === 'undefined') return;
        this.isInitialized = true;

        // Listen for display updates from the main process
        window.electron.ipcRenderer.on('available-displays', (_, { displays }) => {
            this.displays = displays;
            for (const listener of this.listeners) {
                listener(this.displays);
            }
        });

        // Initial fetch
        window.electron.ipcRenderer.send('get-available-displays');
    }

    getDisplays(): Display[] {
        return this.displays;
    }

    subscribe(callback: (displays: Display[]) => void): () => void {
        this.listeners.add(callback);
        // Immediately call back with current data if available
        if (this.displays.length > 0) {
            callback(this.displays);
        }
        return () => this.listeners.delete(callback);
    }

    refresh() {
        window.electron.ipcRenderer.send('get-available-displays');
    }
}

const displayService = new DisplayService();

export const electron = {
    // --- Platform ---
    getPlatform: () => window.electron.ipcRenderer.invoke('get-platform'),

    // --- Window Management ---
    resizeWindow: (args: { width: number; height: number; duration?: number }) =>
        window.electron.ipcRenderer.send('resize-window', args),
    moveWindowToDisplay: (args: { displayId: number }) =>
        window.electron.ipcRenderer.send('move-window-to-display', args),
    focusWindow: () => window.electron.ipcRenderer.send('focus-window'),
    unfocusWindow: () => window.electron.ipcRenderer.send('unfocus-window'),
    quitApp: () => window.electron.ipcRenderer.send('quit-app'),
    setIgnoreMouseEvents: (args: { ignore: boolean }) =>
        window.electron.ipcRenderer.send('set-ignore-mouse-events', args),
    toggleVisibility: () => window.electron.ipcRenderer.send('toggle-visibility'),
    getVisibility: () => window.electron.ipcRenderer.invoke('get-visibility'),
    hideWindow: () => window.electron.ipcRenderer.send('hide-window'),
    openExternalUrl: (url: string) => window.electron.ipcRenderer.send('open-external-url', url),

    // --- Display Management & Overlays ---
    showDisplayOverlays: () => window.electron.ipcRenderer.send('show-display-overlays'),
    hideDisplayOverlays: () => window.electron.ipcRenderer.send('hide-display-overlays'),
    highlightDisplay: (args: { displayId: number }) =>
        window.electron.ipcRenderer.send('highlight-display', args),
    unhighlightDisplay: (args: { displayId: number }) =>
        window.electron.ipcRenderer.send('unhighlight-display', args),
    subscribeToDisplays: (callback: (displays: Display[]) => void) =>
        displayService.subscribe(callback),
    getDisplays: () => displayService.getDisplays(),

    // --- Permissions ---
    requestMediaPermission: (mediaType: 'microphone' | 'screen'): Promise<boolean> =>
        window.electron.ipcRenderer.invoke('request-media-permission', mediaType),
    checkMacosVersion: (): Promise<{ isSupported: boolean }> =>
        window.electron.ipcRenderer.invoke('mac-check-macos-version'),

    // --- Global Shortcuts ---
    registerGlobalShortcut: (args: { accelerator: string }) =>
        window.electron.ipcRenderer.send('register-global-shortcut', args),
    unregisterGlobalShortcut: (args: { accelerator: string }) =>
        window.electron.ipcRenderer.send('unregister-global-shortcut', args),
    resetGlobalShortcuts: () => window.electron.ipcRenderer.send('reset-global-shortcuts'),

    // --- Updates ---
    checkForUpdate: () => window.electron.ipcRenderer.send('check-for-update'),
    installUpdate: () => window.electron.ipcRenderer.send('install-update'),

    // --- Onboarding & Auth ---
    openProductionWebUrl: (args: { path: string }) =>
        window.electron.ipcRenderer.send('open-production-web-url', args),
    requestHasOnboarded: (): Promise<{ hasOnboarded: boolean }> =>
        window.electron.ipcRenderer.invoke('request-has-onboarded'),
    setHasOnboardedTrue: () => window.electron.ipcRenderer.send('set-has-onboarded-true'),

    // --- Native macOS Recorder ---
    setNativeMacRecorderEnabled: (args: { enabled: boolean; useV2?: boolean }) =>
        window.electron.ipcRenderer.send('mac-set-native-recorder-enabled', args),
    subscribeToNativeMacRecorderData: (
        callback: (data: { source: 'mic' | 'system'; base64Data: string }) => void
    ) => {
        const handler = (_: any, data: { source: 'mic' | 'system'; base64Data: string }) => callback(data);
        window.electron.ipcRenderer.on('mac-native-recorder-data', handler);
        return () => window.electron.ipcRenderer.removeListener('mac-native-recorder-data', handler);
    },

    // --- Microphone Monitoring (macOS) ---
    setMicMonitorEnabled: (args: { enabled: boolean }) =>
        window.electron.ipcRenderer.send('mac-set-mic-monitor-enabled', args),
    subscribeToMicUsed: (callback: (data: MicUsedData) => void) => {
        const handler = (_: any, data: MicUsedData) => callback(data);
        window.electron.ipcRenderer.on('mic-used', handler);
        return () => window.electron.ipcRenderer.removeListener('mic-used', handler);
    },
    subscribeToMicOff: (callback: (data: MicUsedData) => void) => {
        const handler = (_: any, data: MicUsedData) => callback(data);
        window.electron.ipcRenderer.on('mic-off', handler);
        return () => window.electron.ipcRenderer.removeListener('mic-off', handler);
    },

    // --- Generic Event Subscription ---
    subscribe: (channel: string, callback: (data: any) => void) => {
        const handler = (_: any, data: any) => callback(data);
        window.electron.ipcRenderer.on(channel, handler);
        return () => window.electron.ipcRenderer.removeListener(channel, handler);
    },
}