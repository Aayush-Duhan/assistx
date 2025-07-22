// File: ipc/ipcMain.ts
import { ipcMain, IpcMainEvent, IpcMainInvokeEvent } from 'electron';
import { z } from 'zod';
import { IpcMainEvents, IpcMainHandleEvents, IpcMainEventSchema, ipcMainHandlerEventsSchema } from './schema';

/**
 * A type-safe wrapper for ipcMain.on.
 * Parses the payload using a Zod schema before calling the listener.
 */
export function on<T extends keyof IpcMainEvents>(
  channel: T,
  listener: (event: IpcMainEvent, payload: z.infer<IpcMainEvents[T]>) => void,
): void {
    const schema = IpcMainEventSchema[channel];
  const handler = (event: IpcMainEvent, payload: unknown) => {
    const parsedPayload = schema.parse(payload);
    listener(event, parsedPayload);
  };
  ipcMain.on(channel, handler);
}

/**
 * A type-safe wrapper for ipcMain.handle.
 * Parses the payload using a Zod schema before calling the handler.
 */
export function handle<T extends keyof IpcMainHandleEvents>(
  channel: T,
  handler: (
    event: IpcMainInvokeEvent, 
    payload: z.infer<IpcMainHandleEvents[T]['payload']>,
    ) => Promise<z.infer<IpcMainHandleEvents[T]['response']>> | z.infer<IpcMainHandleEvents[T]['response']>,
): void {
const schema = ipcMainHandlerEventsSchema[channel].payload;
  const ipcHandler = (event: IpcMainInvokeEvent, payload: unknown) => {
    const parsedPayload = schema.parse(payload);
    return handler(event, parsedPayload);
  };
  ipcMain.handle(channel, ipcHandler);
}