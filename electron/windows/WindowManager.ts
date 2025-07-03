import { app } from 'electron';
import { getHasOnboarded } from '../onboarding';
import { BaseWindow } from './baseWindow';
import { OnboardingWindow } from './OnboardingWindow';
import { isMac } from '../utils/platform';

type AppWindow = BaseWindow | OnboardingWindow;
type WindowChangeHandler = (window: AppWindow) => void;

class WindowManager {
  currentWindow: AppWindow | null = null;
  private handlers: Set<WindowChangeHandler> = new Set();
  private extraConfig: { skipUndetectability: boolean } = { skipUndetectability: false };

  handleDockIcon() {
    if (!isMac) return;
    if (this.currentWindow instanceof OnboardingWindow || this.extraConfig.skipUndetectability) {
      app.dock.show();
    } else {
      app.dock.hide();
    }
  }

  createWindow(): AppWindow {
    const options = { skipUndetectability: this.extraConfig.skipUndetectability };
    this.currentWindow = getHasOnboarded() ? new BaseWindow(undefined, options) : new OnboardingWindow(options);

    // Notify all listeners about the new window
    for (const handler of this.handlers) {
      handler(this.currentWindow);
    }
    this.handleDockIcon();
    return this.currentWindow;
  }

  /**
   * Gets the currently active window.
   * Throws an error if a window has not been created yet.
   */
  getCurrentWindow(): AppWindow {
    if (!this.currentWindow) {
      throw new Error('No current window. Did you call createWindow()?');
    }
    return this.currentWindow;
  }

  recreateWindow(): void {
    if (this.currentWindow) {
      this.currentWindow.close();
    }
    this.createWindow();
  }

  /**
   * Toggles the skipUndetectability flag and recreates the window.
   */
  toggleSkipUndetectability() {
    this.extraConfig.skipUndetectability = !this.extraConfig.skipUndetectability;
    this.recreateWindow();
  }

  /**
   * Registers a handler to be called whenever the window instance changes.
   * Runs the handler immediately with the current window if it exists.
   * @returns A function to unregister the handler.
   */
  onWindowChange(handler: WindowChangeHandler): () => void {
    this.handlers.add(handler);
    if (this.currentWindow) {
      handler(this.currentWindow);
    }

    return () => {
      this.handlers.delete(handler);
    };
  }
}

export const windowManager = new WindowManager();