import { Display } from "electron";
import { BaseWindow } from "./baseWindow";
import { IS_WINDOWS } from "../../shared/constants";
import { isMacOsSequoia } from "../utils/utils";

/**
 * Represents the main, frameless, always-on-top application window.
 */
export class AppWindow extends BaseWindow {
  constructor(display: Display) {
    const options: Electron.BrowserWindowConstructorOptions = {
      type: "panel",
      alwaysOnTop: true,
      transparent: true,
      frame: false,
      roundedCorners: false,
      hasShadow: false,
      fullscreenable: false,
      minimizable: false,
      resizable: false,
      hiddenInMissionControl: true,
    };

    super(options, {
      skipTaskbar: () => true,
    });

    // Make visible on all workspaces including fullscreen
    this.window.setVisibleOnAllWorkspaces(true, { visibleOnFullScreen: true });

    // Windows-specific settings
    if (IS_WINDOWS) {
      this.window.setAlwaysOnTop(true, "screen-saver", 1);
      this.window.webContents.setBackgroundThrottling(false);
      this.window.setOpacity(0.99);
    }

    this.moveToDisplay(display);
  }

  /**
   * Move window to specified display
   */
  moveToDisplay(display: Display): void {
    this.window.setBounds(
      {
        x: display.workArea.x,
        y: display.workArea.y,
        width: display.workArea.width,
        height: display.workArea.height,
      },
      false,
    );
  }

  /**
   * Set whether to ignore mouse events
   */
  setIgnoreMouseEvents(ignore: boolean): void {
    this.window.setIgnoreMouseEvents(ignore, { forward: true });
  }

  /**
   * Focus the window
   */
  focus(): void {
    this.window.focus();
  }

  /**
   * Blur the window
   */
  blur(): void {
    if (IS_WINDOWS) {
      this.window.setFocusable(false);
      this.window.setFocusable(true);
    }

    this.restoreUndetectability();

    // Skip blur on macOS Sequoia (version 25) due to issues
    if (!isMacOsSequoia()) {
      this.window.blur();
    }
  }

  async loadUrl(): Promise<void> {
    await this.loadLocalPage("index.html");
  }
}
