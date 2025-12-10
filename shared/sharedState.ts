import z from 'zod';
import { onboardingStateSchema } from './onboardingState';

/** Just defines types. Used by ipcEvents, can't have circular imports. */

export const autoUpdateStateSchema = z.union([
    z.object({
        state: z.literal("none"),
    }),
    z.object({
        state: z.enum(["available", "downloaded"]),
        version: z.string(),
        isBelowWarningThreshold: z.boolean(),
    })
]);

export type AutoUpdateState = z.infer<typeof autoUpdateStateSchema>;

export const clientMetadataSchema = z
    .object({
        finishedDemoMeeting: z.boolean().optional(),
        dontShowCmdRNotificationAgain: z.boolean().optional(),
        dontShowAskAiNotificationAgain: z.boolean().optional(),
        dontShowHideNotificationAgain: z.boolean().optional(),
        noFocusOnShow: z.boolean().optional(),
    })
    .nullable();

export type ClientMetadata = z.infer<typeof clientMetadataSchema>;

const acceleratorSchema = z.string();

export const keybindingsSchema = z.object({
    start_over: acceleratorSchema,
    trigger_ai: acceleratorSchema,
    hide: acceleratorSchema,
    move_window_up: acceleratorSchema,
    move_window_down: acceleratorSchema,
    move_window_left: acceleratorSchema,
    move_window_right: acceleratorSchema,
    scroll_response_up: acceleratorSchema,
    scroll_response_down: acceleratorSchema
});

export const keybindingsDisabledSchema = z.object({
    start_over: z.boolean().optional(),
    trigger_ai: z.boolean().optional(),
    hide: z.boolean().optional(),
    move_window_up: z.boolean().optional(),
    move_window_down: z.boolean().optional(),
    move_window_left: z.boolean().optional(),
    move_window_right: z.boolean().optional(),
    scroll_response_up: z.boolean().optional(),
    scroll_response_down: z.boolean().optional()
});
export const DEFAULT_KEYBINDINGS = {
    start_over: "CommandOrControl+R",
    trigger_ai: "CommandOrControl+Enter",
    hide: "CommandOrControl+\\",
    move_window_up: "CommandOrControl+Up",
    move_window_down: "CommandOrControl+Down",
    move_window_left: "CommandOrControl+Left",
    move_window_right: "CommandOrControl+Right",
    scroll_response_up: "CommandOrControl+Shift+Up",
    scroll_response_down: "CommandOrControl+Shift+Down"
};

export type Keybindings = z.infer<typeof keybindingsSchema>;
export type KeybindingsDisabled = z.infer<typeof keybindingsDisabledSchema>;

export const DEFAULT_KEYBINDINGS_DISABLED: KeybindingsDisabled = {};

export const themeSchema = z.enum(["system", "light", "dark"]);

export const sharedStateSchema = z.object({
    autoLaunchEnabled: z.boolean(),
    showDashboard: z.boolean(),
    undetectabilityEnabled: z.boolean(),
    windowHidden: z.boolean(),
    panelHidden: z.boolean(),
    onboardingState: onboardingStateSchema,
    keybindings: keybindingsSchema,
    keybindingsDisabled: keybindingsDisabledSchema,
    recordingKeybinding: z.boolean(),
    ignoreMouseEvents: z.boolean(),
    autoUpdateState: autoUpdateStateSchema,
    currentAudioSessionId: z.string().nullable(),
    clientMetadata: clientMetadataSchema,
    platform: z.string(),
    appVersion: z.string(),
    theme: themeSchema,
    isIntelMac: z.boolean(),
});

export type SharedState = z.infer<typeof sharedStateSchema>;