import { Buffer } from "buffer";
import z from "zod";
import { type SharedState, sharedStateSchema } from "./sharedState";
import { updateStatusSchema, versionInfoSchema } from "./updateStatus";

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
  "quit-app": z.null(),
  "relaunch-app": z.null(),
  "install-update": z.null(),
  "finish-onboarding": z.null(),
  "reset-onboarding": z.null(),
  "register-global-shortcut": z.object({
    accelerator: z.string(),
  }),
  "unregister-global-shortcut": z.object({
    accelerator: z.string(),
  }),
  "enable-dev-shortcuts": z.null(),
  "reset-global-shortcuts": z.null(),
  "set-ignore-mouse-events": z.object({
    ignore: z.boolean(),
  }),
  "resize-window": z.object({
    width: z.number(),
    height: z.number(),
    duration: z.number(),
  }),
  "focus-window": z.null(),
  "unfocus-window": z.null(),
  // Display management events
  "get-available-displays": z.null(),
  "get-invisible": z.null(),
  "move-window-to-display": z.object({
    displayId: z.number(),
  }),
  // Dashboard Events
  "set-dashboard-visibility": z.object({ visible: z.boolean() }),
  // Mac specific events
  "mac-open-system-settings": z.object({
    section: z.enum(["privacy > microphone", "privacy > screen-recording", "sound > input"]),
  }),
  "mac-set-native-recorder-enabled": z.object({
    enabled: z.boolean(),
  }),
  "mac-set-mic-monitor-enabled": z.object({
    enabled: z.boolean(),
  }),
  "windows-open-system-settings": z.object({
    section: z.string(),
  }),
  "toggle-invisible": z.null(),
  "broadcast-to-all-windows": broadcastToAllWindowsPayloadSchema,
};

export type IpcToRendererEvents = {
  "update-shared-state": SharedState;
  "update-status-changed": z.infer<typeof updateStatusSchema>;
  "global-shortcut-triggered": {
    accelerator: string;
  };
  "broadcast-to-all-windows": BroadcastToAllWindowsPayload;
  "reset-widget-position": null;
};

export const ipcInvokeEvents = {
  "open-external-url": {
    payload: z.object({ url: z.string().url() }),
    response: z.void(),
  },
  "get-shared-state": {
    payload: z.null().optional(),
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
    payload: z.null().optional(),
    response: z.object({
      contentType: z.string(),
      data: z.instanceof(Buffer),
    }),
  },
  "is-cursor-outside-target-display": {
    payload: z.null().optional(),
    response: z.boolean(),
  },
  "move-window-to-display-containing-cursor": {
    payload: z.null().optional(),
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
    payload: z.null().optional(),
    response: z.enum(["none", "available", "failed"]),
  },
  "get-update-status": {
    payload: z.null().optional(),
    response: updateStatusSchema,
  },
  "get-version-info": {
    payload: z.null().optional(),
    response: versionInfoSchema,
  },
  "get-server-config": {
    payload: z.null().optional(),
    response: z
      .object({
        port: z.number(),
        host: z.string(),
        baseUrl: z.string(),
        wsUrl: z.string(),
        token: z.string(),
      })
      .nullable(),
  },
  "open-oauth-popup": {
    payload: z.object({ url: z.string().url(), redirectUrlPrefix: z.string() }),
    response: z.object({
      code: z.string().nullable(),
      error: z.string().nullable(),
    }),
  },
  "open-oauth-external": {
    payload: z.object({ url: z.string().url() }),
    response: z.object({ success: z.boolean() }),
  },
};
