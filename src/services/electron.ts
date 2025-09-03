import { Display } from "../types";

type IpcChannels = {
    'reset-global-shortcuts': [null, void];
    'global-shortcut-triggered': [string, void];
    'register-global-shortcut': [{ accelerator: string }, void];
    'unregister-global-shortcut': [{ accelerator: string }, void];
    'set-ignore-mouse-events': [{ ignore: boolean }, void];
    'unhide-window': [null, void];
    'focus-window': [null, void];
    'toggle-visibility': [null, void];
    'unfocus-window': [null, void];
    'window-shown': [null, void];
    'window-hidden': [null, void];
    'check-for-update': [null, void];
    'install-update': [null, void];
    'updater-state': [{ state: 'available' | 'downloaded' | 'error' }, void];
    'quit-app': [null, void];
    'finish-onboarding': [null, void];
    'reset-onboarding': [null, void];
    'enable-dev-shortcuts': [null, void];
    'mac-set-mic-monitor-enabled': [{ enabled: boolean }, void];
    'mac-set-native-recorder-enabled': [{ enabled: boolean }, void];
    'mac-native-recorder-data': [{ source: 'mic' | 'system'; base64Data: string }, void];
    'mic-used': [{ app: string }, void];
    'mic-off': [{ app: string }, void];
    'available-displays': [{ displays: Display[] }, void];
    'get-available-displays': [null, void];
    'show-display-overlays': [null, void];
    'hide-display-overlays': [null, void];
    'move-window-to-display': [{ displayId: number }, void];
    'highlight-display': [{ displayId: number }, void];
    'unhighlight-display': [{ displayId: number }, void];
    'display-changed': [null, void];
    'get-invisible': [null, void];
    'invisible-changed': [{ invisible: boolean }, void];
    'toggle-invisible': [null, void];
    'resize-window': [{ width: number; height: number; duration: number }, void];
    'mac-open-system-settings': [{ section: string }, void];

    // Invoke channels (request/response)
    'capture-screenshot': [null, { contentType: string; data: Buffer }];
    'request-has-onboarded': [null, { hasOnboarded: boolean }];
    'request-media-permission': ['microphone' | 'screen', boolean];
    'mac-check-macos-version': [null, { isSupported: boolean }];
    'open-external-url': [{ url: string }, void];
    'request-window-visibility': [null, { visible: boolean }];
    'restart-window': [null, void];
}

type Channel = keyof IpcChannels;
type Payload<C extends Channel> = IpcChannels[C][0];
type Response<C extends Channel> = IpcChannels[C][1];


export function send<C extends Channel>(channel: C, payload: Payload<C>): void {
    window.electron.ipcRenderer.send(channel, payload);
}

export function on<C extends Channel>(
    channel: C,
    callback: (payload: Payload<C>) => void
): void {
    window.electron.ipcRenderer.on(channel, (_event, payload) => callback(payload));
}

export async function invoke<C extends Channel>(
    channel: C,
    payload: Payload<C>
): Promise<Response<C>> {
    return window.electron.ipcRenderer.invoke(channel, payload);
}    

export function off<C extends Channel>(
    channel: C,
    callback: (payload: Payload<C>) => void
): void {
    window.electron.ipcRenderer.removeListener(channel as string, callback as any);
}