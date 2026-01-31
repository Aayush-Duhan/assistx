import { BaseWindow } from "./baseWindow";
import { Display } from "electron";

const clamp = (value: number, min: number, max: number) => Math.max(Math.min(value, max), min);

/**
 * Base class for centered windows (dashboard, onboarding, offline)
 */
export abstract class CenteredWindow extends BaseWindow {
  constructor(
    options: Electron.BrowserWindowConstructorOptions,
    moreOptions: {
      initialDisplay: Display;
      skipTaskbar: () => boolean;
      width: number;
      height: number;
      minWidth?: number;
      minHeight?: number;
    },
  ) {
    const minWidth = moreOptions.minWidth ?? moreOptions.width;
    const minHeight = moreOptions.minHeight ?? moreOptions.height;

    super(
      {
        minWidth,
        minHeight,
        ...options,
      },
      moreOptions,
    );

    // Center window on display
    const { workArea } = moreOptions.initialDisplay;

    const width = clamp(moreOptions.width, minWidth, workArea.width - 100);
    const height = clamp(moreOptions.height, minHeight, workArea.height - 100);

    this.window.setBounds({
      x: workArea.x + (workArea.width - width) / 2,
      y: workArea.y + (workArea.height - height) / 2,
      width,
      height,
    });
  }
}
