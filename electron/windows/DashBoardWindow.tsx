import { app, Display, nativeTheme } from "electron";
import { CenteredWindow } from "./CenteredWindow";
import { getSharedState } from "../utils/shared/stateManager";
import { IS_WINDOWS, IS_MAC } from "@/shared/constants";

/**
 * Represents the dashboard window for settings and session viewing.
 */
export class DashboardWindow extends CenteredWindow {
  private readyToShow = false;
  private pendingVisibility: boolean | null = null;

  constructor(display: Display) {
    const options: Electron.BrowserWindowConstructorOptions = {
      frame: true,
      titleBarStyle: "hidden",
      trafficLightPosition: { x: 12, y: 12 },
      titleBarOverlay: true,
    };

    super(options, {
      initialDisplay: display,
      skipTaskbar: () => getSharedState().undetectabilityEnabled,
      width: 1200,
      height: 800,
      minWidth: IS_WINDOWS ? 1020 : 800,
      minHeight: 600,
    });

    this.handleTheme();

    // The BaseWindow's ready-to-show handler fires too early (before our handler is registered)
    // So we use did-finish-load to show the window instead
    this.window.webContents.once("did-finish-load", () => {
      this.readyToShow = true;

      // Apply any pending visibility request, or show by default
      if (this.pendingVisibility === false) {
        this.window.hide();
      } else {
        this.window.show();
        this.window.focus();
      }
      this.pendingVisibility = null;
    });
  }

  async loadUrl(): Promise<void> {
    await this.loadLocalPage("dashboard.html");
  }

  /**
   * Set window visibility
   */
  setVisibility(visible: boolean): void {
    if (!this.readyToShow) {
      // Queue the visibility request for when the window is ready
      this.pendingVisibility = visible;
      return;
    }

    if (visible) {
      if (IS_MAC) {
        app.focus({ steal: true });
      }
      this.window.show();
      this.window.focus();
      this.window.moveTop();
    } else {
      this.window.hide();
    }
  }

  /**
   * Apply theme colors to window
   */
  handleTheme(): void {
    const backgroundColor = nativeTheme.shouldUseDarkColors ? "#121213" : "#F4F4F5";
    this.window.setBackgroundColor(backgroundColor);

    if (IS_WINDOWS) {
      this.window.setTitleBarOverlay({
        color: backgroundColor,
        symbolColor: nativeTheme.shouldUseDarkColors ? "#FFFFFF" : "#000000",
        height: 34,
      });
    }
  }
}
