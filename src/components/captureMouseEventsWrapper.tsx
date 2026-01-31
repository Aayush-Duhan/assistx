import { updateState, useSharedState } from "@/shared";
import { type PropsWithChildren, useEffect, useRef, useState } from "react";
import { twMerge } from "tailwind-merge";

// list of unique symbols currently capturing mouse events; once empty, the app
// starts ignoring mouse events
const captureMouseEventsSymbols = new Set<symbol>();

function updateIgnoreMouseEvents() {
  updateState({ ignoreMouseEvents: captureMouseEventsSymbols.size === 0 });
}

// reset on window load
updateIgnoreMouseEvents();

type Props = PropsWithChildren<{
  enabled?: boolean;
  enabledEvenWhenHidden?: boolean;
  className?: string;
}>;

export function CaptureMouseEventsWrapper({
  enabled = true,
  enabledEvenWhenHidden = false,
  className,
  children,
}: Props) {
  const wrapperRef = useRef<HTMLDivElement>(null);

  const { windowHidden } = useSharedState();
  const shouldCaptureMouse = enabled && (!windowHidden || enabledEvenWhenHidden);

  // remember the last mouse position
  const lastPosRef = useRef<{ x: number; y: number } | null>(null);

  const { current: symbol } = useRef(Symbol());

  const [captureMouseEvents, setCaptureMouseEvents] = useState(false);

  useEffect(() => {
    const wrapperEl = wrapperRef.current;
    if (!wrapperEl) return;

    const flush = () => {
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
      flush();
    };

    // react to enabled/windowHidden change
    flush();

    window.addEventListener("mousemove", handleMouseMove);
    return () => window.removeEventListener("mousemove", handleMouseMove);
  }, [shouldCaptureMouse]);

  useEffect(() => {
    if (captureMouseEvents) {
      captureMouseEventsSymbols.add(symbol);
      updateIgnoreMouseEvents();

      return () => {
        captureMouseEventsSymbols.delete(symbol);
        updateIgnoreMouseEvents();
      };
    }
  }, [captureMouseEvents]);

  return (
    <div ref={wrapperRef} className={twMerge(enabled && "pointer-events-auto", className)}>
      {children}
    </div>
  );
}
