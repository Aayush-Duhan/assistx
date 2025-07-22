import { app, desktopCapturer, Menu, MenuItemConstructorOptions, screen, session } from 'electron';
import { electronApp } from '@electron-toolkit/utils';
import * as dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });
import { isMac, isWindows } from './utils/platform';
import { windowManager } from './windows/WindowManager';
import { initializeIpcHandlers } from './ipc/ipcHandlers';
import { applyGlobalShortcuts } from './features/shortcuts';
import { initializeUpdater } from './features/autoUpdater';
import { getAvailableDisplays } from './windows/OverlayManager';

const APP_ID = 'AssistX';

if (isMac) {
  app.dock.hide();
}

if (isWindows) {
  if (!app.requestSingleInstanceLock()) {
    app.quit();
    process.exit(0);
  }
}

function initializeDisplayListeners(): void {
  const handler = () => {
    windowManager.getCurrentWindow().moveToPrimaryDisplay();
    const displays = getAvailableDisplays();
    windowManager.getCurrentWindow().sendToWebContents('available-displays', { displays });
  };
  screen.on('display-added', handler);
  screen.on('display-removed', handler);
  screen.on('display-metrics-changed', handler);
}

function setupAppMenu(): void {
  const template: (MenuItemConstructorOptions)[] = [
    { role: 'editMenu' }
  ];
  const menu = Menu.buildFromTemplate(template);
  Menu.setApplicationMenu(menu);
}

function setupDisplayMediaHandler(): void {
  session.defaultSession.setDisplayMediaRequestHandler(
    (_request, callback) => {
      desktopCapturer
        .getSources({ types: ['screen'] })
        .then((sources) => {
          // TODO: This currently just picks the first screen. It should be smarter.
          callback({ video: sources[0], audio: 'loopback' });
        })
        .catch(() => {
          callback({});
        });
    }
  );
}

async function main(): Promise<void> {
  await app.whenReady();

  electronApp.setAppUserModelId(`com.${APP_ID}`);

  setupAppMenu();
  setupDisplayMediaHandler();

  windowManager.createOrRecreateWindow();

  initializeUpdater();
  initializeIpcHandlers();
  initializeDisplayListeners();
  applyGlobalShortcuts();
}

main();