import { cn } from "@/lib/utils";
import { send } from "@/services/electron";
import { useEffect, useRef } from "react";

const mouseEventCaptureRegions = new Set<symbol>();

function updateWindowIgnoreMouseEvents() {
    const shouldIgnore = mouseEventCaptureRegions.size === 0;
    send('set-ignore-mouse-events', { ignore: shouldIgnore });
}

function addMouseCaptureRegion(id: symbol) {
    mouseEventCaptureRegions.add(id);
    updateWindowIgnoreMouseEvents();
}

function removeMouseCaptureRegion(id: symbol) {
    mouseEventCaptureRegions.delete(id);
    updateWindowIgnoreMouseEvents();
}

interface MouseEventsCaptureProps {
    enabled?: boolean;
    children: React.ReactNode;
}

export const MouseEventsCapture = ({ enabled = true, children }: MouseEventsCaptureProps) => {
    const elementRef = useRef<HTMLDivElement>(null);
    const regionId = useRef(Symbol('mouse-capture-region'));
  
    useEffect(() => {
      if (!enabled) return;
  
      const currentElement = elementRef.current;
      if (!currentElement) return;
  
      const onMouseEnter = () => addMouseCaptureRegion(regionId.current);
      const onMouseLeave = () => removeMouseCaptureRegion(regionId.current);
  
      currentElement.addEventListener('mouseenter', onMouseEnter);
      currentElement.addEventListener('mouseleave', onMouseLeave);
  
      // Cleanup on unmount
      return () => {
        currentElement.removeEventListener('mouseenter', onMouseEnter);
        currentElement.removeEventListener('mouseleave', onMouseLeave);
        removeMouseCaptureRegion(regionId.current);
      };
    }, [enabled]);
  
    // Final cleanup when the component instance is destroyed
    useEffect(() => () => removeMouseCaptureRegion(regionId.current), []);
  
    return (
      <div ref={elementRef} className={cn(enabled && 'pointer-events-auto')}>
        {children}
      </div>
    );
  };