import React, { useRef, useState, useEffect, useCallback, RefObject, createContext } from "react";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";
import { useGlobalShortcut } from "../../hooks/useGlobalShortcut";

const SCROLL_DEAD_ZONE = 5;
const SCROLL_AMOUNT = 300;
const ScrollNotificationContext = createContext<() => void>(() => {});

function useScrollPosition(ref: React.RefObject<HTMLDivElement>) {
  const [isNearTop, setIsNearTop] = useState(true);
  const [isNearBottom, setIsNearBottom] = useState(true);

  const updateScrollPosition = useCallback((element: HTMLDivElement) => {
    setIsNearTop(element.scrollTop <= SCROLL_DEAD_ZONE);
    setIsNearBottom(element.scrollTop + element.clientHeight >= element.scrollHeight - SCROLL_DEAD_ZONE);
  }, []);

  useEffect(() => {
    if (ref.current) {
      updateScrollPosition(ref.current);
    }
  }, [ref, updateScrollPosition]);

  const notifyContentUpdated = useCallback(() => {
    if (ref.current) {
      updateScrollPosition(ref.current);
    }
  }, [ref, updateScrollPosition]);

  useEffect(() => {
    notifyContentUpdated();
  }, [notifyContentUpdated]);

  useEffect(() => {
    const element = ref.current;
    if (!element) return;
    const handleScroll = () => {
      updateScrollPosition(element);
    };
    element.addEventListener("scroll", handleScroll);
    return () => element.removeEventListener("scroll", handleScroll);
  }, [ref, updateScrollPosition]);

  return { isNearTop, isNearBottom, notifyContentUpdated };
}
export function ScrollableContent({
  className,
  maxHeight,
  scrollDownAccelerator,
  scrollUpAccelerator,
  enableSnapToBottom = false,
  showBottomActions = true,
  showAsTruncated = false,
  snapToBottomKey,
  onScrollPastBottom,
  onScrollPastTop,
  children,
  bottomActions
}: {
  className?: string;
  maxHeight: number;
  scrollDownAccelerator?: string;
  scrollUpAccelerator?: string;
  enableSnapToBottom?: boolean;
  showBottomActions?: boolean;
  showAsTruncated?: boolean;
  snapToBottomKey?: any;
  onScrollPastBottom?: () => void;
  onScrollPastTop?: () => void;
  children: React.ReactNode;
  bottomActions?: React.ReactNode;
}) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const { isNearTop, isNearBottom, notifyContentUpdated } =
    useScrollPosition(scrollRef);
  const {
    isSnappedToBottom,
    snapToBottom,
    cancelSnapToBottom
  } = useSnapToBottom(scrollRef, enableSnapToBottom, isNearBottom, snapToBottomKey);

  useGlobalShortcut(scrollDownAccelerator ?? 'CommandOrControl+Down', () => {
    if (isNearBottom && onScrollPastBottom) {
      onScrollPastBottom();
    }
    scrollRef.current?.scrollBy({ top: SCROLL_AMOUNT, behavior: "smooth" });
  });

  useGlobalShortcut(scrollUpAccelerator ?? 'CommandOrControl+Up', () => {
    cancelSnapToBottom();
    if (isNearTop && onScrollPastTop) {
      onScrollPastTop();
    }
    scrollRef.current?.scrollBy({ top: -SCROLL_AMOUNT, behavior: "smooth" });
  });

  return (
    <ScrollNotificationContext.Provider value={notifyContentUpdated}>
    <div className="relative">
      <motion.div
        animate={{
          maskImage: isNearTop
            ? "linear-gradient(to top, black calc(100% - 0px), transparent 100%)"
            : `linear-gradient(to top, black calc(100% - 100px), transparent 100%)`,
        }}
        transition={{ duration: 0.15 }}
      >
        <motion.div
          animate={{
            maskImage:
              (isNearBottom || isSnappedToBottom) && !showAsTruncated
                ? "linear-gradient(to bottom, black calc(100% - 0px), transparent 100%)"
                : `linear-gradient(to bottom, black calc(100% - 100px), transparent 100%)`,
          }}
          transition={{ duration: 0.15 }}
        >
          <div
            ref={scrollRef}
            className={cn(
              "px-4 [scrollbar-gutter:stable] overflow-auto scrollbar-thin scrollbar-track-transparent scrollbar-thumb-white/50",
              className
            )}
            style={{ maxHeight }}
          >
            {children}
          </div>
        </motion.div>
      </motion.div>
      <BottomActions
        showViewLatest={enableSnapToBottom && !isNearBottom && !isSnappedToBottom}
        showBottomActions={showBottomActions}
        bottomActions={bottomActions}
        onViewLatest={snapToBottom}
      />
    </div>
    </ScrollNotificationContext.Provider>
  );
}

interface BottomActionsProps {
  showViewLatest: boolean;
  showBottomActions: boolean;
  bottomActions?: React.ReactNode;
  onViewLatest: () => void;
}

function BottomActions({ showViewLatest, showBottomActions, bottomActions, onViewLatest }: BottomActionsProps) {
  return (
    <div className="absolute bottom-1 left-1/2 -translate-x-1/2">
      <motion.div>
        {showViewLatest ? (
          <motion.div key="view-latest">
            <button
              onClick={onViewLatest}
              className="px-3 py-1 bg-blue-500 text-white rounded-md text-sm hover:bg-blue-600 transition-colors"
            >
              View Latest
            </button>
          </motion.div>
        ) : showBottomActions ? (
          <motion.div key="bottom-actions">
            {bottomActions}
          </motion.div>
        ) : null}
      </motion.div>
    </div>
  );
}

function useSnapToBottom(
  scrollRef: RefObject<HTMLDivElement>,
  enabled: boolean,
  isNearBottom: boolean,
  snapTriggerKey: string
) {
  const [isSnapped, setIsSnapped] = useState(false);
  const [hasUserScrolled, setHasUserScrolled] = useState(false);

  const cancelSnapToBottom = useCallback(() => {
    setIsSnapped(false);
    setHasUserScrolled(true);
  }, []);

  // Auto-snap logic
  useEffect(() => {
    if (enabled && isNearBottom && !isSnapped && !hasUserScrolled) {
      setIsSnapped(true);
    }
  }, [enabled, isNearBottom, isSnapped, hasUserScrolled]);

  // Force snap when trigger key changes
  useEffect(() => {
    if (enabled && snapTriggerKey != null) {
      setIsSnapped(true);
    }
  }, [enabled, snapTriggerKey]);

  // Scroll detection
  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    let lastScrollTop = el.scrollTop;
    const handleScroll = () => {
      if (el.scrollTop < lastScrollTop) {
        cancelSnapToBottom();
      }
      lastScrollTop = el.scrollTop;
    };
    el.addEventListener('scroll', handleScroll);
    return () => el.removeEventListener('scroll', handleScroll);
  }, [scrollRef, cancelSnapToBottom]);

  const [isInitialSnapInProgress, setIsInitialSnapInProgress] = useState(false);

  // Smooth scroll to bottom
  useEffect(() => {
    if (isSnapped) {
      scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' });
    }
  }, [isSnapped, scrollRef]);

  // Instant scroll to bottom
  useEffect(() => {
    if (isSnapped && !isInitialSnapInProgress) {
      scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'instant' as ScrollBehavior });
      setIsInitialSnapInProgress(true);
    }
  }, [isSnapped, isInitialSnapInProgress, scrollRef]);

  // Reset initial snap flag
  useEffect(() => {
    if (isInitialSnapInProgress) {
      const timeout = setTimeout(() => setIsInitialSnapInProgress(false), 300);
      return () => clearTimeout(timeout);
    }
  }, [isInitialSnapInProgress]);

  // Reset user scrolled flag
  useEffect(() => {
    if (hasUserScrolled) {
      const timeout = setTimeout(() => setHasUserScrolled(false), 300);
      return () => clearTimeout(timeout);
    }
  }, [hasUserScrolled]);

  const snapToBottom = useCallback(() => {
    setIsSnapped(true);
    setIsInitialSnapInProgress(true);
  }, []);

  return {
    isSnappedToBottom: isSnapped,
    snapToBottom,
    cancelSnapToBottom
  };
}