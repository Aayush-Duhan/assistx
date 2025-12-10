import { useEffect, useRef } from "react";

export function useResizeObserver(
  callback: (element: Element) => void,
  target?: Element | string | null,
  enabled?: boolean,
): React.RefObject<Element | null> {
  const elementRef = useRef<Element | null>(null);

  useEffect(() => {
    const element =
      typeof target === "string" ? document.querySelector(target) : (target ?? elementRef.current);
    if (!element) return;

    const observer = new ResizeObserver((entries) => {
      for (const entry of entries) {
        if (enabled) {
          callback(entry.target);
        }
      }
    });

    observer.observe(element);
    return () => observer.disconnect();
  }, [callback, target, enabled]);

  return elementRef;
}
