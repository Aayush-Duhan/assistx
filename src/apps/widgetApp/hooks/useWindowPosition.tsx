import { invokeIpcMain, useIpcRendererHandler } from "@/shared";
import {
  animate,
  type DragControls,
  type MotionValue,
  type Transition,
  useDragControls,
  useMotionValue,
} from "motion/react";
import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { useGlobalShortcut } from "@/hooks/useGlobalShortcut";
import { useKeybindings } from "@/hooks/useKeybindings";
import { isWin } from "@/lib/platform";
import { WIDGET_LOCAL_STORAGE_KEYS } from "@/state/settings";

type WindowPositionContext = {
  x: MotionValue<number>;
  y: MotionValue<number>;
  handleDragStart: () => void;
  handleDragEnd: () => void;
  dragControls: DragControls;
  isDragging: boolean;
};

const INITIAL_X = 0;
const INITIAL_Y = 32;

const WINDOW_DX = 100;
const WINDOW_DY = 100;

const DEFAULT_TRANSITION: Transition = {
  type: "spring",
  damping: 30,
  stiffness: 300,
};

const WindowPositionContext = createContext<WindowPositionContext | undefined>(undefined);

export function useWindowPosition() {
  const context = useContext(WindowPositionContext);
  if (context === undefined) {
    throw new Error("useWindowPosition must be used within a WindowPositionProvider");
  }

  return context;
}

export function WindowPositionProvider({
  insightsContentRef,
  children,
}: {
  insightsContentRef: React.RefObject<HTMLDivElement | null>;
  children: React.ReactNode;
}) {
  const x = useMotionValue(getStoredX() ?? INITIAL_X);
  const y = useMotionValue(getStoredY() ?? INITIAL_Y);

  const dragControls = useDragControls();

  const [isDragging, setIsDragging] = useState(false);
  useRespondToDisplayChange(insightsContentRef, dragControls, isDragging, x, y);

  const enforceYBounds = (yValue: number) => {
    const bounds = getBounds();
    if (!bounds) return yValue;

    const { minY, maxY } = bounds;

    if (yValue < minY) {
      return minY;
    } else if (yValue > maxY) {
      return maxY;
    }
    return yValue;
  };

  const enforceXBounds = (xValue: number) => {
    const bounds = getBounds();
    if (!bounds) return xValue;

    const { minX, maxX } = bounds;
    if (xValue < minX) {
      return minX;
    } else if (xValue > maxX) {
      return maxX;
    }
    return xValue;
  };

  const keybindings = useKeybindings();
  useGlobalShortcut(keybindings.move_window_down, () => {
    animate(y, enforceYBounds(y.get() + WINDOW_DY), DEFAULT_TRANSITION);
  });
  useGlobalShortcut(keybindings.move_window_up, () => {
    animate(y, enforceYBounds(y.get() - WINDOW_DY), DEFAULT_TRANSITION);
  });
  useGlobalShortcut(keybindings.move_window_left, () => {
    animate(x, enforceXBounds(x.get() - WINDOW_DX), DEFAULT_TRANSITION);
  });
  useGlobalShortcut(keybindings.move_window_right, () => {
    animate(x, enforceXBounds(x.get() + WINDOW_DX), DEFAULT_TRANSITION);
  });

  const getBounds = useCallback(() => {
    const content = insightsContentRef.current;
    if (!content) return null;

    const maxWidth = window.innerWidth - content.clientWidth;

    const leftLimit = -(maxWidth / 2);
    const rightLimit = maxWidth / 2;

    const maxHeight = window.innerHeight - content.clientHeight;
    const topLimit = 0;
    const bottomLimit = maxHeight - (isWin ? 0 : 25);

    return {
      minX: leftLimit,
      minY: topLimit,
      maxX: rightLimit,
      maxY: bottomLimit,
    };
  }, [insightsContentRef]);

  const enforceBoundsAndSave = useCallback(() => {
    const bounds = getBounds();
    if (!bounds) return;

    const { minX, maxX, minY, maxY } = bounds;

    if (x.get() < minX) {
      x.set(minX);
    } else if (x.get() > maxX) {
      x.set(maxX);
    }

    if (y.get() < minY) {
      y.set(minY);
    } else if (y.get() > maxY) {
      y.set(maxY);
    }

    saveXY(x.get(), y.get());
  }, [x, y, getBounds]);

  useEffect(() => {
    if (isDragging) return;

    const content = insightsContentRef.current;
    if (!content) return;

    const resizeObserver = new ResizeObserver(enforceBoundsAndSave);
    resizeObserver.observe(content);

    // if display changes, ensure we are within the new bounds
    window.addEventListener("resize", enforceBoundsAndSave);

    return () => {
      resizeObserver.disconnect();
      window.removeEventListener("resize", enforceBoundsAndSave);
    };
  }, [insightsContentRef, enforceBoundsAndSave, isDragging]);

  useEffect(() => {
    if (isDragging) {
      // explicitly listen to mouseup, so we don't trigger when moving across a
      // display, which hits dragControls.stop()
      const handleMouseUp = () => enforceBoundsAndSave();
      window.addEventListener("mouseup", handleMouseUp);
      return () => window.removeEventListener("mouseup", handleMouseUp);
    }
  }, [isDragging, enforceBoundsAndSave]);

  useIpcRendererHandler("reset-widget-position", () => {
    x.set(INITIAL_X);
    y.set(INITIAL_Y);
    saveXY(INITIAL_X, INITIAL_Y);
  });

  const value: WindowPositionContext = useMemo(
    () => ({
      x,
      y,
      handleDragStart: () => {
        setIsDragging(true);
      },
      handleDragEnd: () => {
        setIsDragging(false);
      },
      dragControls,
      isDragging,
    }),
    [x, y, dragControls, isDragging],
  );

  return <WindowPositionContext.Provider value={value}>{children}</WindowPositionContext.Provider>;
}

function useRespondToDisplayChange(
  insightsContentRef: React.RefObject<HTMLDivElement | null>,
  dragControls: DragControls,
  isDragging: boolean,
  x: MotionValue<number> = useMotionValue(0),
  y: MotionValue<number> = useMotionValue(0),
) {
  useEffect(() => {
    if (!isDragging) return;

    const content = insightsContentRef.current;

    const maybeMoveToDisplayContainingCursor = async () => {
      const { postMoveInfo } = await invokeIpcMain(
        "move-window-to-display-containing-cursor",
        null,
      );
      if (postMoveInfo) {
        const newDragStartEvent = new PointerEvent("pointerdown", {
          isPrimary: true,
          clientX: postMoveInfo.windowCursorX,
          clientY: postMoveInfo.windowCursorY,
        });

        dragControls.stop();
        x.set(postMoveInfo.windowCursorX - window.innerWidth / 2);
        y.set(postMoveInfo.windowCursorY);
        dragControls.start(newDragStartEvent, { distanceThreshold: 0 });
      }
    };

    let keepLooping = true;

    const moveDisplayLoop = async () => {
      do {
        const isCursorOutsideDisplay = await invokeIpcMain(
          "is-cursor-outside-target-display",
          null,
        );
        if (isCursorOutsideDisplay) {
          // anticipate the window will change displays, so hide the content
          // such that it doesn't flicker in the wrong position
          if (content) content.style.opacity = "0";
        }

        try {
          await maybeMoveToDisplayContainingCursor();
        } finally {
          // small delay to wait until the OS fully moves the window
          setTimeout(() => {
            if (content) content.style.opacity = "1";
          }, 50);
        }

        // throttle
        await new Promise((resolve) => setTimeout(resolve, 100));
      } while (keepLooping);
    };

    void moveDisplayLoop();

    return () => {
      keepLooping = false;
    };
  }, [insightsContentRef, dragControls, isDragging, x, y]);
}

function getStoredX() {
  const strX = localStorage.getItem(WIDGET_LOCAL_STORAGE_KEYS.X);
  return strX ? Number(strX) : null;
}
function getStoredY() {
  const strY = localStorage.getItem(WIDGET_LOCAL_STORAGE_KEYS.Y);
  return strY ? Number(strY) : null;
}

function saveXY(x: number, y: number) {
  localStorage.setItem(WIDGET_LOCAL_STORAGE_KEYS.X, x.toString());
  localStorage.setItem(WIDGET_LOCAL_STORAGE_KEYS.Y, y.toString());
}
