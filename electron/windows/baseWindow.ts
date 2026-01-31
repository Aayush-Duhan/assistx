import { BrowserWindow, shell, app } from "electron";
import path, { join } from "node:path";
import { APP_NAME } from "../utils/constants";
import { IS_WINDOWS, IS_DEV } from "../../shared/constants";
import { windowManager } from "./WindowManager";
import { getSharedState } from "../utils/shared/stateManager";

const __dirname = import.meta.dirname;

export abstract class BaseWindow {
  public window: BrowserWindow;
  public windowIsClosing = false;

  constructor(
    options: Electron.BrowserWindowConstructorOptions,
    protected moreOptions: {
      skipTaskbar: () => boolean;
    },
  ) {
    this.window = new BrowserWindow({
      ...options,
      show: false,
      title: APP_NAME,
      webPreferences: {
        preload: path.join(__dirname, "preload.cjs"),
      },
    });

    this.restoreUndetectability();

    if (IS_WINDOWS) {
      const handleUndetectability = () => this.restoreUndetectability();
      this.window.on("show", handleUndetectability);
      this.window.on("restore", handleUndetectability);
      this.window.on("focus", handleUndetectability);
    }

    // Show window when ready
    this.window.once("ready-to-show", () => {
      this.window.show();
      this.window.setTitle(APP_NAME);
    });

    // Handle load failures
    this.window.webContents.on("did-fail-load", (_event, errorCode, errorDescription) => {
      console.error(`Window failed to load remote content: ${errorCode} ${errorDescription}`);
      windowManager.setShowOfflineWindow(true);
    });

    // Handle renderer crashes
    this.window.webContents.on("render-process-gone", (_event, details) => {
      console.error("Renderer process crashed or was killed", {
        reason: details.reason,
        exitCode: details.exitCode,
      });

      if (details.reason === "crashed") {
        if (!this.window.isDestroyed()) {
          this.loadUrl().catch((error) => {
            console.error("Failed to reload window after crash", error);
            windowManager.setShowOfflineWindow(true);
          });
        }
      }
    });

    this.window.webContents.on("unresponsive", () => {
      console.error("Renderer process became unresponsive");
    });

    this.window.webContents.on("responsive", () => {
      console.log("Renderer process became responsive again");
    });

    // Prevent title changes
    this.window.on("page-title-updated", () => {
      if (this.window.getTitle() !== APP_NAME) {
        this.window.setTitle(APP_NAME);
      }
    });

    // Prevent navigation
    this.window.webContents.on("will-navigate", (event) => {
      event.preventDefault();
    });

    // Handle external link clicks
    this.window.webContents.setWindowOpenHandler((details) => {
      try {
        const url = new URL(details.url);
        if (
          url.protocol === "https:" ||
          (IS_DEV && url.protocol === "http:") ||
          url.protocol === "mailto:"
        ) {
          shell.openExternal(details.url);
        }
      } catch (error) {
        console.error(`Error trying to open url ${details.url}`, error);
      }
      return { action: "deny" };
    });

    // Handle window close
    this.window.on("close", (event) => {
      if (
        !this.windowIsClosing &&
        !windowManager.appIsQuitting
        // TODO: Add update check
        // && !isQuittingForUpdateInstall()
      ) {
        event.preventDefault();
        windowManager.fakeQuit();
      }
    });

    // Load the window content
    this.loadUrl().catch((error) => {
      if (!this.window.isDestroyed()) {
        console.error("Error loading window url", error);
        windowManager.setShowOfflineWindow(true);
      }
    });
  }

  /**
   * Load a local HTML page from the renderer
   * @param page - The HTML file to load (default: "index.html")
   * @param searchParams - Optional URL search params for routing
   */
  protected async loadLocalPage(
    page: string = "index.html",
    searchParams?: URLSearchParams,
  ): Promise<void> {
    const query = searchParams?.toString();
    const queryString = query ? `?${query}` : "";

    if (IS_DEV && process.env.VITE_DEV_SERVER_URL) {
      await this.window.loadURL(`${process.env.VITE_DEV_SERVER_URL}/${page}${queryString}`);
    } else {
      await this.window.loadFile(join(__dirname, `../dist/${page}`), {
        search: query,
      });
    }
  }

  /**
   * Send message to window's web contents
   */
  sendToWebContents(channel: string, data: unknown): void {
    if (!this.window.isDestroyed()) {
      this.window.webContents.send(channel, data);
    }
  }

  /**
   * Close the window
   */
  close(): void {
    if (!this.window.isDestroyed()) {
      this.windowIsClosing = true;
      this.window.close();
    }
  }

  /**
   * Reload the window
   */
  reload(): void {
    this.window.webContents.reload();
  }

  /**
   * Load the window's URL (implemented by subclasses)
   */
  abstract loadUrl(): Promise<void>;

  /**
   * Toggle developer tools
   */
  toggleDevTools(): void {
    if (this.window.webContents.isDevToolsOpened()) {
      this.window.webContents.closeDevTools();
    } else {
      this.window.webContents.openDevTools({ mode: "detach" });
      app.focus();
    }
  }

  /**
   * Apply undetectability settings to window
   */
  restoreUndetectability(): void {
    this.window.setContentProtection(getSharedState().undetectabilityEnabled);
    if (IS_WINDOWS) {
      this.window.setSkipTaskbar(this.moreOptions.skipTaskbar());
    }
  }
}
