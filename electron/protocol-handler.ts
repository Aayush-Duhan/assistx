import { app } from 'electron';
import { electronAppUniversalProtocolClient } from 'electron-app-universal-protocol-client';
import { isMac, isDevelopment } from './utils/platform';
import { windowManager } from './windows/WindowManager';
import { BaseWindow } from './windows/baseWindow';
import { OnboardingWindow } from './windows/OnboardingWindow';

const PROTOCOL_NAME = 'cluely';
type AppWindow = BaseWindow | OnboardingWindow;

/**
 * Parses a protocol URL and sends the data to the renderer process.
 */
function parseProtocolUrl(url: string, window: AppWindow): void {
  try {
    const urlObject = new URL(url);
    const route = urlObject.hostname;
    const params = Object.fromEntries(urlObject.searchParams);

    window.sendToWebContents('protocol-data', { route, params });
  } catch (error) {
    console.error('Failed to parse protocol URL:', url, error);
  }
}

/**
 * Finds a protocol URL in the application's launch arguments.
 */
function handleArgv(window: AppWindow, argv: string[]): void {
  const protocolUrl = argv.find((arg) => arg.startsWith(`${PROTOCOL_NAME}://`));
  if (protocolUrl) {
    parseProtocolUrl(protocolUrl, window);
  }
}

/**
 * Initializes the custom protocol handler for the application.
 */
export function setupProtocolHandler(): void {
  electronAppUniversalProtocolClient.on('request', (url: string) => {
    if (isMac) {
      app.dock.hide();
    }
    const window = windowManager.getCurrentWindow();
    window.sendToWebContents('unhide-window', null);
    parseProtocolUrl(url, window);
  });

  electronAppUniversalProtocolClient.initialize({
    protocol: PROTOCOL_NAME,
    mode: isDevelopment ? 'development' : 'production'
  });

  app.on('second-instance', (_event, argv) => {
    const window = windowManager.getCurrentWindow();
    window.sendToWebContents('unhide-window', null);
    handleArgv(window, argv);
  });

  app.on('activate', () => {
    windowManager.handleDockIcon();
    windowManager.getCurrentWindow().sendToWebContents('unhide-window', null);
  });

  handleArgv(windowManager.getCurrentWindow(), process.argv);
}