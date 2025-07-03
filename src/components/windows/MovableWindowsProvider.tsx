import { useState, useCallback, useMemo, createContext, useContext, useEffect } from 'react';
import { motion, useMotionValue, useSpring } from 'framer-motion';
import { useGlobalShortcut } from '../../hooks/useGlobalShortcut';
import { useFeatureFlag, FeatureFlags } from '../../stores/featureStore';

const DRAG_MOVE_AMOUNT = 100;
const DRAG_SNAP_THRESHOLD = 10;

interface MovableWindowsContextType {
    getX: () => number;
    setX: (newX: number, immediate?: boolean) => void;
    moveDrag: (newX: number) => void;
    moveLeft: () => void;
    moveRight: () => void;
}

// Create the context - keep it internal to this module
const MovableWindowsContext = createContext<MovableWindowsContextType | undefined>(undefined);

/**
 * Custom hook to easily access the movable windows context.
 */
export function useMovableWindow(): MovableWindowsContextType {
    const context = useContext(MovableWindowsContext);
    if (context === undefined) {
        throw new Error("useMovableWindow must be used within a MovableWindowsProvider");
    }
    return context;
}

/**
 * Provides the context and state for all horizontally movable windows.
 * This includes the shared x-position, spring animation, and keyboard shortcuts for moving.
 */
function MovableWindowsProvider({ children }: { children: React.ReactNode }) {
    const isVimMode = useFeatureFlag(FeatureFlags.VIM_MODE_KEY_BINDINGS);

    // The core motion value for the horizontal position.
    const x = useMotionValue(0);
    // A spring animation applied to the motion value for smooth movement.
    const animatedX  = useSpring(x, { stiffness: 300, damping: 30 });

    const [isBouncing, setIsBouncing] = useState(false);

    // Effect to manage the "centered" state for the centering line animation.
    useEffect(() => {
        if (isBouncing) {
            const timer = setTimeout(() => setIsBouncing(false), 500);
            return () => clearTimeout(timer);
        }
    }, [isBouncing]);

    // --- Movement Handlers ---

    const setX = useCallback((newX: number, immediate = false) => {
        // When setting x to 0, trigger the centering animation.
        if (newX === 0 && x.get() !== 0) {
      setIsBouncing(true);
    }
    x.set(newX);
    if (immediate) {
      animatedX.jump(newX);
    }
    }, [x, animatedX]);

    const getX = useCallback(() => x.get(), [x]);
    
    const moveDrag = useCallback((newX: number) => {
        // Snap to center if close enough.
        const finalX = Math.abs(newX) < DRAG_SNAP_THRESHOLD ? 0 : newX;   
        setX(finalX, true);
    }, [setX]);

    const moveLeft = useCallback(() => {
        setX(x.get() - DRAG_MOVE_AMOUNT);
    }, [x, setX]);

    const moveRight = useCallback(() => {
        setX(x.get() + DRAG_MOVE_AMOUNT);
    }, [x, setX]);


    // Register global keyboard shortcuts for moving the windows.
    useGlobalShortcut(isVimMode ? "CommandOrControl+H" : "CommandOrControl+Left", moveLeft);
    useGlobalShortcut(isVimMode ? "CommandOrControl+L" : "CommandOrControl+Right", moveRight);

    const contextValue = useMemo(
        () => ({ getX, setX, moveDrag, moveLeft, moveRight }),
        [getX, setX, moveDrag, moveLeft, moveRight]
      );

    return (
        <MovableWindowsContext.Provider value={contextValue}>
            {/* Apply the shared horizontal translation to everything rendered inside */}
            <motion.div style={{ x: animatedX }}>
                {children}
            </motion.div>
        </MovableWindowsContext.Provider>
    );
}

// Export the component as default for better Fast Refresh compatibility
export default MovableWindowsProvider;

// Also export as named export to maintain backward compatibility
export { MovableWindowsProvider }; 