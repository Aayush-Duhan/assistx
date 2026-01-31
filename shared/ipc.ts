import type z from "zod";
import type {
  ipcToMainEvents,
  IpcToRendererEvents,
  ipcInvokeEvents,
  BroadcastToAllWindowsPayload,
} from "./ipcEvents";

export function sendToIpcMain<T extends keyof typeof ipcToMainEvents>(
  channel: T,
  payload: z.infer<(typeof ipcToMainEvents)[T]>,
) {
  window.electron.ipcRenderer.send(channel, payload);
}

export function addIpcRendererHandler<T extends keyof IpcToRendererEvents>(
  channel: T,
  handler: (payload: IpcToRendererEvents[T]) => void,
) {
  window.electron.ipcRenderer.on(channel, (_event, payload) =>
    handler(payload as IpcToRendererEvents[T]),
  );
}

export async function invokeIpcMain<T extends keyof typeof ipcInvokeEvents>(
  channel: T,
  payload: z.infer<(typeof ipcInvokeEvents)[T]["payload"]>,
): Promise<z.infer<(typeof ipcInvokeEvents)[T]["response"]>> {
  const promise = window.electron.ipcRenderer.invoke(channel, payload);
  return promise as Promise<z.infer<(typeof ipcInvokeEvents)[T]["response"]>>;
}

export function broadcastToAllWindowsFromRenderer<
  T extends BroadcastToAllWindowsPayload["command"],
>(command: T, fields: Omit<Extract<BroadcastToAllWindowsPayload, { command: T }>, "command">) {
  return sendToIpcMain("broadcast-to-all-windows", {
    command,
    ...fields,
  } as BroadcastToAllWindowsPayload);
}
