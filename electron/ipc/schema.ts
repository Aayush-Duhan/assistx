import { z } from 'zod';

export const IpcMainEventSchema = {
    'quit-app' : z.null(),
    'restart-window' : z.null(),
    'check-for-update' : z.null(),
    'install-update' : z.null(),
    'get-update-status' : z.null(),
    'finish-onboarding' : z.null(),
    'reset-onboarding' : z.null(),
    'register-global-shortcut' : z.object({
        accelerator: z.string(),
    }),
    'unregister-global-shortcut' : z.object({
        accelerator: z.string(),
    }),
    'enable-dev-shortcuts' : z.null(),
    'reset-global-shortcuts' : z.null(),
    'set-ignore-mouse-events' : z.object({
        ignore: z.boolean(),
    }),
    'resize-window' : z.object({
        width: z.number(),
        height: z.number(),
        duration: z.number()
    }),
    'focus-window' : z.null(),
    'unfocus-window' : z.null(),
    'toggle-visibility' : z.null(),
    // Display management events
    'get-available-displays' : z.null(),
    'get-invisible' : z.null(),
    'move-window-to-display' : z.object({
        displayId: z.number(),
    }),
    'show-display-overlay' : z.null(),
    'hide-display-overlay' : z.null(),
    'highlight-display' : z.object({
        displayId: z.number(),
    }),
    'unhighlight-display' : z.object({
        displayId: z.number(),
    }),
    // Mac specific events
    'mac-open-system-settings' : z.object({
        section: z.enum(['privacy > microphone', 'privacy > screen-recording'])
    }),
    'mac-set-native-recorder-enabled' : z.object({
        enabled: z.boolean(),
    }),
    'mac-set-mic-monitor-enabled' : z.object({
        enabled: z.boolean(),
    }),
    'toggle-invisible' : z.null()
};

export const ipcMainHandlerEventsSchema = {
    'open-external-url' : {
        payload: z.object({ url: z.string().url() }),
        response: z.void(),
    },
    // Gmail integration
    'gmail-set-oauth-client' : {
        payload: z.object({ clientId: z.string(), clientSecret: z.string() }),
        response: z.void(),
    },
    'gmail-get-status' : {
        payload: z.null(),
        response: z.object({ configured: z.boolean(), authenticated: z.boolean() }),
    },
    'gmail-login' : {
        payload: z.null(),
        response: z.object({ success: z.boolean() }),
    },
    'gmail-logout' : {
        payload: z.null(),
        response: z.void(),
    },
    'gmail-send' : {
        payload: z.object({ to: z.string(), subject: z.string(), body: z.string() }),
        response: z.object({ success: z.boolean() }),
    },
    'request-has-onboarded' : {
        payload: z.null(),
        response: z.object({
            hasOnboarded: z.boolean(),
        }),
    },
    'request-media-permission' : {
        payload: z.enum(['microphone', 'camera', 'screen']),
        response: z.boolean(),
    },
    'capture-screenshot' : {
        payload: z.null(),
        response: z.object({
            contentType: z.string(),
            data: z.instanceof(Buffer),
        })
    },
    'mac-check-macos-version' : {
        payload: z.null(),
        response: z.object({
            isSupported: z.boolean(),
        })
    },
    'request-window-visibility' : {
        payload: z.null(),
        response: z.object({
            visible: z.boolean(),
        }),
    },
    // MCP
    'mcp-list-clients': {
        payload: z.null(),
        response: z.array(z.object({
            id: z.string(),
            name: z.string(),
            status: z.enum(['connected','disconnected','loading','authorizing']),
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
};

export type IpcMainEvents = typeof IpcMainEventSchema;
export type IpcMainHandleEvents = typeof ipcMainHandlerEventsSchema;