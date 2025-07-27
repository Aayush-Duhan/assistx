import { useRef, useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";
import { MovableWindowsPortal } from "../Portal";
import { InlineWindow, InlineWindowProps } from "./InlineWindow";
import { MouseEventsCapture } from "./MouseEventCapture";

interface ResizableMovableWindowProps extends InlineWindowProps {
    show?: boolean;
    bounceDirection?: 'up' | 'down';
    initialWidth?: number;
    minWidth?: number;
}

export const ResizableMovableWindow = ({
    show = true,
    bounceDirection,
    initialWidth = 700,
    minWidth = 400,
    ...props
  }: ResizableMovableWindowProps) => {
    const [width, setWidth] = useState(initialWidth);
    const [isResizing, setIsResizing] = useState(false);
    const resizeRef = useRef<HTMLDivElement>(null);
    const startX = useRef(0);
    const startWidth = useRef(initialWidth);
    const dragDirection = useRef<'left' | 'right' | null>(null);
  
    const handleMouseDown = useCallback(
      (e: React.MouseEvent, direction: 'left' | 'right') => {
        e.preventDefault();
        setIsResizing(true);
        startX.current = e.clientX;
        startWidth.current = width;
        dragDirection.current = direction;
      },
      [width]
    );
  
    const handleMouseMove = useCallback(
      (e: MouseEvent) => {
        if (!isResizing || !dragDirection.current) return;
        const deltaX = e.clientX - startX.current;
        let newWidth = startWidth.current;
        if (dragDirection.current === 'right') {
          newWidth = startWidth.current + deltaX * 2;
        } else {
          newWidth = startWidth.current - deltaX * 2;
        }
        newWidth = Math.max(minWidth, newWidth);
        setWidth(newWidth);
      },
      [isResizing, minWidth]
    );
  
    const handleMouseUp = useCallback(() => {
      setIsResizing(false);
      dragDirection.current = null;
    }, []);
  
    useEffect(() => {
      if (isResizing) {
        document.addEventListener('mousemove', handleMouseMove);
        document.addEventListener('mouseup', handleMouseUp);
        return () => {
          document.removeEventListener('mousemove', handleMouseMove);
          document.removeEventListener('mouseup', handleMouseUp);
        };
      }
    }, [isResizing, handleMouseMove, handleMouseUp]);
  
    const y = bounceDirection === 'up' 
      ? [0, -10, 0] 
      : bounceDirection === 'down' 
        ? [0, 10, 0] 
        : 0;
    
    const duration = isResizing ? 0.02 : 0.15;
    const ease = isResizing ? 'linear' : 'easeOut';
  
    return (
      <MovableWindowsPortal>
        <AnimatePresence>
          {show && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration, ease }}
            >
              <motion.div
                animate={{ y }}
                transition={{ 
                  ease: isResizing ? 'linear' : 'easeInOut', 
                  duration: isResizing ? duration : 25 / 1000 
                }}
              >
                <MouseEventsCapture>
                  <div 
                    ref={resizeRef} 
                    className="relative rounded-lg" 
                    style={{ width }}
                  >
                    <MouseEventsCapture>
                      <div
                        className={cn(
                          'absolute left-0 top-0 bottom-0 w-1 cursor-ew-resize z-10',
                          'hover:bg-white/20 transition-colors duration-150',
                          isResizing && dragDirection.current === 'left' && 'bg-white/30'
                        )}
                        onMouseDown={(e) => handleMouseDown(e, 'left')}
                      />
                    </MouseEventsCapture>
                    <MouseEventsCapture>
                      <div
                        className={cn(
                          'absolute right-0 top-0 bottom-0 w-1 cursor-ew-resize z-10',
                          'hover:bg-white/20 transition-colors duration-150',
                          isResizing && dragDirection.current === 'right' && 'bg-white/30'
                        )}
                        onMouseDown={(e) => handleMouseDown(e, 'right')}
                      />
                    </MouseEventsCapture>
                    <InlineWindow
                      layoutTransition
                      width={width}
                      captureMouseEvents
                      fastAnimations={isResizing}
                      {...props}
                    />
                  </div>
                </MouseEventsCapture>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
      </MovableWindowsPortal>
    );
  };