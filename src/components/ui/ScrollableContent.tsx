import { useState, useEffect, useRef, useCallback, ReactNode } from 'react';
import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';

// --- Custom Hooks ---
import { useGlobalShortcut } from '@/hooks/useGlobalShortcut';

// --- UI Components ---
import { Shortcut } from './Shortcut';

// --- Constants ---
const SCROLL_DEAD_ZONE_PX = 2;
const SCROLL_AMOUNT_PX = 300;
const SCROLL_INDICATOR_FADE_HEIGHT_PX = 100;
const SCROLL_INDICATOR_TIMEOUT_MS = 1500;

// --- Type Definitions ---

interface ScrollableContentProps {
  maxHeight: number;
  scrollDownAccelerator: string;
  scrollUpAccelerator: string;
  scrollToBottomKey?: any; // A key that, when changed, triggers a scroll to the bottom
  showAsTruncated?: boolean;
  className?: string;
  onScrollPastBottom?: () => void;
  onScrollPastTop?: () => void;
  children: ReactNode;
}

/**
 * A scrollable container with custom features like gradient fades,
 * keyboard shortcut scrolling, and boundary detection events.
 */
export function ScrollableContent({
  maxHeight,
  scrollDownAccelerator,
  scrollUpAccelerator,
  scrollToBottomKey,
  showAsTruncated = false,
  className,
  onScrollPastBottom,
  onScrollPastTop,
  children,
}: ScrollableContentProps) {
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const scrollTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // State to track scroll position and visibility of indicators
  const [isAtTop, setIsAtTop] = useState(true);
  const [isAtBottom, setIsAtBottom] = useState(false);
  const [isScrolling, setIsScrolling] = useState(false);
  const [showScrollIndicator, setShowScrollIndicator] = useState(false);
  const [canScroll, setCanScroll] = useState(false);

  // --- Scroll Position Checks ---

  const checkIsAtBottom = useCallback(() => {
    const el = scrollContainerRef.current;
    if (!el) return false;
    // Check if the user has scrolled to within a few pixels of the bottom
    return el.scrollTop + el.clientHeight >= el.scrollHeight - SCROLL_DEAD_ZONE_PX;
  }, []);

  const checkIsAtTop = useCallback(() => {
    const el = scrollContainerRef.current;
    if (!el) return false;
    // Check if the user is at the very top
    return el.scrollTop <= SCROLL_DEAD_ZONE_PX;
  }, []);

  const checkCanScroll = useCallback(() => {
    const el = scrollContainerRef.current;
    return el ? el.scrollHeight > el.clientHeight : false;
  }, []);

  // --- Scroll Handlers ---

  useGlobalShortcut(scrollDownAccelerator, () => {
    if (checkIsAtBottom()) {
      onScrollPastBottom?.();
    }
    scrollContainerRef.current?.scrollBy({ top: SCROLL_AMOUNT_PX, behavior: 'smooth' });
    setIsScrolling(true);
  });

  useGlobalShortcut(scrollUpAccelerator, () => {
    if (checkIsAtTop()) {
      onScrollPastTop?.();
    }
    scrollContainerRef.current?.scrollBy({ top: -SCROLL_AMOUNT_PX, behavior: 'smooth' });
    setIsScrolling(true);
  });

  const handleScroll = useCallback(() => {
    if (!scrollContainerRef.current) return;

    // Clear any existing timeout to reset the indicator visibility timer
    if (scrollTimeoutRef.current) {
      clearTimeout(scrollTimeoutRef.current);
      scrollTimeoutRef.current = null;
    }

    // Update state based on new scroll position
    setIsScrolling(true);
    setShowScrollIndicator(false);
    setIsAtTop(checkIsAtTop());
    setIsAtBottom(checkIsAtBottom());
    setCanScroll(checkCanScroll());

    // Set a new timeout to hide the scroll indicator after a delay
    scrollTimeoutRef.current = setTimeout(() => {
      setShowScrollIndicator(true);
    }, SCROLL_INDICATOR_TIMEOUT_MS);
  }, [checkIsAtTop, checkIsAtBottom, checkCanScroll]);

  // --- Effects ---

  // Effect to update scroll state when children change
  useEffect(() => {
    if (children) {
      setIsAtTop(checkIsAtTop());
      setIsAtBottom(checkIsAtBottom());
      setCanScroll(checkCanScroll());

      // Show scroll indicator if content can be scrolled and isn't currently scrolling
      if (checkCanScroll() && !isScrolling && !scrollTimeoutRef.current) {
        scrollTimeoutRef.current = setTimeout(() => {
          setShowScrollIndicator(true);
        }, SCROLL_INDICATOR_TIMEOUT_MS);
      }
    }
  }, [children, isScrolling, checkIsAtTop, checkIsAtBottom, checkCanScroll]);

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (scrollTimeoutRef.current) {
        clearTimeout(scrollTimeoutRef.current);
        scrollTimeoutRef.current = null;
      }
    };
  }, []);

  // Effect to scroll to the bottom when `scrollToBottomKey` changes
  const hasScrolledToBottomRef = useRef(true);
  useEffect(() => {
    if (scrollToBottomKey != null) {
      scrollContainerRef.current?.scrollTo({
        top: scrollContainerRef.current.scrollHeight,
        behavior: hasScrolledToBottomRef.current ? 'auto' : 'smooth',
      });
    }
    // Set to false after the initial auto-scroll
    hasScrolledToBottomRef.current = false;
  }, [scrollToBottomKey]);

  return (
    <div className="relative">
      {/* Top gradient fade */}
      <div
        className="transition-all duration-150"
        style={{
          WebkitMaskImage: isAtTop
            ? `linear-gradient(to top, black calc(100% - 0px), transparent 100%)`
            : `linear-gradient(to top, black calc(100% - ${SCROLL_INDICATOR_FADE_HEIGHT_PX}px), transparent 100%)`,
        }}
      >
        {/* Bottom gradient fade */}
        <div
          className="transition-all duration-150"
          style={{
            WebkitMaskImage: isAtBottom && !showAsTruncated
              ? `linear-gradient(to bottom, black calc(100% - 0px), transparent 100%)`
              : `linear-gradient(to bottom, black calc(100% - ${SCROLL_INDICATOR_FADE_HEIGHT_PX}px), transparent 100%)`,
          }}
        >
          <div
            ref={scrollContainerRef}
            onScroll={handleScroll}
            className={cn(
              'px-4 [scrollbar-gutter:stable] overflow-auto scrollbar-thin scrollbar-track-transparent scrollbar-thumb-white/50',
              className
            )}
            style={{ maxHeight }}
          >
            {children}
          </div>
        </div>
      </div>

      {/* Floating scroll indicator */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{
          opacity: !isScrolling && showScrollIndicator && canScroll ? 1 : 0,
          y: !isScrolling && showScrollIndicator && canScroll ? 0 : 10,
        }}
        transition={{ duration: 0.3 }}
        className="absolute bottom-2 left-1/2 -translate-x-1/2 bg-white/10 backdrop-blur-sm rounded-lg px-3 py-2 text-xs text-white/70 pointer-events-none"
      >
        <span className="flex flex-row gap-1 items-center">
          {scrollDownAccelerator && (
            <span className="flex items-center gap-2 ">
              <Shortcut label={<span>More Content</span>} accelerator={scrollDownAccelerator} />
            </span>
          )}
        </span>
      </motion.div>
    </div>
  );
}