import React, { createContext, useContext, useState, useEffect, useCallback, useMemo } from 'react';
import { useMotionValue, useSpring } from 'framer-motion';
import { useGlobalShortcut } from './useGlobalShortcut';
import { SHORTCUTS } from '../lib/constants';

const HORIZONTAL_MOVE_AMOUNT = 100;
const VERTICAL_SNAP_THRESHOLD = 0.33;

interface MovableWindowContextType {
    getX: () => number;
    setX: (x: number, jump?: boolean) => void;
    moveDrag: (x: number) => void;
    moveLeft: () => void;
    moveRight: () => void;
    onVDrag: (y: number, windowHeight: number) => void;
    onVDragStart: () => void;
    onVDragEnd: () => void;
    vOrientation: 'top' | 'bottom';
}

const MovableWindowContext = createContext<MovableWindowContextType | undefined>(undefined);

export function useMovableWindowApi() {
    const context = useContext(MovableWindowContext);
    if (context === undefined) {
        throw new Error('useMovableWindow must be used within a MovableWindowsProvider');
    }
    return context;
}

export function MovableWindowsProvider({ children }: {
    children: (props: {
        x: any;
        vOrientation: 'top' | 'bottom'
    }) => React.ReactNode
}) {
    const x = useMotionValue(0);
    const xSpring = useSpring(x, { stiffness: 300, damping: 30 });
    useEffect(() => {
        const unsubscribe = x.on('change', (latest) => {
            xSpring.set(latest);
        });
        return () => unsubscribe();
    }, [x, xSpring]);
    const [vOrientation, setVOrientation] = useState<'top' | 'bottom'>('top');
    const [vDragStartOrientation, setVDragStartOrientation] = useState<'top' | 'bottom' | null>(null);
    const onVDragStart = useCallback(() => {
        setVDragStartOrientation(vOrientation);
    }, [vOrientation]);
    const onVDragEnd = useCallback(() => {
        setVDragStartOrientation(null);
    }, []);
    const onVDrag = useCallback(
        (y: number, windowHeight: number) => {
            if (!vDragStartOrientation) return;
            const threshold = vDragStartOrientation === 'top'
                ? windowHeight * VERTICAL_SNAP_THRESHOLD
                : windowHeight * (1 - VERTICAL_SNAP_THRESHOLD);
            setVOrientation(y < threshold ? 'top' : 'bottom');
        },
        [vDragStartOrientation]
    );
    const [isBouncing, setIsBouncing] = useState(false);
    useEffect(() => {
        if (isBouncing) {
            const timeout = setTimeout(() => setIsBouncing(false), 300);
            return () => clearTimeout(timeout);
        }
    }, [isBouncing]);
    const setX = useCallback(
        (newX: number, jump = false) => {
            if (newX === 0 && x.get() !== 0) {
                setIsBouncing(true);
            }
            x.set(newX);
            if (jump) {
                xSpring.jump(newX);
            }
        },
        [x, xSpring]
    );
    const getX = useCallback(() => x.get(), [x]);
    const moveDrag = useCallback((newX: number) => setX(newX, true), [setX]);
    const moveLeft = useCallback(() => {
        setX(x.get() - HORIZONTAL_MOVE_AMOUNT);
    }, [x, setX]);
    const moveRight = useCallback(() => {
        setX(x.get() + HORIZONTAL_MOVE_AMOUNT);
    }, [x, setX]);
    const snapTop = useCallback(() => setVOrientation('top'), []);
    const snapBottom = useCallback(() => setVOrientation('bottom'), []);
    useGlobalShortcut(SHORTCUTS.MOVE_LEFT,
        moveLeft);
    useGlobalShortcut(SHORTCUTS.MOVE_RIGHT,
        moveRight);
    useGlobalShortcut(undefined, snapTop);
    useGlobalShortcut(undefined, snapBottom);
    const contextValue = useMemo(
        () => ({
            getX,
            setX,
            moveDrag,
            moveLeft,
            moveRight,
            onVDrag,
            onVDragStart,
            onVDragEnd,
            vOrientation,
        }),
        [getX, setX, moveDrag, moveLeft, moveRight, onVDrag, onVDragStart, onVDragEnd,
            vOrientation]
    );
    return (
        <MovableWindowContext.Provider value={contextValue}>
        {children({ x: xSpring, vOrientation })}
        <div className="w-0 h-full mx-auto border-l-2 border-dashed border-black/20 transition"/>
        </MovableWindowContext.Provider>
    );
}
