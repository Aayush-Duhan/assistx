// File: ipc/ipcMain.ts
import { ipcMain, IpcMainEvent, IpcMainInvokeEvent } from 'electron';
import { z } from 'zod';
import { ipcToMainEvents, ipcInvokeEvents } from '@/shared/ipcEvents';

/**
 * Register a one-way IPC event handler (renderer -> main)
 */
export function on<T extends keyof typeof ipcToMainEvents>(
  channel: T,
  listener: (event: IpcMainEvent, payload: z.infer<typeof ipcToMainEvents[T]>) => void,
): void {
    const schema = ipcToMainEvents[channel];
  const handler = (event: IpcMainEvent, payload: unknown) => {
    const parsedPayload = schema.parse(payload);
    listener(event, parsedPayload);
  };
  ipcMain.on(channel, handler);
}

/**
 * Register a two-way IPC invoke handler (renderer -> main -> renderer)
 */
export function handle<T extends keyof typeof ipcInvokeEvents>(
  channel: T,
  handler: (
    event: IpcMainInvokeEvent, 
    payload: z.infer<typeof ipcInvokeEvents[T]['payload']>,
    ) => Promise<z.infer<typeof ipcInvokeEvents[T]['response']>> | z.infer<typeof ipcInvokeEvents[T]['response']>,
): void {
const schema = ipcInvokeEvents[channel].payload;
  const ipcHandler = (event: IpcMainInvokeEvent, payload: unknown) => {
    const parsedPayload = schema.parse(payload);
    return handler(event, parsedPayload);
  };
  ipcMain.handle(channel, ipcHandler);
}