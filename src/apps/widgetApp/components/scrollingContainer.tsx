import { LuArrowDown } from "react-icons/lu";
import {
  AnimatePresence,
  motion,
  useMotionTemplate,
  useMotionValue,
  useTransform,
} from "motion/react";
import type React from "react";
import { createContext, useCallback, useEffect, useRef, useState } from "react";
import { twMerge } from "tailwind-merge";
import { useGlobalShortcut } from "@/hooks/useGlobalShortcut";

const NEAR_EDGE_SCROLL_BUFFER = 32;
const SCROLL_DY = 100; // how much to scroll by per shortcut
const GRADIENT_HEIGHT = 48;

function findNextMessageBlock(
  container: HTMLDivElement,
  direction: "up" | "down",
): HTMLElement | null {
  const messageBlocks = Array.from(container.querySelectorAll<HTMLElement>("[data-message-block]"));

  if (messageBlocks.length === 0) return null;

  const scrollTop = container.scrollTop;
  const viewportBottom = scrollTop + container.clientHeight;

  if (direction === "down") {
    for (const block of messageBlocks) {
      const blockTop = block.offsetTop;
      const blockBottom = blockTop + block.clientHeight;
      if (blockBottom > viewportBottom && blockTop > scrollTop + 5) {
        return block;
      }
    }
    return null;
  } else {
    let lastBlockAbove: HTMLElement | null = null;

    for (const block of messageBlocks) {
      const blockTop = block.offsetTop;

      if (blockTop < scrollTop - 5) {
        lastBlockAbove = block;
      } else {
        break;
      }
    }

    return lastBlockAbove;
  }
}

function scrollToMessageBlock(container: HTMLDivElement, block: HTMLElement): void {
  const containerRect = container.getBoundingClientRect();
  const blockRect = block.getBoundingClientRect();

  const currentScrollTop = container.scrollTop;
  const blockTopRelativeToContainer = blockRect.top - containerRect.top + currentScrollTop;

  const targetScrollTop = blockTopRelativeToContainer;

  container.scrollTo({
    top: targetScrollTop,
    behavior: "smooth",
  });
}

const ScrollingContainerNotifyContentUpdatedContext = createContext<() => void>(() => undefined);

export function ScrollingContainer({
  ref,
  className,
  scrollDownAccelerator,
  scrollUpAccelerator,
  enableSnapToBottom = false,
  snapToBottomKey,
  onScrollPastBottom,
  onScrollPastTop,
  children,
}: {
  ref?: React.RefObject<HTMLDivElement | null>;
  className?: string;
  scrollDownAccelerator?: string;
  scrollUpAccelerator?: string;
  enableSnapToBottom?: boolean;
  snapToBottomKey?: string | number;
  onScrollPastBottom?: () => void;
  onScrollPastTop?: () => void;
  children?: React.ReactNode;
}) {

  const divRef = useRef<HTMLDivElement>(null);

  const { isNearTop, isNearBottom, bottomEdgeDistance, notifyContentUpdated } = useScroll(divRef);
  const { snapToBottom, cancelSnapToBottom } = useSnapToBottom(
    divRef,
    enableSnapToBottom,
    isNearBottom,
    snapToBottomKey,
  );

  useGlobalShortcut(scrollDownAccelerator, () => {
    if (!divRef.current) return;

    if (isNearBottom) {
      onScrollPastBottom?.();
      return;
    }

    const nextBlock = findNextMessageBlock(divRef.current, "down");
    if (nextBlock) {
      scrollToMessageBlock(divRef.current, nextBlock);
    } else {
      divRef.current?.scrollBy({ top: SCROLL_DY, behavior: "smooth" });
    }
  });

  useGlobalShortcut(scrollUpAccelerator, () => {
    if (!divRef.current) return;

    cancelSnapToBottom();

    if (isNearTop) {
      onScrollPastTop?.();
      return;
    }

    const nextBlock = findNextMessageBlock(divRef.current, "up");
    if (nextBlock) {
      scrollToMessageBlock(divRef.current, nextBlock);
    } else {
      divRef.current?.scrollBy({ top: -SCROLL_DY, behavior: "smooth" });
    }
  });

  const bottomGradientHeight = useTransform(
    bottomEdgeDistance,
    [0, NEAR_EDGE_SCROLL_BUFFER],
    [0, GRADIENT_HEIGHT],
  );

  // build mask images from heights
  const maskStyle = useMotionTemplate`linear-gradient(to bottom, black calc(100% - ${bottomGradientHeight}px), transparent 100%)`;

  return (
    <ScrollingContainerNotifyContentUpdatedContext value={notifyContentUpdated}>
      <div className="relative h-full overflow-hidden">
        <motion.div
          className="h-full"
          style={{
            WebkitMaskImage: maskStyle,
            maskImage: maskStyle,
          }}
        >
          <div
            ref={(node) => {
              divRef.current = node;
              if (ref) {
                ref.current = node;
              }
            }}
            // make the scrollbar always reserve 8px of space to the right
            className={twMerge(
              "h-full px-4 [scrollbar-gutter:stable] overflow-auto scrollbar-thin scrollbar-track-transparent scrollbar-thumb-transparent hover:scrollbar-thumb-white/30",
              className,
            )}
          >
            {children}
          </div>
        </motion.div>

        <ViewLatest showViewLatest={!isNearBottom} onViewLatest={snapToBottom} />
      </div>
    </ScrollingContainerNotifyContentUpdatedContext>
  );
}

function ViewLatest({
  showViewLatest,
  onViewLatest,
}: {
  showViewLatest: boolean;
  onViewLatest: () => void;
}) {
  return (
    <div className="absolute bottom-3 right-3">
      <AnimatePresence mode="wait">
        {showViewLatest && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 10 }}
            transition={{ type: "spring", stiffness: 400, damping: 35 }}
            onClick={onViewLatest}
            className="flex backdrop-blur-md justify-center items-center size-6 text-white bg-surface-action shadow-pane-action hover:bg-surface-action-hover rounded-full"
          >
            <LuArrowDown className="size-4" />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function useScroll(divRef: React.RefObject<HTMLDivElement | null>) {
  const [isNearTop, setIsNearTop] = useState(true);
  const [isNearBottom, setIsNearBottom] = useState(true);
  const topEdgeDistance = useMotionValue<number>(NEAR_EDGE_SCROLL_BUFFER);
  const bottomEdgeDistance = useMotionValue<number>(NEAR_EDGE_SCROLL_BUFFER);

  const updateScrollState = useCallback(
    (div: HTMLDivElement) => {
      const distanceTop = Math.max(0, Math.min(div.scrollTop, NEAR_EDGE_SCROLL_BUFFER));
      const distanceBottom = Math.max(
        0,
        Math.min(div.scrollHeight - (div.scrollTop + div.clientHeight), NEAR_EDGE_SCROLL_BUFFER),
      );
      topEdgeDistance.set(distanceTop);
      bottomEdgeDistance.set(distanceBottom);
      setIsNearTop(distanceTop <= 0);
      setIsNearBottom(distanceBottom <= 2);
    },
    [topEdgeDistance, bottomEdgeDistance],
  );

  const notifyContentUpdated = useCallback(() => {
    if (divRef.current) {
      updateScrollState(divRef.current);
    }
  }, [divRef, updateScrollState]);

  // runs EVERY RENDER
  useEffect(() => {
    notifyContentUpdated();
  });

  useEffect(() => {
    const div = divRef.current;
    if (!div) return;

    const handleScroll = () => {
      updateScrollState(div);
    };

    div.addEventListener("scroll", handleScroll);
    return () => div.removeEventListener("scroll", handleScroll);
  }, [divRef, updateScrollState]);

  return { isNearTop, isNearBottom, topEdgeDistance, bottomEdgeDistance, notifyContentUpdated };
}

function useSnapToBottom(
  divRef: React.RefObject<HTMLDivElement | null>,
  enableSnapToBottom: boolean,
  isNearBottom: boolean,
  snapToBottomKey?: string | number,
) {
  const [isSnappedToBottom, setIsSnappedToBottom] = useState(false);
  const [tempBlockSnapToBottom, setTempBlockSnapToBottom] = useState(false);

  const cancelSnapToBottom = useCallback(() => {
    setIsSnappedToBottom(false);
    setTempBlockSnapToBottom(true);
  }, []);

  useEffect(() => {
    if (enableSnapToBottom && isNearBottom && !isSnappedToBottom && !tempBlockSnapToBottom) {
      setIsSnappedToBottom(true);
    }
  }, [enableSnapToBottom, isNearBottom, isSnappedToBottom, tempBlockSnapToBottom]);

  useEffect(() => {
    if (enableSnapToBottom && snapToBottomKey != null) {
      setIsSnappedToBottom(true);
    }
  }, [enableSnapToBottom, snapToBottomKey]);

  useEffect(() => {
    const div = divRef.current;
    if (!div) return;

    let lastScrollTop = div.scrollTop;

    // upon scrolling up, set isSnappedToBottom to false
    const handleScroll = () => {
      if (div.scrollTop < lastScrollTop) {
        cancelSnapToBottom();
      }
      lastScrollTop = div.scrollTop;
    };

    div.addEventListener("scroll", handleScroll);
    return () => div.removeEventListener("scroll", handleScroll);
  }, [divRef, cancelSnapToBottom]);

  const [isSmoothScrolling, setIsSmoothScrolling] = useState(false);

  // snap to bottom smoothly when isSnappedToBottom toggles to true
  useEffect(() => {
    if (isSnappedToBottom) {
      divRef.current?.scrollTo({
        top: divRef.current.scrollHeight,
        behavior: "smooth",
      });
    }
  }, [isSnappedToBottom, divRef]);

  // snap to bottom instantly EVERY RENDER, unless in an animated scroll state
  useEffect(() => {
    if (isSnappedToBottom && !isSmoothScrolling) {
      divRef.current?.scrollTo({
        top: divRef.current.scrollHeight,
        behavior: "instant",
      });
    }
  });

  useEffect(() => {
    if (isSmoothScrolling) {
      const timeout = setTimeout(() => {
        setIsSmoothScrolling(false);
      }, 300); // duration of the smooth scroll
      return () => clearTimeout(timeout);
    }
  }, [isSmoothScrolling]);

  useEffect(() => {
    if (tempBlockSnapToBottom) {
      const timeout = setTimeout(() => {
        setTempBlockSnapToBottom(false);
      }, 300);
      return () => clearTimeout(timeout);
    }
  }, [tempBlockSnapToBottom]);

  const snapToBottom = useCallback(() => {
    setIsSnappedToBottom(true);
    setIsSmoothScrolling(true);
  }, []);

  return { isSnappedToBottom, snapToBottom, cancelSnapToBottom };
}
