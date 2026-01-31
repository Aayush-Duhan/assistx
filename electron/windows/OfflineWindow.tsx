import { CenteredWindow } from "./CenteredWindow";
import { Display } from "electron";
import { IS_DEV } from "../../shared/constants";

/**
 * Offline window shown when network is unavailable
 */
export class OfflineWindow extends CenteredWindow {
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
      width: 600,
      height: 450,
    });
  }

  async loadUrl(): Promise<void> {
    if (IS_DEV && process.env.ELECTRON_RENDERER_URL) {
      this.window.loadURL(`${process.env.ELECTRON_RENDERER_URL}/offline.html`);
      return;
    }
    this.window.loadURL("app://renderer/offline.html");
  }
}
