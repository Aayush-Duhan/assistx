import { useEffect } from "react";
import { useEventCallback } from "usehooks-ts";
import { addIpcRendererHandler } from "./ipc.js";
import type { IpcToRendererEvents } from "./ipcEvents.js";

type Handler<T extends keyof IpcToRendererEvents> = (payload: IpcToRendererEvents[T]) => void;

const handlersByEvent = new Map<
  keyof IpcToRendererEvents,
  { handlers: Set<Handler<any>>; dispose: () => void }
>();

function getOrInitHandlers<T extends keyof IpcToRendererEvents>(event: T): Set<Handler<T>> {
  const entry = handlersByEvent.get(event);
  if (entry) {
    return entry.handlers as Set<Handler<T>>;
  }

  const newHandlers = new Set<Handler<T>>();

  // First time encountering this event — add the base IPC listener
  const dispose = addIpcRendererHandler(event, (payload) => {
    for (const handler of Array.from(newHandlers)) {
      handler(payload);
    }
  });

  handlersByEvent.set(event, { handlers: newHandlers as Set<Handler<any>>, dispose });

  return newHandlers;
}

export function useIpcRendererHandler<T extends keyof IpcToRendererEvents>(
  event: T,
  handler: Handler<T>,
): void {
  const stableHandler = useEventCallback(handler);

  useEffect(() => {
    const handlers = getOrInitHandlers(event);
    handlers.add(stableHandler);

    return () => {
      handlers.delete(stableHandler);

      // When the last handler is removed, clean up the base IPC listener
      // so hot reloads don't accumulate duplicate listeners
      const entry = handlersByEvent.get(event);
      if (entry && entry.handlers.size === 0) {
        entry.dispose();
        handlersByEvent.delete(event);
      }
    };
  }, [event, stableHandler]);
}
