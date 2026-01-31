import { screen, BrowserWindow } from "electron";
import { IS_WINDOWS } from "../../shared/constants";

function easeInOutCubic(t: number): number {
  return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
}

export function animateWindowResize(
  browserWindow: BrowserWindow,
  targetWidth: number,
  targetHeight: number,
  duration: number,
): { cancel: () => void } {
  targetWidth = Math.floor(targetWidth);
  targetHeight = Math.floor(targetHeight);

  const displayFrequency = screen.getPrimaryDisplay().displayFrequency;
  let targetFps = Math.min(Math.max(displayFrequency, 30), 360);
  if (displayFrequency > 60) {
    targetFps = Math.max(60, Math.floor(displayFrequency / 2));
  }
  const frameInterval = 1000 / targetFps;

  const startBounds = browserWindow.getBounds();
  const startX = startBounds.x;
  const startY = startBounds.y;
  const startWidth = startBounds.width;
  const startHeight = startBounds.height;
  const targetX = startX + Math.floor((startWidth - targetWidth) / 2);
  const targetY = startY + Math.floor((startHeight - targetHeight) / 2);

  const deltaWidth = targetWidth - startWidth;
  const deltaHeight = targetHeight - startHeight;
  const deltaX = targetX - startX;
  const deltaY = targetY - startY;

  const startTime = Date.now();
  let animationTimeout: NodeJS.Timeout | null = null;

  const animationStep = (): void => {
    const elapsedTime = Date.now() - startTime;
    const progress = Math.min(1, elapsedTime / duration);

    if (progress < 1) {
      const easedProgress = easeInOutCubic(progress);
      const newWidth = Math.floor(startWidth + deltaWidth * easedProgress);
      const newHeight = Math.floor(startHeight + deltaHeight * easedProgress);
      const newX = Math.floor(startX + deltaX * easedProgress);
      const newY = Math.floor(startY + deltaY * easedProgress);

      const options = {
        x: newX,
        y: newY,
        width: newWidth,
        height: newHeight,
      };
      if (IS_WINDOWS) {
        const boundsNow = browserWindow.getBounds();
        if (
          Math.abs(boundsNow.width - newWidth) >= 1 ||
          Math.abs(boundsNow.height - newHeight) >= 1 ||
          Math.abs(boundsNow.x - newX) >= 1 ||
          Math.abs(boundsNow.y - newY) >= 1
        ) {
          browserWindow.setBounds(options, false);
        }
      } else {
        browserWindow.setBounds(options);
      }
      animationTimeout = setTimeout(animationStep, frameInterval);
    } else {
      browserWindow.setBounds({ x: targetX, y: targetY, width: targetWidth, height: targetHeight });
      browserWindow.setResizable(false);
      if (animationTimeout !== null) {
        clearTimeout(animationTimeout);
        animationTimeout = null;
      }
    }
  };

  const wasResizable = browserWindow.isResizable();
  if (!wasResizable) {
    browserWindow.setResizable(true);
  }

  animationStep();

  return {
    cancel: () => {
      if (animationTimeout !== null) {
        clearTimeout(animationTimeout);
        animationTimeout = null;
      }
      browserWindow.setBounds({ x: targetX, y: targetY, width: targetWidth, height: targetHeight });
      browserWindow.setResizable(wasResizable);
    },
  };
}
