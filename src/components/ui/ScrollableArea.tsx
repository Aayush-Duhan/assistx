import React, { useState, useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';
import { useGlobalShortcut } from '@/hooks/useGlobalShortcut';

// Type definitions
interface ScrollableAreaProps {
    maxHeight?: string | number;
    scrollDownAccelerator?: string;
    scrollUpAccelerator?: string;
    scrollToBottomKey?: any;
    showAsTruncated?: boolean;
    className?: string;
    onScrollPastBottom?: () => void;
    onScrollPastTop?: () => void;
    children: React.ReactNode;
}

const SCROLL_AMOUNT = 300;
const FADE_HEIGHT = 100; // Height of the gradient fade in pixels

/**
 * A scrollable container with visual indicators for scrollable content
 * and support for keyboard shortcuts.
 */
export function ScrollableArea({
    maxHeight,
    scrollDownAccelerator,
    scrollUpAccelerator,
    scrollToBottomKey,
    showAsTruncated = false,
    className,
    onScrollPastBottom,
    onScrollPastTop,
    children
}: ScrollableAreaProps): React.ReactElement {
    const scrollRef = useRef<HTMLDivElement>(null);
    const [isAtTop, setIsAtTop] = useState(false);
    const [isAtBottom, setIsAtBottom] = useState(false);

    const isScrolledToBottom = (): boolean => {
        const el = scrollRef.current;
        return !!el && el.scrollTop + el.clientHeight >= el.scrollHeight - 2;
    };

    const isScrolledToTop = (): boolean => {
        const el = scrollRef.current;
        return !!el && el.scrollTop <= 2;
    };

    // Register global keyboard shortcuts for scrolling.
    useGlobalShortcut(scrollDownAccelerator, () => {
        if (isScrolledToBottom()) {
            onScrollPastBottom?.();
        }
        scrollRef.current?.scrollBy({ top: SCROLL_AMOUNT, behavior: 'smooth' });
    });

    useGlobalShortcut(scrollUpAccelerator, () => {
        if (isScrolledToTop()) {
            onScrollPastTop?.();
        }
        scrollRef.current?.scrollBy({ top: -SCROLL_AMOUNT, behavior: 'smooth' });
    });

    // Function to update the top/bottom state based on scroll position.
    const updateScrollState = (): void => {
        const el = scrollRef.current;
        if (el) {
            setIsAtTop(el.scrollTop <= 2);
            setIsAtBottom(el.scrollTop + el.clientHeight >= el.scrollHeight - 2);
        }
    };

    // Check scroll state on mount and on resize/content change.
    useEffect(() => {
        updateScrollState();
    });

    // Scroll to the bottom when the `scrollToBottomKey` changes.
    const hasScrolledToBottomRef = useRef(true);
    useEffect(() => {
        if (scrollToBottomKey != null && scrollRef.current) {
            scrollRef.current.scrollTo({
                top: scrollRef.current.scrollHeight,
                behavior: hasScrolledToBottomRef.current ? 'auto' : 'smooth',
            });
        }
        hasScrolledToBottomRef.current = false;
    }, [scrollToBottomKey]);

    return (
        // Top fade effect
        <motion.div
            animate={{
                WebkitMaskImage: isAtTop
                    ? `linear-gradient(to top, black calc(100% - 0px), transparent 100%)`
                    : `linear-gradient(to top, black calc(100% - ${FADE_HEIGHT}px), transparent 100%)`
            }}
            transition={{ duration: 0.15 }}
        >
            {/* Bottom fade effect */}
            <motion.div
                animate={{
                    WebkitMaskImage: (isAtBottom && !showAsTruncated)
                        ? `linear-gradient(to bottom, black calc(100% - 0px), transparent 100%)`
                        : `linear-gradient(to bottom, black calc(100% - ${FADE_HEIGHT}px), transparent 100%)`
                }}
                transition={{ duration: 0.15 }}
            >
                <div
                    ref={scrollRef}
                    onScroll={updateScrollState}
                    className={cn(
                        "px-4 [scrollbar-gutter:stable] overflow-auto",
                        "scrollbar-thin scrollbar-track-transparent scrollbar-thumb-white/50",
                        className
                    )}
                    style={{ maxHeight }}
                >
                    {children}
                </div>
            </motion.div>
        </motion.div>
    );
} 