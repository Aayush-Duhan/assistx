import React, {
    useRef,
    useCallback,
    useEffect,
    ReactNode,
    FC,
  } from 'react';
  import { useMovableWindow } from './windows/MovableWindowsProvider';
  
  // --- Type Definitions ---
  
  /**
   * Defines the possible states of the drag interaction.
   * - idle: No drag is in progress.
   * - dragging: The user is actively dragging the component.
   */
  type DragState =
    | { state: 'idle' }
    | {
        state: 'dragging';
        /** The initial clientX position of the pointer when the drag started. */
        startClientX: number;
        /** The initial horizontal position of the window when the drag started. */
        startX: number;
      };
  
  interface DraggableContainerProps {
    children: ReactNode;
  }
  
  // --- Component ---
  
  /**
   * A wrapper component that makes its children horizontally draggable.
   * It listens for pointer events to track drag gestures and updates the
   * window's position via the `useMovableWindow` context.
   * It also includes logic to prevent accidental clicks after a drag.
   */
  export const DraggableContainer: FC<DraggableContainerProps> = ({ children }) => {
    const { getX, moveDrag } = useMovableWindow();
  
    // Use a ref to store the drag state to avoid re-renders on every mouse move.
    const dragState = useRef<DragState>({ state: 'idle' });
    const ref = useRef<HTMLDivElement>(null);
  
    /**
     * Initiates a drag session when the user presses down on the component.
     */
    const onMouseDown = useCallback(
      (e: React.MouseEvent) => {
        if (!ref.current) return;
  
        // Check if the mousedown event is within the component's bounds.
        const rect = ref.current.getBoundingClientRect();
        if (
          e.clientX >= rect.left &&
          e.clientX <= rect.right &&
          e.clientY >= rect.top &&
          e.clientY <= rect.bottom
        ) {
          dragState.current = {
            state: 'dragging',
            startClientX: e.clientX,
            startX: getX(),
          };
        }
      },
      [getX]
    );
  
    /**
     * Handles the pointer move event, updating the window's position if a drag is active.
     * This listener is attached to the window to allow dragging outside the component's bounds.
     */
    const onMouseMove = useCallback(
      (e: MouseEvent) => {
        if (dragState.current.state !== 'dragging') return;
  
        const deltaX = e.clientX - dragState.current.startClientX;
        const newX = dragState.current.startX + deltaX;
        moveDrag(newX);
      },
      [moveDrag]
    );
  
    /**
     * Ends the drag session when the user releases the pointer.
     * A `setTimeout` is used to ensure this logic runs after the `onClick` capture phase.
     */
    const onMouseUp = useCallback(() => {
      setTimeout(() => {
        dragState.current = { state: 'idle' };
      }, 0);
    }, []);
  
    /**
     * Prevents click events from firing on underlying elements after a drag has occurred.
     * This is crucial for preventing buttons from being accidentally triggered.
     * It uses the `capture` phase to intercept the event before it reaches the target.
     */
    const onClick = useCallback((e: MouseEvent) => {
      if (dragState.current.state === 'dragging') {
        e.stopPropagation();
      }
    }, []);
  
    // Effect to set up and clean up global event listeners.
    useEffect(() => {
      const el = ref.current;
      if (!el) return;
  
      // We listen on the window for move and up events for a smoother UX,
      // allowing the user's cursor to leave the component's bounds while dragging.
      window.addEventListener('mousemove', onMouseMove);
      window.addEventListener('mouseup', onMouseUp);
      window.addEventListener('click', onClick, { capture: true });
  
      return () => {
        window.removeEventListener('mousemove', onMouseMove);
        window.removeEventListener('mouseup', onMouseUp);
        window.removeEventListener('click', onClick, { capture: true });
      };
    }, [onMouseMove, onMouseUp, onClick]);
  
    return (
      <div ref={ref} onMouseDown={onMouseDown}>
        {children}
      </div>
    );
  };