import {useRef,useEffect,useCallback,ReactNode} from 'react';
import { useMovableWindow } from './MovableWindowsProvider';

interface DraggableWindowProps {
    children: ReactNode;
}

export function DraggableWindow({ children }: DraggableWindowProps) {
    const { getX, moveDrag } = useMovableWindow();
    const dragContainerRef = useRef<HTMLDivElement>(null);
    const dragState = useRef({
        state: 'idle' as 'idle' | 'dragging-in-dead-zone' | 'dragging',
        startClientX: 0,
        startX: 0,
    });

    const onMouseDown = useCallback(
        (event: MouseEvent) => {
            const target = event.target as HTMLElement;
            const container = dragContainerRef.current;

            if (
                container &&
                (target === container || !isInteractive(target, container))
            ) {
                dragState.current = {
                    state: 'dragging-in-dead-zone',
                    startClientX: event.clientX,
                    startX: 0,
                };
            }
        },
        []
    );

    const onMouseMove = useCallback(
        (event: MouseEvent) => {
            const currentDragState = dragState.current;

            if (
                currentDragState.state === 'dragging-in-dead-zone' &&
                Math.abs(event.clientX - currentDragState.startClientX) > 5 // 5px dead zone
            ) {
                dragState.current = {
                    state: 'dragging',
                    startClientX: event.clientX,
                    startX: getX(),
                };
            }

            if (dragState.current.state === 'dragging') {
                const deltaX = event.clientX - dragState.current.startClientX;
                const newX = dragState.current.startX + deltaX;
                moveDrag(newX);
            }
        },
        [getX, moveDrag]
    );

    const onMouseUp = useCallback(() => {
        setTimeout(() => {
            dragState.current = { state: 'idle', startClientX: 0, startX: 0 };
        }, 0);
    }, []);

    const onClickCapture = useCallback((event: MouseEvent) => {
        if (dragState.current.state === 'dragging') {
            event.stopPropagation();
        }
    }, []);

    useEffect(() => {
        const container = dragContainerRef.current;
        if (!container) return;

        container.addEventListener('mousedown', onMouseDown);

        window.addEventListener('mousemove', onMouseMove);
        window.addEventListener('mouseup', onMouseUp);

        window.addEventListener('click', onClickCapture, { capture: true });

        return () => {
            container.removeEventListener('mousedown', onMouseDown);
            window.removeEventListener('mousemove', onMouseMove);
            window.removeEventListener('mouseup', onMouseUp);
            window.removeEventListener('click', onClickCapture, { capture: true });
        };
    }, [onMouseDown, onMouseMove, onMouseUp, onClickCapture]);

    return <div ref={dragContainerRef}>{children}</div>;
}

function isInteractive(element: HTMLElement, container: HTMLElement): boolean {
    const interactiveTags = ['BUTTON', 'INPUT', 'TEXTAREA', 'SELECT', 'A'];
    let current: HTMLElement | null = element;

    while (current && current !== container) {
        if (
            interactiveTags.includes(current.tagName) ||
            current.hasAttribute('data-interactive') ||
            window.getComputedStyle(current).cursor === 'pointer'
        ) {
            return true;
        }
        current = current.parentElement;
    }
    return false;
}