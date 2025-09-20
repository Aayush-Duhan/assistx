import { cn } from "@/lib/utils";
import { send } from "@/services/electron";
import { useEffect, useRef, forwardRef, MutableRefObject } from "react";

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

export const MouseEventsCapture = forwardRef<HTMLDivElement, MouseEventsCaptureProps>(
    ({ enabled = true, children }, forwardedRef) => {
        const elementRef = useRef<HTMLDivElement | null>(null);
        const regionId = useRef(Symbol('mouse-capture-region'));

        // Merge external ref with internal ref
        const setRef = (node: HTMLDivElement | null) => {
            elementRef.current = node;
            if (typeof forwardedRef === 'function') {
                forwardedRef(node);
            } else if (forwardedRef) {
                (forwardedRef as MutableRefObject<HTMLDivElement | null>).current = node;
            }
        };

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
            <div ref={setRef} className={cn(enabled && 'pointer-events-auto')}>
                {children}
            </div>
        );
    }
);