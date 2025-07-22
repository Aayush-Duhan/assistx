import { screen, Display } from 'electron';
import { windowManager } from './WindowManager';
import { DisplayOverlay } from './OverlayWindow';


/**
 * Gets information about all available displays.
 * @returns {Array} A list of display objects.
 */
export function getAvailableDisplays(): DisplayInfo[] {
  const currentWindowBounds = windowManager.getCurrentWindow().getBounds();
  const currentDisplay = screen.getDisplayMatching(currentWindowBounds);
  const primaryDisplay = screen.getPrimaryDisplay();
  return screen.getAllDisplays().map((display) => ({
    ...display,
    label: display.label || `Display ${display.id}`,
    primary: display.id === primaryDisplay.id,
    current: display.id === currentDisplay.id
  }));
}

/**
 * Finds a display by its ID.
 * @param {number} id - The ID of the display.
 * @returns {Electron.Display | undefined} The display object.
 */
export function getDisplayById(id: number) {
  return screen.getAllDisplays().find((d) => d.id === id);
}

export interface DisplayInfo extends Display {
  primary: boolean;
  current: boolean;
}

/**
 * Manages the creation and destruction of display overlays.
 */
class DisplayOverlayManager {
  private overlays = new Map<number, DisplayOverlay>();
  private isActive = false;

  showOverlays(): void {
    console.log('[DisplayOverlayManager] Showing overlays');
    this.hideOverlays();
    this.isActive = true;

    const allDisplays = screen.getAllDisplays();
    const mainWindow = windowManager.getCurrentWindow();
    const mainWindowBounds = mainWindow.getBounds();
    const currentDisplay = screen.getDisplayMatching(mainWindowBounds);

    for (const display of allDisplays) {
      if (display.id === currentDisplay.id) {
        continue;
      }
      const overlay = new DisplayOverlay(display, (displayId) => {
        console.log(`[DisplayOverlayManager] Display ${displayId} clicked, checking if active: ${this.isActive}`);
        if (!this.isActive) {
          console.log(`[DisplayOverlayManager] Ignoring click for display ${displayId} - overlays are inactive`);
          return;
        }
        console.log(`[DisplayOverlayManager] Moving window to display ${displayId}`);
        const targetDisplay = getDisplayById(displayId);
        if (targetDisplay) {
          mainWindow.moveToDisplay(targetDisplay);
        }
        this.hideOverlays();
      });
      this.overlays.set(display.id, overlay);
      overlay.show();
    }
  }

  hideOverlays(): void {
    console.log('[DisplayOverlayManager] Hiding overlays');
    this.isActive = false;
    for (const overlay of this.overlays.values()) {
      overlay.destroy();
    }
    this.overlays.clear();
  }

  highlightDisplay(displayId: number): void {
    const overlay = this.overlays.get(displayId);
    if (overlay) {
      overlay.highlight();
    }
  }

  unhighlightDisplay(displayId: number): void {
    const overlay = this.overlays.get(displayId);
    if (overlay) {
      overlay.unhighlight();
    }
  }
}

export const displayOverlayManager = new DisplayOverlayManager();