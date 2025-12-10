import { Display } from 'electron';
import { CenteredWindow } from './CenteredWindow';

/**
 * Represents the onboarding window shown to new users.
 */
export class OnboardingWindow extends CenteredWindow {
  constructor(display: Display) {
    const options: Electron.BrowserWindowConstructorOptions = {
      frame: false,
      resizable: false,
      maximizable: false,
      fullscreenable: false,
      minimizable: false,
    };

    super(options, {
      initialDisplay: display,
      skipTaskbar: () => false,
      width: 1100,
      height: 720,
    });
  }

  async loadUrl(): Promise<void> {
    await this.loadLocalPage("onboarding.html");
  }
}