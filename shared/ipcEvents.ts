import { Buffer } from "buffer";
import z from "zod";
import { type SharedState, sharedStateSchema } from "./sharedState";

const dialogPagesSchema = z.union([
    z.literal("/about"),
    z.literal("/changelog"),
    z.literal("/customize"),
    z.literal("/settings/general"),
    z.literal("/settings/calendar"),
    z.literal("/settings/keybinds"),
    z.literal("/settings/profile"),
    z.literal("/settings/language"),
    z.literal("/settings/billing"),
    z.literal("/settings/help-center"),
]);

const broadcastToAllWindowsPayloadSchema = z.union([
    z.object({
        command: z.literal("open-session"),
        sessionId: z.string(),
        isDemoMeeting: z.boolean(),
    }),
    z.object({
        command: z.literal("mutate-session"),
        sessionId: z.string(),
        isDemoMeeting: z.boolean(),
    }),
    z.object({
        command: z.literal("open-dashboard-page"),
        page: dialogPagesSchema,
        params: z.optional(z.record(z.string(), z.optional(z.string()))),
    }),
    z.object({
        command: z.literal("change-theme"),
        theme: z.enum(["system", "light", "dark"]),
    }),
    z.object({
        command: z.literal("start-listening"),
        meetingId: z.string().nullable(),
        attendeeEmails: z.string().array().nullable(),
    }),
    z.object({
        command: z.literal("stop-listening"),
    }),
    z.object({
        command: z.literal("resume-session"),
        sessionId: z.string(),
    }),
    z.object({
        command: z.literal("start-demo"),
    }),
    z.object({
        command: z.literal("audio-transcript"),
        source: z.enum(["mic", "system"]),
        text: z.string(),
        createdAt: z.date(),
        sessionId: z.string(),
    }),
    z.object({
        command: z.literal("refresh-trigger-ai-usage"),
    }),
    z.object({
        command: z.literal("active-mode-updated"),
        // id so the sender knows not to handle this event again
        id: z.string(),
    }),
]);

export type BroadcastToAllWindowsPayload = z.infer<typeof broadcastToAllWindowsPayloadSchema>;

export const ipcToMainEvents = {
    "clear-offline-window": z.null(),
    "update-shared-state": sharedStateSchema.partial(),
    'quit-app': z.null(),
    'relaunch-app': z.null(),
    'check-for-update': z.null(),
    'install-update': z.null(),
    'finish-onboarding': z.null(),
    'reset-onboarding': z.null(),
    'register-global-shortcut': z.object({
        accelerator: z.string(),
    }),
    'unregister-global-shortcut': z.object({
        accelerator: z.string(),
    }),
    'enable-dev-shortcuts': z.null(),
    'reset-global-shortcuts': z.null(),
    'set-ignore-mouse-events': z.object({
        ignore: z.boolean(),
    }),
    'resize-window': z.object({
        width: z.number(),
        height: z.number(),
        duration: z.number()
    }),
    'focus-window': z.null(),
    'unfocus-window': z.null(),
    // Display management events
    'get-available-displays': z.null(),
    'get-invisible': z.null(),
    'move-window-to-display': z.object({
        displayId: z.number(),
    }),
    // Dashboard Events
    'set-dashboard-visibility': z.object({ visible: z.boolean() }),
    // Mac specific events
    'mac-open-system-settings': z.object({
        section: z.enum(['privacy > microphone', 'privacy > screen-recording', 'sound > input'])
    }),
    'mac-set-native-recorder-enabled': z.object({
        enabled: z.boolean(),
    }),
    'mac-set-mic-monitor-enabled': z.object({
        enabled: z.boolean(),
    }),
    'windows-open-system-settings': z.object({
        section: z.string(),
    }),
    'toggle-invisible': z.null(),
    "broadcast-to-all-windows": broadcastToAllWindowsPayloadSchema,
}

export type IpcToRendererEvents = {
    "update-shared-state": SharedState;
    "global-shortcut-triggered": {
        accelerator: string;
    };
    "broadcast-to-all-windows": BroadcastToAllWindowsPayload;
}

export const ipcInvokeEvents = {
    'open-external-url': {
        payload: z.object({ url: z.string().url() }),
        response: z.void(),
    },
    "get-shared-state": {
        payload: z.null(),
        response: sharedStateSchema,
    },
    "check-media-permission": {
        payload: z.enum(["microphone", "screen", "accessibility"]),
        response: z.boolean(),
    },
    "request-media-permission": {
        payload: z.enum(["microphone", "camera", "screen", "accessibility"]),
        response: z.boolean(),
    },
    "capture-screenshot": {
        payload: z.null(),
        response: z.object({
            contentType: z.string(),
            data: z.instanceof(Buffer),
        }),
    },
    "is-cursor-outside-target-display": {
        payload: z.null(),
        response: z.boolean(),
    },
    "move-window-to-display-containing-cursor": {
        payload: z.null(),
        response: z.object({
            postMoveInfo: z
                .object({
                    windowCursorX: z.number(),
                    windowCursorY: z.number(),
                })
                .nullable(),
        }),
    },
    "check-for-updates": {
        payload: z.null(),
        response: z.enum(["none", "available", "failed"]),
    },
    // MCP
    'mcp-list-clients': {
        payload: z.null(),
        response: z.array(z.object({
            id: z.string(),
            name: z.string(),
            status: z.enum(['connected', 'disconnected', 'loading', 'authorizing']),
            error: z.unknown().optional(),
            toolInfo: z.array(z.object({
                name: z.string(),
                description: z.string(),
                inputSchema: z.object({}).passthrough().optional(),
            })),
            config: z.object({}).passthrough(),
        })),
    },
    'mcp-refresh-client': {
        payload: z.object({ id: z.string() }),
        response: z.void(),
    },
    'mcp-toggle-client': {
        payload: z.object({
            id: z.string(),
            status: z.enum(['connected', 'disconnected', 'loading', 'authorizing']),
        }),
        response: z.void(),
    },
    'mcp-authorize-client': {
        payload: z.object({ id: z.string() }),
        response: z.object({ url: z.string().url().optional() }),
    },
    'mcp-check-token': {
        payload: z.object({ id: z.string() }),
        response: z.object({ authenticated: z.boolean() }),
    },
    'mcp-call-tool': {
        payload: z.object({ id: z.string(), toolName: z.string(), input: z.unknown() }),
        response: z.object({}).passthrough(),
    },
    'mcp-get-config-path': {
        payload: z.null(),
        response: z.object({ path: z.string() }),
    },
    'mcp-open-config': {
        payload: z.null(),
        response: z.void(),
    },
    'mcp-reveal-config': {
        payload: z.null(),
        response: z.void(),
    },
    'mcp-remove-client': {
        payload: z.object({ id: z.string() }),
        response: z.void(),
    },
}