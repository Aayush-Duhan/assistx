// Constants
export { IS_MAC, IS_WINDOWS, IS_DEV, APP_NAME, APP_VERSION } from './constants';

// Electron types
export type { ElectronAPI } from './electron';

// IPC utilities
export { sendToIpcMain, addIpcRendererHandler, invokeIpcMain } from './ipc';

// IPC events and types
export { ipcToMainEvents, ipcInvokeEvents } from './ipcEvents';
export type { IpcToRendererEvents } from './ipcEvents';

// Onboarding state
export {
    onboardingModeSchema,
    onboardingStateSchema,
    DEFAULT_ONBOARDING_STATE,
} from './onboardingState';
export type { OnboardingMode } from './onboardingState';

// Shared state
export {
    autoUpdateStateSchema,
    clientMetadataSchema,
    keybindingsSchema,
    keybindingsDisabledSchema,
    DEFAULT_KEYBINDINGS,
    DEFAULT_KEYBINDINGS_DISABLED,
    themeSchema,
    sharedStateSchema,
} from './sharedState';
export type {
    AutoUpdateState,
    ClientMetadata,
    Keybindings,
    KeybindingsDisabled,
    SharedState,
} from './sharedState';

// Shared React components and hooks
export { SharedStateProvider, useSharedState, updateState } from './shared';

export { useIpcRendererHandler } from './useIpcRendererHandler';