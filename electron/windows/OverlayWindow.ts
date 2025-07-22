import { BrowserWindow, Display, ipcMain, Rectangle } from "electron";
import { join } from "node:path";
import { isDev } from "electron/utils/platform";

interface DisplayData {
    display: {
      id: number;
      label: string;
      bounds: Rectangle;
    };
    ipcChannel: string;
    onOverlayClick: () => void;
  }

/**
 * Creates an overlay window for a specific display.
 */
export class DisplayOverlay {
    private readonly window: BrowserWindow;
    public readonly displayId: number;
  
    constructor(display: Display, onOverlayClick: (displayId: number) => void) {
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
          preload: join(__dirname, 'preload.cjs')
        }
      });
  
      this.window.setVisibleOnAllWorkspaces(true, { visibleOnFullScreen: true });
      this.window.setIgnoreMouseEvents(false);
  
      const overlayClickHandler = () => {
        console.log(`[DisplayOverlay] Overlay click triggered for display ${this.displayId}`);
        onOverlayClick(this.displayId);
      };
  
      const ipcChannel = `overlay-click-${this.displayId}`;
      ipcMain.on(ipcChannel, overlayClickHandler);
  
      this.window.on('closed', () => {
        console.log(`[DisplayOverlay] Cleaning up IPC handler for display ${this.displayId}`);
        ipcMain.removeListener(ipcChannel, overlayClickHandler);
      });
      this.window.webContents.setWindowOpenHandler(() => ({ action: 'deny' }));
      this.loadReactOverlay(display, ipcChannel);
    }
  
    private loadReactOverlay(display: Display, ipcChannel: string): void {
      const displayData: DisplayData = {
        display: {
          id: display.id,
          label: display.label || `Display ${display.id}`,
          bounds: display.bounds
        },
        ipcChannel: ipcChannel,
        onOverlayClick: () => {}
      };
      let overlayUrl: URL;
  
      if (isDev && process.env.VITE_DEV_SERVER_URL) {
        overlayUrl = new URL(`${process.env.VITE_DEV_SERVER_URL}/overlay.html`);
      } else {
        overlayUrl = new URL(join(__dirname, '../dist/overlay.html'));
      }
      const encodedData = encodeURIComponent(JSON.stringify(displayData));
      overlayUrl.searchParams.set('displayData', encodedData);
      this.window.loadURL(overlayUrl.toString());
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