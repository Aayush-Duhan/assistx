import { useState, useRef, useCallback, useEffect, type ReactNode } from 'react';
import { motion } from 'framer-motion';
import { usePresence } from 'framer-motion';

interface ResizableContainerProps {
  show?: boolean;
  bounceDirection?: 'up' | 'down';
  initialWidth?: number;
  minWidth?: number;
  contentClassName?: string;
  children: ReactNode;
}

export function ResizableContainer({
  show = true,
  bounceDirection,
  initialWidth = 700,
  minWidth = 400,
  contentClassName,
  children,
}: ResizableContainerProps) {
  const [width, setWidth] = useState(initialWidth);
  const [isResizing, setIsResizing] = useState(false);
  const startX = useRef(0);
  const startWidth = useRef(initialWidth);
  const resizeDirection = useRef<'left' | 'right' | null>(null);

  const handleMouseDown = useCallback((
    e: React.MouseEvent,
    direction: 'left' | 'right'
  ) => {
    e.preventDefault();
    setIsResizing(true);
    startX.current = e.clientX;
    startWidth.current = width;
    resizeDirection.current = direction;
  }, [width]);

  const handleMouseMove = useCallback((e: MouseEvent) => {
    if (!isResizing || !resizeDirection.current) return;
    
    const deltaX = e.clientX - startX.current;
    let newWidth = startWidth.current;
    
    if (resizeDirection.current === "right") {
      newWidth = startWidth.current + deltaX * 2;
    } else {
      newWidth = startWidth.current - deltaX * 2;
    }
    
    newWidth = Math.max(minWidth, newWidth);
    setWidth(newWidth);
  }, [isResizing, minWidth]);

  const handleMouseUp = useCallback(() => {
    setIsResizing(false);
    resizeDirection.current = null;
  }, []);

  useEffect(() => {
    if (isResizing) {
      document.addEventListener("mousemove", handleMouseMove);
      document.addEventListener("mouseup", handleMouseUp);
      
      return () => {
        document.removeEventListener("mousemove", handleMouseMove);
        document.removeEventListener("mouseup", handleMouseUp);
      };
    }
  }, [isResizing, handleMouseMove, handleMouseUp]);

  const bounceY = bounceDirection === "up" 
    ? [0, -10, 0] 
    : bounceDirection === "down" 
      ? [0, 10, 0] 
      : [0, 0, 0];
      
  const transitionDuration = isResizing ? 0.02 : 0.15;
  const transitionEase = isResizing ? "linear" : "easeOut";

  usePresence(show);

  return (
    show && (
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -10 }}
        transition={{ duration: transitionDuration, ease: transitionEase }}
      >
        <motion.div
          animate={{ y: bounceY }}
          transition={{
            ease: isResizing ? "linear" : "easeInOut",
            duration: isResizing ? transitionDuration : 0.3,
          }}
        >
          <div className="relative rounded-lg" style={{ width }}>
            {/* Left resize handle */}
            <div
              className={`
                absolute left-0 top-0 bottom-0 w-1 cursor-ew-resize z-10
                hover:bg-white/20 transition-colors duration-150
                ${isResizing && resizeDirection.current === "left" ? "bg-white/30" : ""}
              `}
              onMouseDown={(e) => handleMouseDown(e, "left")}
            />
            
            {/* Right resize handle */}
            <div
              className={`
                absolute right-0 top-0 bottom-0 w-1 cursor-ew-resize z-10
                hover:bg-white/20 transition-colors duration-150
                ${isResizing && resizeDirection.current === "right" ? "bg-white/30" : ""}
              `}
              onMouseDown={(e) => handleMouseDown(e, "right")}
            />
            
            {/* Content container */}
            <div className={contentClassName}>
              {children}
            </div>
          </div>
        </motion.div>
      </motion.div>
    )
  );
}