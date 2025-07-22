import { app } from 'electron';
import { getOnboardingStatus } from '../onboarding';
import { BaseWindow } from './baseWindow';
import { OnboardingWindow } from './OnboardingWindow';
import { isMac } from '../utils/platform';
import { isUndetectabilityEnabled } from '../features/undetectability';

export interface CreateWindowOptions {
  finishedOnboarding?: boolean;
}

type AppWindow = BaseWindow | OnboardingWindow;
type WindowChangeHandler = (window: AppWindow) => void;

class WindowManager {
  private currentWindow: AppWindow | null = null;
  private handlers = new Set<WindowChangeHandler>();

  public handleDockIcon(): void {
    if (!isMac) return;

    const isOnboarding = this.currentWindow instanceof OnboardingWindow;
    if (isUndetectabilityEnabled() && !isOnboarding) {
      app.dock.hide();
    } else {
      app.dock.show();
    }
  }

  createOrRecreateWindow(options?: CreateWindowOptions): AppWindow {
    const creationOptions = {
      undetectabilityEnabled: isUndetectabilityEnabled(),
      ...options,
    };

    if (this.currentWindow && !this.currentWindow.isDestroyed()) {
      this.currentWindow.close();
    }

    if (getOnboardingStatus()) {
      this.currentWindow = new BaseWindow(creationOptions);
    } else {
      this.currentWindow = new OnboardingWindow(creationOptions);
    }

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