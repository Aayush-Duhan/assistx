import { app, desktopCapturer, Menu, MenuItemConstructorOptions, protocol, screen, session } from 'electron';
import { electronApp } from '@electron-toolkit/utils';
import * as dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });
import { isDev, isMac, isWindows } from './utils/platform';
import { windowManager } from './windows/WindowManager';
import { initializeIpcHandlers } from './ipc/ipcHandlers';
import { applyGlobalShortcuts } from './features/shortcuts';
import { initializeUpdater } from './features/autoUpdater';
import { getAvailableDisplays } from './windows/OverlayManager';
import { setupMainProtocolHandlers } from './protocol-handler';

const APP_ID = 'assistx';

if (isMac) {
  app.dock.hide();
}

if (isWindows) {
  if (!app.requestSingleInstanceLock()) {
    app.quit();
    process.exit(0);
  }
}

if (!isDev) {
  protocol.registerSchemesAsPrivileged([
    {
      scheme: 'app',
      privileges: {
        standard: true,
        secure: true,
        supportFetchAPI: true,
      },
    },
  ]);
}

app.on('activate', () => {
  windowManager.handleDockIcon();
  windowManager.getCurrentWindow().sendToWebContents("unhide-window", null);
});

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
          const displays = screen.getAllDisplays();
          for (const display of displays) {
            if (display.internal) {
              const source = sources.find((s) => s.display_id === String(display.id));
              if (source) {
                callback({ video: source, audio: 'loopback' });
                return;
              }
            }
          }
          const i = screen.getPrimaryDisplay();
          const source = sources.find((s) => s.display_id === String(i.id));
          if (source) {
            callback({ video: source, audio: 'loopback' });
            return;
          }
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
  setupMainProtocolHandlers();
}

main();