import { z } from 'zod';

export const IpcMainEventSchema = {
    'quit-app' : z.null(),
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
};

export type IpcMainEvents = typeof IpcMainEventSchema;
export type IpcMainHandleEvents = typeof ipcMainHandlerEventsSchema;