import { BrowserWindow, screen, ipcMain } from 'electron';
import { join } from 'node:path';
import { windowManager } from './windows/WindowManager';
import { isDevelopment } from './utils/platform';

const __dirname = import.meta.dirname;

/**
 * Gets information about all available displays.
 * @returns {Array} A list of display objects.
 */
function getAvailableDisplays() {
  const currentWindowBounds = windowManager.getCurrentWindow().getBounds();
  const currentDisplay = screen.getDisplayMatching(currentWindowBounds);
  return screen.getAllDisplays().map((display) => ({
    ...display,
    label: display.label || `Display ${display.id}`,
    primary: display.id === screen.getPrimaryDisplay().id,
    current: display.id === currentDisplay.id
  }));
}

/**
 * Finds a display by its ID.
 * @param {number} id - The ID of the display.
 * @returns {Electron.Display | undefined} The display object.
 */
function getDisplayById(id: number) {
  return screen.getAllDisplays().find((d) => d.id === id);
}

/**
 * Creates an overlay window for a specific display.
 */
class DisplayOverlay {
  window: BrowserWindow;
  displayId: number;

  constructor(display: Electron.Display, onClick: (displayId: number) => void) {
    this.displayId = display.id;
    this.window = new BrowserWindow({
      show: false,
      frame: false,
      transparent: true,
      alwaysOnTop: true,
      skipTaskbar: true,
      resizable: false,
      movable: false,
      minimizable: false,
      maximizable: false,
      fullscreenable: false,
      x: display.bounds.x,
      y: display.bounds.y,
      width: display.bounds.width,
      height: display.bounds.height,
      webPreferences: {
        nodeIntegration: false,
        contextIsolation: true,
        sandbox: false,
        preload: join(__dirname, 'preload.cjs')
      }
    });

    this.window.setVisibleOnAllWorkspaces(true, { visibleOnFullScreen: true });
    this.window.setIgnoreMouseEvents(false);

    const overlayClickHandler = () => {
      console.log(`[DisplayOverlay] Overlay click triggered for display ${this.displayId}`);
      onClick(this.displayId);
    };

    const ipcChannel = `overlay-click-${this.displayId}`;
    ipcMain.on(ipcChannel, overlayClickHandler);

    this.window.on('closed', () => {
      console.log(`[DisplayOverlay] Cleaning up IPC handler for display ${this.displayId}`);
      ipcMain.removeListener(ipcChannel, overlayClickHandler);
    });

    this.loadReactOverlay(display, ipcChannel);
  }

  async loadReactOverlay(display: Electron.Display, ipcChannel: string) {
    const displayData = {
      display: {
        id: display.id,
        label: display.label || `Display ${display.id}`,
        bounds: display.bounds
      },
      ipcChannel: ipcChannel
    };
    const encodedData = encodeURIComponent(JSON.stringify(displayData));

    if (isDevelopment && process.env.VITE_DEV_SERVER_URL) {
      const url = new URL(`${process.env.VITE_DEV_SERVER_URL}/overlay.html`);
      url.searchParams.set('displayData', encodedData);
      this.window.loadURL(url.toString());
    } else {
      this.window.loadFile(join(__dirname, '../dist/overlay.html'), {
        query: { displayData: encodedData }
      });
    }
  }

  show() {
    this.window.show();
  }

  hide() {
    this.window.hide();
  }

  highlight() {
    this.window.webContents.executeJavaScript(
      `window.dispatchEvent(new CustomEvent('highlight'));`
    ).catch(() => {});
  }

  unhighlight() {
    this.window.webContents.executeJavaScript(
      `window.dispatchEvent(new CustomEvent('unhighlight'));`
    ).catch(() => {});
  }

  destroy() {
    console.log(`[DisplayOverlay] Destroying overlay for display ${this.displayId}`);
    if (!this.window.isDestroyed()) {
      this.window.close();
    }
  }

  getBounds() {
    return this.window.getBounds();
  }
}

/**
 * Manages the creation and destruction of display overlays.
 */
class DisplayOverlayManager {
  overlays = new Map<number, DisplayOverlay>();
  isActive = false;

  showOverlays() {
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

  hideOverlays() {
    console.log('[DisplayOverlayManager] Hiding overlays');
    this.isActive = false;
    for (const overlay of this.overlays.values()) {
      overlay.destroy();
    }
    this.overlays.clear();
  }

  highlightDisplay(displayId: number) {
    const overlay = this.overlays.get(displayId);
    if (overlay) {
      overlay.highlight();
    }
  }

  unhighlightDisplay(displayId: number) {
    const overlay = this.overlays.get(displayId);
    if (overlay) {
      overlay.unhighlight();
    }
  }
}

export const displayOverlayManager = new DisplayOverlayManager();
export { getAvailableDisplays, getDisplayById }; 