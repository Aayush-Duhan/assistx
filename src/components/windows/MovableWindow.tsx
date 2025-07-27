import { useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useSetAtom } from "jotai";
import { InlineWindow, InlineWindowProps } from "./InlineWindow";
import { MovableWindowsPortal } from "../Portal"
import { movableWindowCountAtom } from "@/state/atoms";

interface MovableWindowProps extends InlineWindowProps {
    show?: boolean;
    bounceDirection?: 'up' | 'down';
}

const MovableWindow = ({
    show = true,
    bounceDirection,
    ...props
  }: MovableWindowProps) => {
    const y = bounceDirection === 'up' 
      ? [0, -10, 0] 
      : bounceDirection === 'down' 
        ? [0, 10, 0] 
        : 0;
    
    const setMovableWindowCount = useSetAtom(movableWindowCountAtom);
  
    useEffect(() => {
      if (show) {
        setMovableWindowCount((count) => count + 1);
        return () => {
          setMovableWindowCount((count) => count - 1);
        };
      }
    }, [show, setMovableWindowCount]);
  
    return (
      <MovableWindowsPortal>
        <AnimatePresence>
          {show && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
            >
              <motion.div
                animate={{ y }}
                transition={{ 
                  ease: 'easeInOut', 
                  duration: 25 / 1000 
                }}
              >
                <InlineWindow layoutTransition {...props} />
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
      </MovableWindowsPortal>
    );
  };
  
  export default MovableWindow;