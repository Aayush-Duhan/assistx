import { screen, Display } from 'electron';
import { windowManager } from './windows/WindowManager';
import { displayOverlayManager } from './display-overlay-manager';

export type EnhancedDisplay = Display & {
  label: string;
  primary: boolean;
  current: boolean;
};

function getAvailableDisplays(): EnhancedDisplay[] {
  const currentWindowBounds = windowManager.getCurrentWindow().getBounds();
  const currentDisplay = screen.getDisplayMatching(currentWindowBounds);
  return screen.getAllDisplays().map((display) => ({
    ...display,
    label: display.label || `Display ${display.id}`,
    primary: display.id === screen.getPrimaryDisplay().id,
    current: display.id === currentDisplay.id,
  }));
}

/**
 * Sets up listeners for display changes to ensure the window remains
 * correctly positioned and overlays are managed properly.
 */
export function setupDisplayListeners(): void {
  const handler = (): void => {
    try {
      // Hide overlays when displays change to avoid stale overlays
      displayOverlayManager.hideOverlays();
      windowManager.getCurrentWindow().moveToPrimaryDisplay();
      const displays = getAvailableDisplays();
      windowManager
        .getCurrentWindow()
        .sendToWebContents('available-displays', { displays });
    } catch (error) {
      console.log(
        'Could not reposition window, it might have been destroyed.',
      );
    }
  };

  screen.on('display-added', handler);
  screen.on('display-removed', handler);
  screen.on('display-metrics-changed', handler);
}