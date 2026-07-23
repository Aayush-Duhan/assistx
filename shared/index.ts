// Constants
export { IS_MAC, IS_WINDOWS, IS_DEV, APP_NAME, APP_VERSION } from "./constants";

// Electron types
export type { ElectronAPI } from "./electron";

// IPC utilities
export { sendToIpcMain, addIpcRendererHandler, invokeIpcMain } from "./ipc";

// IPC events and types
export { ipcToMainEvents, ipcInvokeEvents } from "./ipcEvents";
export type { IpcToRendererEvents } from "./ipcEvents";

// Onboarding state
export {
  onboardingModeSchema,
  onboardingStateSchema,
  DEFAULT_ONBOARDING_STATE,
} from "./onboardingState";
export type { OnboardingMode } from "./onboardingState";

// Shared state
export {
  clientMetadataSchema,
  keybindingsSchema,
  keybindingsDisabledSchema,
  DEFAULT_KEYBINDINGS,
  DEFAULT_KEYBINDINGS_DISABLED,
  themeSchema,
  sharedStateSchema,
} from "./sharedState";
export type { ClientMetadata, Keybindings, KeybindingsDisabled, SharedState } from "./sharedState";

// Update status (main-owned, not SharedState)
export { updateStatusSchema, versionInfoSchema, compareVersions } from "./updateStatus";
export type { UpdateStatus, VersionInfo } from "./updateStatus";

// Shared React components and hooks
export { SharedStateProvider, useSharedState, updateState } from "./shared";

// Zustand shared state store
export { useSharedStateStore, sharedStateStore } from "../src/stores/sharedStateStore";

export { useIpcRendererHandler } from "./useIpcRendererHandler";
