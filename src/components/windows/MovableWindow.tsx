import { ReactNode, ReactElement, createElement } from 'react';
import { motion } from 'framer-motion';
import { Portal } from '../Portal'; 

const BOUNCE_ANIMATION_MS = 250;

// Type definitions
type BounceDirection = 'up' | 'down' | null;

interface MovableWindowProps {
    show?: boolean;
    bounceDirection?: BounceDirection;
    children: ReactNode;
    width?: number;
    height?: number;
    className?: string;
    contentClassName?: string;
    title?: string;
    transparent?: boolean;
    opaque?: boolean;
}

/**
 * A window component that can be moved horizontally along with other movable windows.
 * It also supports a "bounce" animation to indicate the user has reached the end of a list.
 */
export function MovableWindow({ 
    show = true, 
    bounceDirection, 
    children,
    transparent,
    opaque,
    ...restProps 
}: MovableWindowProps): ReactElement {
    // The bounce animation is a simple up/down movement.
    const yAnimation = bounceDirection === 'up'
        ? [0, -10, 0]
        : bounceDirection === 'down'
        ? [0, 10, 0]
        : 0;

    return createElement(
        Portal.Movable,
        { 
            transparent,
            opaque,
            show,
            bounceDirection: bounceDirection === null ? undefined : bounceDirection,
            captureMouseEvents: true,
            ...restProps,
            children: createElement(
                motion.div,
                {
                    animate: { y: yAnimation },
                    transition: { ease: "easeInOut", duration: BOUNCE_ANIMATION_MS / 1000 }
                },
                children
            )
        }
    );
} 