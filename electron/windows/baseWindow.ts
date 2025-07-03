import { BrowserWindow, screen, shell, BrowserWindowConstructorOptions, Display } from 'electron';
import { join } from 'node:path';
import { isWindows, isDevelopment } from '../utils/platform';
import { animateWindowResize, animateWindowOpacity } from '../utils/animation';

const __dirname = import.meta.dirname;

export class BaseWindow {
  window: BrowserWindow;
  currentDisplay = screen.getPrimaryDisplay();

  constructor(options: BrowserWindowConstructorOptions | undefined, extraConfig: { skipUndetectability: boolean }) {
    this.window = new BrowserWindow(
      options || {
        show: isWindows, // On Windows, show immediately for undetectability to work.
        // Window style
        alwaysOnTop: true,
        transparent: true,
        frame: false,
        roundedCorners: false,
        hasShadow: false,
        // Window resize options
        fullscreenable: false,
        minimizable: false,
        // macOS specific options
        hiddenInMissionControl: true,
        // macOS + Windows specific options
        skipTaskbar: true,
        webPreferences: {
          preload: join(__dirname, "preload.cjs"),
          sandbox: false,
        },
      }
    );

    // Apply content protection to prevent screen capture, unless skipped.
    if (!extraConfig?.skipUndetectability) {
      this.window.setContentProtection(true);
    }

    this.window.setVisibleOnAllWorkspaces(true, { visibleOnFullScreen: true });
    this.window.setResizable(false);
    
    if (isWindows) {
      this.window.setAlwaysOnTop(true, "screen-saver", 1);
      this.window.webContents.setBackgroundThrottling(false);
    }

    this.moveToPrimaryDisplay();
    this.setIgnoreMouseEvents(true);

    this.window.once("ready-to-show", () => {
      this.window.show();
    });

    // Open external links in the default browser.
    this.window.webContents.setWindowOpenHandler((details) => {
      shell.openExternal(details.url);
      return { action: "deny" };
    });

    // Load the renderer content.
    if (isDevelopment && process.env.VITE_DEV_SERVER_URL) {
      this.window.loadURL(process.env.VITE_DEV_SERVER_URL);
    } else {
      this.window.loadFile(join(__dirname, '../dist/index.html'));
    }
  }

  getCurrentDisplay() {
    return this.currentDisplay;
  }

  sendToWebContents(channel: string, payload: any) {
    if (!this.window.isDestroyed()) {
      this.window.webContents.send(channel, payload);
    }
  }

  setIgnoreMouseEvents(ignore: boolean) {
    this.window.setIgnoreMouseEvents(ignore, { forward: true });
  }

  resizeWindow(width: number, height: number, duration: number) {
    animateWindowResize(this.window, width, height, duration);
  }

  focus() {
    this.window.focus();
  }

  getBounds() {
    return this.window.getBounds();
  }

  moveToDisplay(display: Display) {
    this.currentDisplay = display;
    this.window.setPosition(display.workArea.x, display.workArea.y);
    this.window.setSize(display.workArea.width, display.workArea.height);
    this.sendToWebContents("display-changed", null);
  }

  show(shouldFocus = false) {
    if (this.window.isDestroyed()) {
      return;
    }

    // Prepare for animation by ensuring the window is technically visible but transparent.
    if (!this.window.isVisible()) {
      this.window.setOpacity(0);
      // showInactive() displays the window without activating it (stealing focus).
      this.window.showInactive();
    }

    // Animate to full opacity.
    animateWindowOpacity(this.window, 1, 150, () => {
      // If focus is requested, we give it focus *after* the animation.
      if (shouldFocus) {
        this.window.focus();
      }
      this.sendToWebContents('window-shown', {});
    });
  }

  hide() {
    if (!this.window.isDestroyed() && this.window.isVisible()) {
      // Animate to zero opacity, then hide the window.
      animateWindowOpacity(this.window, 0, 150, () => {
        this.window.hide();
        this.window.setOpacity(1); // Reset opacity for the next time it's shown.
        this.sendToWebContents('window-hidden', {});
      });
    }
  }

  isVisible(): boolean {
    return !this.window.isDestroyed() && this.window.isVisible();
  }

  toggleVisibility() {
    if (!this.window.isDestroyed()) {
      if (this.window.isVisible()) {
        this.hide();
      } else {
        // Explicitly show without focus.
        this.show(false);
      }
    }
  }

  close() {
    if (!this.window.isDestroyed()) {
      this.window.close();
    }
  }

  isDestroyed(): boolean {
    return this.window.isDestroyed();
  }

  moveToPrimaryDisplay() {
    const primaryDisplay = screen.getPrimaryDisplay();
    this.moveToDisplay(primaryDisplay);
  }

  reload() {
    this.window.webContents.reload();
  }

  onUnload(callback: () => void) {
    this.window.webContents.on("did-navigate", callback);
  }

  toggleDevTools() {
    if (this.window.webContents.isDevToolsOpened()) {
      this.window.webContents.closeDevTools();
    } else {
      this.window.webContents.openDevTools({ mode: "detach" });
      this.window.focus();
    }
  }
}