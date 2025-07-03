import { screen, BrowserWindowConstructorOptions } from 'electron';
import { join as joinPath } from 'node:path';
import { BaseWindow } from './baseWindow';

const __dirname = import.meta.dirname;

export class OnboardingWindow extends BaseWindow {
  constructor(extraConfig: { skipUndetectability: boolean }) {
    const options: BrowserWindowConstructorOptions = {
      show: true,
      alwaysOnTop: false,
      transparent: true,
      frame: false,
      roundedCorners: false,
      hasShadow: true,
      fullscreenable: false,
      minimizable: false,
      hiddenInMissionControl: false,
      skipTaskbar: true,
      webPreferences: {
        preload: joinPath(__dirname, 'preload.cjs'),
      } 
    };
    super(options, extraConfig);
    super.moveToPrimaryDisplay();
  }

  /**
   * Overrides the base method to make the window interactive.
   */
  setIgnoreMouseEvents(_ignore: boolean): void {
    // No-op: This window should always be interactive.
  }

  /**
   * Overrides the base method to center the window.
   */
  moveToPrimaryDisplay(): void {
    const primaryDisplay = screen.getPrimaryDisplay();
    this.window.setSize(primaryDisplay.workArea.width, primaryDisplay.workArea.height);
    this.window.center();
  }
}