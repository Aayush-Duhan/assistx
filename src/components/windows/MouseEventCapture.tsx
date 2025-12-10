import { atom, getDefaultStore } from "jotai";
import { useCallback, useEffect, useRef } from "react";
import { twMerge } from "tailwind-merge";
import { useSharedState } from "@/shared";
import { sendToIpcMain } from "@/shared";

const defaultStore = getDefaultStore();

// if non-empty, the app should NOT ignore mouse events
const captureMouseEventsSymbols = new Set<symbol>();

const isIgnoringMouseEventsAtom = atom(true);

defaultStore.sub(isIgnoringMouseEventsAtom, () => {
  sendToIpcMain("set-ignore-mouse-events", {
    ignore: defaultStore.get(isIgnoringMouseEventsAtom),
  });
});

// reset on window load
sendToIpcMain("set-ignore-mouse-events", { ignore: true });

function updateIgnoreMouseEvents() {
  const ignore = captureMouseEventsSymbols.size === 0;
  defaultStore.set(isIgnoringMouseEventsAtom, ignore);
}

function registerCaptureMouseEventsSymbol(symbol: symbol) {
  captureMouseEventsSymbols.add(symbol);
  updateIgnoreMouseEvents();
}

function unregisterCaptureMouseEventsSymbol(symbol: symbol) {
  captureMouseEventsSymbols.delete(symbol);
  updateIgnoreMouseEvents();
}

export function useSetCaptureMouseEvents() {
  const { current: symbol } = useRef(Symbol());

  useEffect(() => {
    return () => unregisterCaptureMouseEventsSymbol(symbol);
  }, []);

  const setCaptureMouseEvents = useCallback((enabled: boolean) => {
    if (enabled) {
      registerCaptureMouseEventsSymbol(symbol);
    } else {
      unregisterCaptureMouseEventsSymbol(symbol);
    }
  }, []);

  return setCaptureMouseEvents;
}

export function MouseEventsCapture({
  enabled = true,
  enabledEvenWhenHidden = false,
  className,
  children,
}: {
  enabled?: boolean;
  enabledEvenWhenHidden?: boolean;
  className?: string;
  children?: React.ReactNode;
}) {
  const wrapperRef = useRef<HTMLDivElement>(null);

  const { windowHidden } = useSharedState();
  const shouldCaptureMouse = enabled && (!windowHidden || enabledEvenWhenHidden);

  // remember the last mouse position
  const lastPosRef = useRef<{ x: number; y: number } | null>(null);

  const setCaptureMouseEvents = useSetCaptureMouseEvents();

  useEffect(() => {
    const wrapperEl = wrapperRef.current;
    if (!wrapperEl) {
      return;
    }

    const updateCaptureStatus = () => {
      const lastPos = lastPosRef.current;
      const rect = wrapperEl.getBoundingClientRect();

      setCaptureMouseEvents(
        shouldCaptureMouse &&
          !!lastPos &&
          lastPos.x >= rect.left &&
          lastPos.x <= rect.right &&
          lastPos.y >= rect.top &&
          lastPos.y <= rect.bottom,
      );
    };

    const handleMouseMove = (event: MouseEvent) => {
      lastPosRef.current = { x: event.clientX, y: event.clientY };
      updateCaptureStatus();
    };

    // react to enabled/isHidden change
    updateCaptureStatus();

    window.addEventListener("mousemove", handleMouseMove);
    return () => window.removeEventListener("mousemove", handleMouseMove);
  }, [shouldCaptureMouse, setCaptureMouseEvents]);

  return (
    <div ref={wrapperRef} className={twMerge(enabled && "pointer-events-auto", className)}>
      {children}
    </div>
  );
}
