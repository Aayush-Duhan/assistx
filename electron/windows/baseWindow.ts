import { BrowserWindow, screen, shell, BrowserWindowConstructorOptions, Display, Rectangle } from 'electron';
import { join } from 'node:path';
import { isWindows, isDev } from '../utils/platform';
import { animateWindowResize, animateWindowOpacity } from '../utils/animation';

const __dirname = import.meta.dirname;

export interface WindowCreationOptions {
  undetectabilityEnabled: boolean;
  finishedOnboarding?: boolean;
}

export class BaseWindow {
  public readonly window: BrowserWindow;
  protected undetectabilityEnabled: boolean;
  protected currentDisplay: Display = screen.getPrimaryDisplay();

  constructor(options: WindowCreationOptions, browserWindowOptions?: BrowserWindowConstructorOptions) {
    this.window = new BrowserWindow(
      browserWindowOptions || {
        show: isWindows, // On Windows, show immediately for undetectability to work.
        // Window style
        type: "panel",
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
        skipTaskbar: options.undetectabilityEnabled,
        webPreferences: {
          preload: join(__dirname, "preload.cjs")
        },
      }
    );
    this.undetectabilityEnabled = options.undetectabilityEnabled;
    // Apply content protection to prevent screen capture, unless skipped.
    if (this.undetectabilityEnabled) {
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
      try {
        const url = new URL(details.url);
        if (url.protocol === 'https:' || (isDev && url.protocol === 'http:')) {
          shell.openExternal(details.url);
        }
      } catch (error) {
        console.error(`error trying to open url ${details.url}`, error);
      }
      return { action: 'deny' };
    });

    // Load the renderer content.
    if (isDev && process.env.VITE_DEV_SERVER_URL) {
      this.window.loadURL(process.env.VITE_DEV_SERVER_URL);
    } else {
      this.window.loadFile(join(__dirname, '../dist/index.html'));
    }
    if (options?.finishedOnboarding) {
      this.window.webContents.once("did-finish-load", () => {
        this.window.webContents.send("finished-onboarding", {});
      });
    }
  }

  getCurrentDisplay() {
    return this.currentDisplay;
  }

  sendToWebContents(channel: string, payload: unknown): void {
    if (!this.window.isDestroyed()) {
      this.window.webContents.send(channel, payload);
    }
  }

  setIgnoreMouseEvents(ignore: boolean): void {
    this.window.setIgnoreMouseEvents(ignore, { forward: true });
  }

  resizeWindow(width: number, height: number, duration: number): void {
    animateWindowResize(this.window, width, height, duration);
  }

  focus(): void {
    this.window.focus();
  }
  
  blur(): void {
    if (isWindows) {
      // Workaround to properly blur on Windows
      this.window.setFocusable(false);
      this.window.setFocusable(true);
      this.window.setSkipTaskbar(true);
    }
    this.window.blur();
  }

  getBounds(): Rectangle {
    return this.window.getBounds();
  }

  moveToDisplay(display: Display): void {
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
      this.sendToWebContents('window-shown', null);
    });
  }

  hide() {
    if (!this.window.isDestroyed() && this.window.isVisible()) {
      // Animate to zero opacity, then hide the window.
      animateWindowOpacity(this.window, 0, 150, () => {
        this.window.hide();
        this.window.setOpacity(1); // Reset opacity for the next time it's shown.
        this.sendToWebContents('window-hidden', null);
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

  close(): void {
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

  reload(): void {
    this.window.webContents.reload();
  }

  onUnload(callback: () => void): void {
    this.window.webContents.on("did-navigate", callback);
  }

  toggleDevTools(): void {
    if (this.window.webContents.isDevToolsOpened()) {
      this.window.webContents.closeDevTools();
    } else {
      this.window.webContents.openDevTools({ mode: "detach" });
      this.window.focus();
    }
  }
}