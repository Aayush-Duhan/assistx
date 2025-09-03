import { Shortcut } from "./Shortcut";
import React, { useRef, useState, useEffect, useCallback } from "react";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";
import { useGlobalShortcut } from "../../hooks/useGlobalShortcut";

const SCROLL_DEAD_ZONE = 5;
const SCROLL_AMOUNT = 300;
const SCROLL_HINT_DELAY = 1500;

function useShowHint(hasScrollableContent: boolean) {
  const [showHint, setShowHint] = useState(false);
  useEffect(() => {
    if (hasScrollableContent) {
      const timeout = setTimeout(() => {
        setShowHint(true);
      }, SCROLL_HINT_DELAY);
      return () => clearTimeout(timeout);
    }
  }, [hasScrollableContent]);
  return showHint;
}

function useScrollPosition(ref: React.RefObject<HTMLDivElement>) {
  const [isNearTop, setIsNearTop] = useState(true);
  const [isNearBottom, setIsNearBottom] = useState(true);
  const [hasScrolled, setHasScrolled] = useState(false);
  const hasScrollableContent = !isNearTop || !isNearBottom;

  const updateScrollPosition = useCallback((el: HTMLDivElement) => {
    setIsNearTop(el.scrollTop <= SCROLL_DEAD_ZONE);
    setIsNearBottom(
      el.scrollTop + el.clientHeight >= el.scrollHeight - SCROLL_DEAD_ZONE
    );
  }, []);

  useEffect(() => {
    if (ref.current) {
      updateScrollPosition(ref.current);
    }
  }, [ref, updateScrollPosition]);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const handleScroll = () => {
      updateScrollPosition(el);
      setHasScrolled(true);
    };
    el.addEventListener("scroll", handleScroll);
    return () => el.removeEventListener("scroll", handleScroll);
  }, [ref, updateScrollPosition]);

  return { isNearTop, isNearBottom, hasScrolled, hasScrollableContent };
}
export function ScrollableContent({
  className,
  maxHeight,
  scrollDownAccelerator,
  scrollUpAccelerator,
  enableSnapToBottom = false,
  showAsTruncated = false,
  showScrollDownShortcutHint = false,
  onScrollPastBottom,
  onScrollPastTop,
  children,
}: {
  className?: string;
  maxHeight: number;
  scrollDownAccelerator?: string;
  scrollUpAccelerator?: string;
  enableSnapToBottom?: boolean;
  showAsTruncated?: boolean;
  showScrollDownShortcutHint?: boolean;
  onScrollPastBottom?: () => void;
  onScrollPastTop?: () => void;
  children: React.ReactNode;
}) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const { isNearTop, isNearBottom, hasScrolled, hasScrollableContent } =
    useScrollPosition(scrollRef);
  const { isSnappedToBottom, snapToBottom } = useSnapToBottom(
    scrollRef,
    enableSnapToBottom,
    isNearBottom
  );
  const showScrollHint = useShowHint(hasScrollableContent);

  useGlobalShortcut(scrollDownAccelerator ?? 'CommandOrControl+Down', () => {
    if (isNearBottom) {
      onScrollPastBottom?.();
    }
    scrollRef.current?.scrollBy({ top: SCROLL_AMOUNT, behavior: "smooth" });
  });

  useGlobalShortcut(scrollUpAccelerator ?? 'CommandOrControl+Up', () => {
    if (isNearTop) {
      onScrollPastTop?.();
    }
    scrollRef.current?.scrollBy({ top: -SCROLL_AMOUNT, behavior: "smooth" });
  });

  return (
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
      {showScrollDownShortcutHint && (
        <ScrollHint
          show={!hasScrolled && showScrollHint}
          scrollDownAccelerator={scrollDownAccelerator ?? 'CommandOrControl+Down'}
        />
      )}
      {enableSnapToBottom && (
        <SnapToBottomButton show={!isSnappedToBottom} onTrigger={snapToBottom} />
      )}
    </div>
  );
}

const ScrollHint = ({ show, scrollDownAccelerator }: { show: boolean, scrollDownAccelerator: string }) => (
  <Hint show={show} label="More Content" accelerator={scrollDownAccelerator} onTrigger={() => {}} />
);

const Hint = ({ show, label, accelerator, onTrigger }: { show: boolean, label: string, accelerator?: string, onTrigger: () => void }) => (
  <motion.div
    initial={{ opacity: 0, y: 10 }}
    animate={{ opacity: show ? 1 : 0, y: show ? 0 : 10 }}
    transition={{ duration: 0.3 }}
    className={cn(
      "absolute bottom-2 left-1/2 -translate-x-1/2 bg-white/10 backdrop-blur-sm rounded-lg px-3 py-2 text-xs text-white/70",
      !onTrigger && 'pointer-events-none',
      !show && 'pointer-events-none'
    )}
  >
    <Shortcut label={label} accelerator={accelerator} onTrigger={onTrigger} />
  </motion.div>
);

const SnapToBottomButton = ({ show, onTrigger }: { show: boolean, onTrigger: () => void }) => (
  <Hint show={show} label="View Latest" onTrigger={onTrigger} />
);

function useSnapToBottom(scrollRef: React.RefObject<HTMLDivElement>, enabled: boolean, isNearBottom: boolean) {
  const [isSnapped, setIsSnapped] = useState(false);
  if (enabled && isNearBottom && !isSnapped) {
    setIsSnapped(true);
  }

  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    let lastScrollTop = el.scrollTop;
    const handleScroll = () => {
      if (el.scrollTop < lastScrollTop) {
        setIsSnapped(false);
      }
      lastScrollTop = el.scrollTop;
    };
    el.addEventListener('scroll', handleScroll);
    return () => el.removeEventListener('scroll', handleScroll);
  }, [scrollRef]);

  const [isSnapping, setIsSnapping] = useState(false);
  useEffect(() => {
    if (isSnapped) {
      scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' });
    }
  }, [isSnapped, scrollRef]);

  useEffect(() => {
    if (isSnapped && !isSnapping) {
      scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'instant' });
    }
  });

  useEffect(() => {
    if (isSnapping) {
      const timeout = setTimeout(() => setIsSnapping(false), 300);
      return () => clearTimeout(timeout);
    }
  }, [isSnapping]);

  const snapToBottom = useCallback(() => {
    setIsSnapped(true);
    setIsSnapping(true);
  }, []);

  return { isSnappedToBottom: isSnapped, snapToBottom };
}