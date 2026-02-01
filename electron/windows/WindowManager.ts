import { app, Display, screen, nativeTheme } from "electron";
import { IS_MAC } from "@/shared/constants";
import { AppWindow } from "./AppWindow";
import { OnboardingWindow } from "./OnboardingWindow";
import { DashboardWindow } from "./DashBoardWindow";
import { OfflineWindow } from "./OfflineWindow";
import { getSharedState, updateSharedState } from "../utils/shared/stateManager";
import { clearAllShortcuts } from "../features/shortcuts";

/**
 * Get current view based on state
 */
function getCurrentView(): "app" | "onboarding" {
  const state = getSharedState();
  return state.onboardingState.completed ? "app" : "onboarding";
}

class WindowManager {
  private appWindow: AppWindow | null = null;
  private dashboardWindow: DashboardWindow | null = null;
  private onboardingWindow: OnboardingWindow | null = null;
  private offlineWindow: OfflineWindow | null = null;
  private showOfflineWindow = false;
  private targetDisplay: Display | null = null;
  private displayCorrectionInterval: NodeJS.Timeout | null = null;

  public appIsQuitting = false;

  constructor() {
    // Handle app quit
    app.on("before-quit", () => {
      this.appIsQuitting = true;
      this.cleanup();
    });

    // Handle theme changes
    nativeTheme.on("updated", () => {
      this.dashboardWindow?.handleTheme();
    });

    // Periodically correct display position
    this.displayCorrectionInterval = setInterval(() => {
      this.appWindow?.moveToDisplay(this.getTargetDisplay());
    }, 5000);
  }

  /**
   * Cleanup resources
   */
  private cleanup(): void {
    if (this.displayCorrectionInterval) {
      clearInterval(this.displayCorrectionInterval);
      this.displayCorrectionInterval = null;
    }
  }

  handleDockIcon(): void {
    if (!IS_MAC) return;
    const { undetectabilityEnabled } = getSharedState();
    const shouldShowDock = !undetectabilityEnabled;
    const isDockVisible = app.dock?.isVisible() ?? false;
    if (shouldShowDock !== isDockVisible) {
      if (shouldShowDock) {
        app.dock?.show();
      } else {
        // When hiding the dock, we need to steal focus back to the app
        // to ensure it remains the active application.
        app.dock?.hide();
        app.focus({ steal: true });
        setTimeout(() => {
          app.focus({ steal: true });
        }, 500);
      }
    }
  }

  recreateWindowsForView(): void {
    const currentView = getCurrentView();
    // Close existing windows
    this.appWindow?.close();
    this.appWindow = null;
    this.dashboardWindow?.close();
    this.dashboardWindow = null;
    this.onboardingWindow?.close();
    this.onboardingWindow = null;
    this.offlineWindow?.close();
    this.offlineWindow = null;

    const display = this.getTargetDisplay();

    // Create windows based on current view
    if (this.showOfflineWindow) {
      this.offlineWindow = new OfflineWindow(display);
    } else if (currentView === "app") {
      this.appWindow = new AppWindow(display);
      this.dashboardWindow = new DashboardWindow(display);
    } else if (currentView === "onboarding") {
      this.onboardingWindow = new OnboardingWindow(display);
    }

    this.handleDockIcon();
    // TODO: Uncomment this when tray is implemented
    // updateTray();
    clearAllShortcuts();
  }

  // Window getters
  getAppWindow(): AppWindow | null {
    return this.appWindow;
  }

  getDashboardWindow(): DashboardWindow | null {
    return this.dashboardWindow;
  }

  getOnboardingWindow(): OnboardingWindow | null {
    return this.onboardingWindow;
  }

  getOfflineWindow(): OfflineWindow | null {
    return this.offlineWindow;
  }

  /**
   * Set target display for app window
   */
  setTargetDisplay(display: Display): void {
    this.targetDisplay = display;
    this.appWindow?.moveToDisplay(display);
  }

  /**
   * Get current target display
   */
  getTargetDisplay(): Display {
    return this.targetDisplay ?? screen.getPrimaryDisplay();
  }

  /**
   * Show/hide offline window
   */
  setShowOfflineWindow(show: boolean): void {
    this.showOfflineWindow = show;
    this.recreateWindowsForView();
  }

  /**
   * Set content protection on all windows
   */
  setContentProtection(enabled: boolean): void {
    this.appWindow?.window.setContentProtection(enabled);
    this.dashboardWindow?.window.setContentProtection(enabled);
  }

  /**
   * Restore undetectability settings on all windows
   */
  restoreUndetectability(): void {
    this.appWindow?.restoreUndetectability();
    this.dashboardWindow?.restoreUndetectability();
  }

  /**
   * Hide windows without actually quitting
   */
  fakeQuit(options?: { hideAppWindow?: boolean }): void {
    if (this.offlineWindow || this.onboardingWindow) {
      app.quit();
      return;
    }

    updateSharedState({ showDashboard: false });

    if (options?.hideAppWindow) {
      updateSharedState({ windowHidden: true });
    }
  }

  /**
   * Check if cursor is outside target display
   */
  isCursorOutsideTargetDisplay(): boolean {
    const cursorPoint = screen.getCursorScreenPoint();
    const cursorDisplay = screen.getDisplayNearestPoint(cursorPoint);
    const targetDisplay = this.getTargetDisplay();

    return cursorDisplay.id !== targetDisplay.id;
  }

  /**
   * Move window to display containing cursor
   */
  moveToDisplayContainingCursor(): { windowCursorX: number; windowCursorY: number } | null {
    if (!this.appWindow || !this.isCursorOutsideTargetDisplay()) {
      return null;
    }

    const cursorPoint = screen.getCursorScreenPoint();
    const cursorDisplay = screen.getDisplayNearestPoint(cursorPoint);

    this.setTargetDisplay(cursorDisplay);

    const { x, y } = this.appWindow.window.getBounds();

    return {
      windowCursorX: cursorPoint.x - x,
      windowCursorY: cursorPoint.y - y,
    };
  }

  /**
   * Send message to all windows
   */
  sendToWebContents(channel: string, data: unknown): void {
    this.appWindow?.sendToWebContents(channel, data);
    this.dashboardWindow?.sendToWebContents(channel, data);
    this.onboardingWindow?.sendToWebContents(channel, data);
    this.offlineWindow?.sendToWebContents(channel, data);
  }

  /**
   * Update native theme
   */
  updateTheme(theme: "light" | "dark" | "system"): void {
    nativeTheme.themeSource = theme;
  }
}

export const windowManager = new WindowManager();
