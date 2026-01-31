import { animate, motion, type Transition, useDragControls, useMotionValue } from "framer-motion";
import { useCallback, useEffect, useRef } from "react";
import { CHAT_INPUT_CONTAINER_ID } from "../chat/chatContent";
import { useResizeObserver } from "../hooks/useObserver";
import { CaptureMouseEventsWrapper } from "@/components/captureMouseEventsWrapper";
import { WIDGET_LOCAL_STORAGE_KEYS } from "@/state/settings";

const INITIAL_HEIGHT = 450;
const MIN_HEIGHT = 350;

const DEFAULT_TRANSITION: Transition = {
  type: "spring",
  damping: 30,
  stiffness: 300,
};

export function VerticalResizeContainer({
  allowResize,
  children,
}: {
  allowResize: boolean;
  children: React.ReactNode;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const MAX_HEIGHT = window.innerHeight * 0.8;

  const height = useMotionValue(getStoredHeight() ?? INITIAL_HEIGHT);

  // Source of truth function for setting the height
  const setRecalculatedHeight = useCallback(
    (curHeight: number) => {
      const maxHeight = Math.min(MAX_HEIGHT, window.innerHeight * 0.8);

      if (curHeight < MIN_HEIGHT) {
        curHeight = MIN_HEIGHT;
      }
      if (maxHeight > MIN_HEIGHT && curHeight > maxHeight) {
        curHeight = maxHeight;
      }
      height.set(curHeight);

      const chatInputHeight = getChatInputHeight();
      if (containerRef.current) {
        containerRef.current.style.setProperty("--height", `${curHeight - chatInputHeight - 7}px`);
      }
      localStorage.setItem(WIDGET_LOCAL_STORAGE_KEYS.HEIGHT, curHeight.toString());
    },
    [MAX_HEIGHT, height],
  );

  useEffect(() => {
    setRecalculatedHeight(height.get());
  }, [height, setRecalculatedHeight]);

  const onObservedResize = useCallback(
    (_: Element) => {
      const curHeight = containerRef.current?.clientHeight ?? 0;
      setRecalculatedHeight(curHeight - 7);
    },
    [setRecalculatedHeight],
  );

  // Observe chat header and input size changes
  useResizeObserver(onObservedResize, `#${CHAT_INPUT_CONTAINER_ID}`, allowResize);

  const dragControls = useDragControls();

  return (
    <div ref={containerRef} className="relative group">
      {children}
      {allowResize && (
        <motion.div
          className="absolute top-0 left-0 right-0 h-5 mt-1 group/verticalresize"
          style={{
            y: height,
            x: 0,
          }}
          dragControls={dragControls}
          drag="y"
          dragMomentum={false}
          onDrag={() => setRecalculatedHeight(height.get())}
          dragTransition={{ bounceStiffness: 0, bounceDamping: 0 }}
          onDoubleClick={() =>
            animate(height, INITIAL_HEIGHT, {
              ...DEFAULT_TRANSITION,
              onUpdate: (value) => setRecalculatedHeight(value),
            })
          }
        >
          {/* the 1px vertical padding is needed because the cursor only shows when the
          mouse is already being captured before entering the bounding box */}
          <CaptureMouseEventsWrapper className="w-full h-full py-px">
            <div className="w-full h-full cursor-ns-resize flex flex-col items-center justify-start">
              <div className="rounded-full bg-neutral-500/50 h-1.5 w-[50px] opacity-0 group-hover/verticalresize:opacity-100 transition-opacity duration-150 mt-2" />
            </div>
          </CaptureMouseEventsWrapper>
        </motion.div>
      )}
    </div>
  );
}

function getStoredHeight() {
  const strHeight = localStorage.getItem(WIDGET_LOCAL_STORAGE_KEYS.HEIGHT);
  return strHeight ? Number(strHeight) : null;
}

function getChatInputHeight() {
  const chatInput = document.getElementById(CHAT_INPUT_CONTAINER_ID);
  return chatInput ? chatInput.clientHeight : 0;
}
