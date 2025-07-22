import { desktopCapturer } from 'electron';
import { Buffer } from 'node:buffer';
import { isMac } from '../utils/platform';
import { windowManager } from '../windows/WindowManager';
import { resetOnboarding } from '../onboarding';

interface Screenshot {
  data: Buffer;
  contentType: 'image/png';
}

/**
 * Captures a screenshot of the entire desktop using Electron's desktopCapturer.
 * This avoids the __dirname issue with the screenshot-desktop library.
 */
export async function captureScreenshot(): Promise<Screenshot> {
  const currentDisplay = windowManager.getCurrentWindow().getCurrentDisplay();
  try {
    const sources = await desktopCapturer.getSources({
      types: ['screen'],
      thumbnailSize: {
        width: currentDisplay.bounds.width,
        height: currentDisplay.bounds.height
      }
    });

    const source = sources.find((s) => s.display_id === currentDisplay.id.toString());
    if (!source) {
      throw new Error('Unable to capture screenshot: no display source found');
    }
    return { data: source.thumbnail.toPNG(), contentType: 'image/png' };
  } catch (error) {
    if (isMac) {
      resetOnboarding();
    }
    throw error;
  }
}