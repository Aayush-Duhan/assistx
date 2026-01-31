import { useEffect } from "react";
import { useEventCallback } from "usehooks-ts";
import { addIpcRendererHandler } from "./ipc.js";
import type { IpcToRendererEvents } from "./ipcEvents.js";

type Handler<T extends keyof IpcToRendererEvents> = (payload: IpcToRendererEvents[T]) => void;

const handlersByEvent = new Map<keyof IpcToRendererEvents, unknown>();

function getOrInitHandlers<T extends keyof IpcToRendererEvents>(event: T): Set<Handler<T>> {
  const handlers = handlersByEvent.get(event);
  if (handlers) {
    return handlers as Set<Handler<T>>;
  }

  const newHandlers = new Set<Handler<T>>();
  handlersByEvent.set(event, newHandlers);

  // first time encountering this event, we need to add the IPC handler
  addIpcRendererHandler(event, (payload) => {
    for (const handler of Array.from(newHandlers)) {
      handler(payload);
    }
  });

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
    };
  }, [event, stableHandler]);
}
