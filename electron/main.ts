import { app, desktopCapturer, Menu, MenuItemConstructorOptions, protocol, screen, session } from 'electron';
import { electronApp } from '@electron-toolkit/utils';
import * as dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });
import { isDev, isMac, isWindows } from './utils/platform';
import { windowManager } from './windows/WindowManager';
import { initializeIpcHandlers } from './ipc/ipcHandlers';
import { refreshGlobalShortcuts } from './features/shortcuts';
import { initializeUpdater } from './features/autoUpdater';
import { initMCPManager } from './lib/ai/mcp/mcp-manager';
import { setupMainProtocolHandlers } from './protocol-handler';
import { updateSharedState } from './utils/shared/stateManager';
import { app as serverApp } from '@server/app';

async function startServer() {
  try {
    const address = await serverApp.listen({ port: 3000, host: '127.0.0.1' });
    console.log(`Server listening at ${address}`);
  } catch (err) {
    console.error('Server failed to start:', err);
  }
}

const APP_ID = 'assistx';
const PROTOCOL_NAME = 'assistx';

// Register protocol handler for deep links (assistx://)
if (process.defaultApp) {
  if (process.argv.length >= 2) {
    app.setAsDefaultProtocolClient(PROTOCOL_NAME, process.execPath, [process.argv[1]]);
  }
} else {
  app.setAsDefaultProtocolClient(PROTOCOL_NAME);
}

if (isMac) {
  app.dock?.hide();
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
  updateSharedState({ showDashboard: true });
});

function initializeDisplayListeners(): void {
  const handler = () => {
    const targetDisplay = windowManager.getTargetDisplay();
    const displayExists = screen.getAllDisplays().some((d) => d.id === targetDisplay.id);
    if (displayExists) {
      windowManager.setTargetDisplay(targetDisplay);
    } else {
      windowManager.setTargetDisplay(screen.getPrimaryDisplay());
      windowManager.sendToWebContents("reset-hud-position", null);
    }
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

  initializeUpdater();
  initializeIpcHandlers();
  initializeDisplayListeners();
  refreshGlobalShortcuts();
  setupMainProtocolHandlers();
  windowManager.recreateWindowsForView();
  await initMCPManager();
  startServer();
}

main();