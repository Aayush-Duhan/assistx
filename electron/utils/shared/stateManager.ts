import { SharedState, keybindingsSchema, keybindingsDisabledSchema, DEFAULT_KEYBINDINGS, DEFAULT_KEYBINDINGS_DISABLED, themeSchema } from "@/shared/sharedState";
import { app } from "electron";
import { IS_INTEL_MAC } from "../constants";
import { loadJsonFile, fileExists, getAutoLaunchEnabled, setFileExists, saveJsonFile, isWindows10, loadOnboardingState } from "../utils";
import { join } from "node:path";
import { windowManager } from "../../windows/WindowManager";
import { isDev, isWindows } from "../platform";
import { DEFAULT_ONBOARDING_STATE, onboardingStateSchema } from "@/shared/onboardingState";

export const STATE_FILES = {
    invisible: join(app.getPath("userData"), "undetectability.enabled"),
    onboardingState: join(app.getPath("userData"), "onboarding.state"),
    keybindings: join(app.getPath("userData"), "keybindings"),
    keybindingsDisabled: join(app.getPath("userData"), "keybindings.disabled"),
    theme: join(app.getPath("userData"), "theme")
};

let sharedState: SharedState = {
    ...createInitialState()
};

export function getSharedState(): SharedState {
    return sharedState;
}

function createInitialState(): SharedState {
    return {
        autoLaunchEnabled: getAutoLaunchEnabled(),
        showDashboard: false,
        undetectabilityEnabled: fileExists(STATE_FILES.invisible),
        windowHidden: false,
        onboardingState: loadOnboardingState(),
        panelHidden: false,
        ignoreMouseEvents: false,
        autoUpdateState: { state: "none" },
        keybindings: loadJsonFile(STATE_FILES.keybindings, keybindingsSchema) ?? DEFAULT_KEYBINDINGS,
        keybindingsDisabled:
            loadJsonFile(STATE_FILES.keybindingsDisabled, keybindingsDisabledSchema) ??
            DEFAULT_KEYBINDINGS_DISABLED,
        recordingKeybinding: false,
        currentAudioSessionId: null,
        clientMetadata: null,
        platform: process.platform,
        appVersion: app.getVersion(),
        theme: loadJsonFile(STATE_FILES.theme, themeSchema) ?? "system",
        isIntelMac: IS_INTEL_MAC,
    };
}


export function updateSharedState(updates: Partial<SharedState>): void {
    const previousState = sharedState;
    sharedState = { ...sharedState, ...updates };

    // Notify all windows of state change
    windowManager.sendToWebContents("update-shared-state", sharedState);

    // Handle side effects for each changed property
    for (const key of Object.keys(updates) as (keyof SharedState)[]) {
        handleStateChange(key, previousState[key], sharedState[key]);
    }
}
export function handleStateChange<K extends keyof SharedState>(
    key: K,
    oldValue: SharedState[K],
    newValue: SharedState[K]
): void {
    const handlers: Partial<Record<keyof SharedState, (oldVal: unknown, newVal: unknown) => void>> = {
        autoLaunchEnabled: (_old, newVal) => {
            if (!isDev && _old !== newVal) {
                app.setLoginItemSettings({
                    openAtLogin: newVal as boolean,
                    openAsHidden: false,
                });
            }
        },

        showDashboard: (_old, newVal) => {
            windowManager.getDashboardWindow()?.setVisibility(newVal as boolean);
        },

        undetectabilityEnabled: (oldVal, newVal) => {
            if (oldVal === newVal) return;

            setFileExists(STATE_FILES.invisible, newVal as boolean);
            windowManager.handleDockIcon();
            // TODO: Uncomment this when tray is implemented
            // updateTray();
            windowManager.restoreUndetectability();

            // Windows 10 requires window recreation
            if (isWindows10()) {
                windowManager.recreateWindowsForView();
            }

            // Update client metadata for Windows
            const clientMetadata = getSharedState().clientMetadata;
            if (isWindows) {
                updateSharedState({
                    clientMetadata: { ...clientMetadata, noFocusOnShow: !(newVal as boolean) },
                });
            }
        },

        ignoreMouseEvents: (_old, newVal) => {
            windowManager.getAppWindow()?.setIgnoreMouseEvents(newVal as boolean);
        },

        keybindings: (_old, newVal) => {
            saveJsonFile(STATE_FILES.keybindings, keybindingsSchema, newVal as any);
        },

        keybindingsDisabled: (_old, newVal) => {
            saveJsonFile(STATE_FILES.keybindingsDisabled, keybindingsDisabledSchema, newVal as any);
        },

        currentAudioSessionId: () => {
            // TODO: Uncomment this when tray is implemented
            // updateTray();
        },

        theme: (_old, newVal) => {
            saveJsonFile(STATE_FILES.theme, themeSchema, newVal as any);
            windowManager.updateTheme(newVal as "light" | "dark" | "system");
        },

        onboardingState: (_old, newVal) => {
            saveJsonFile(STATE_FILES.onboardingState, onboardingStateSchema, newVal as any);
        },
    };

    handlers[key]?.(oldValue, newValue);
}

/**
 * Reset state to defaults (logout)
 */
export function resetState(options?: { resetOnboarding?: boolean }): void {
    const currentState = getSharedState();

    updateSharedState({
        ...createInitialState(),
        autoUpdateState: currentState.autoUpdateState,
        onboardingState: options?.resetOnboarding
            ? DEFAULT_ONBOARDING_STATE
            : currentState.onboardingState,
    });
}

/**
* Get current view based on state
*/
export function getCurrentView(): "app" | "onboarding" {
    const state = getSharedState();
    return state.onboardingState.completed ? "app" : "onboarding";
}