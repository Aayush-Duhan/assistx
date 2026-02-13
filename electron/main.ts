import {
  app,
  desktopCapturer,
  Menu,
  MenuItemConstructorOptions,
  protocol,
  screen,
  session,
} from "electron";
import { electronApp } from "@electron-toolkit/utils";
import * as dotenv from "dotenv";
import { IS_DEV, IS_MAC, IS_WINDOWS } from "@/shared/constants";
import { windowManager } from "./windows/WindowManager";
import { initializeIpcHandlers } from "./ipc/ipcHandlers";
import { refreshGlobalShortcuts } from "./features/shortcuts";
import { initializeUpdater } from "./features/autoUpdater";
import { setupMainProtocolHandlers } from "./protocol-handler";
import { updateSharedState } from "./utils/shared/stateManager";

dotenv.config({ path: ".env.local" });

const APP_ID = "assistx";

/**
 * Start the Fastify server in-process.
 * Electron ships with Node.js, so we run the server directly
 * without spawning a separate child process.
 */
async function startServer(): Promise<void> {
  try {
    process.env.ASSISTX_USER_DATA_PATH = app.getPath("userData");

    const { app: serverApp, initializeApp } = await import("@server/app");
    await initializeApp();
    await serverApp.listen({ port: 3000, host: "127.0.0.1" });
  } catch (err) {
    // console.error is used as fallback since logger may not be available if import failed
    console.error("Server failed to start:", err);
  }
}

if (process.defaultApp) {
  if (process.argv.length >= 2) {
    app.setAsDefaultProtocolClient(APP_ID, process.execPath, [process.argv[1]]);
  }
} else {
  app.setAsDefaultProtocolClient(APP_ID);
}

if (IS_MAC) {
  app.dock?.hide();
}

if (IS_WINDOWS) {
  if (!app.requestSingleInstanceLock()) {
    app.quit();
    process.exit(0);
  }
}

if (!IS_DEV) {
  protocol.registerSchemesAsPrivileged([
    {
      scheme: "app",
      privileges: {
        standard: true,
        secure: true,
        supportFetchAPI: true,
      },
    },
  ]);
}

app.on("activate", () => {
  windowManager.handleDockIcon();
  updateSharedState({ showDashboard: true });
});

function initializeDisplayListeners(): void {
  function handleDisplayChange(): void {
    const targetDisplay = windowManager.getTargetDisplay();
    const displayExists = screen.getAllDisplays().some((d) => d.id === targetDisplay.id);

    if (displayExists) {
      windowManager.setTargetDisplay(targetDisplay);
    } else {
      windowManager.setTargetDisplay(screen.getPrimaryDisplay());
      windowManager.sendToWebContents("reset-hud-position", null);
    }
  }

  screen.on("display-added", handleDisplayChange);
  screen.on("display-removed", handleDisplayChange);
  screen.on("display-metrics-changed", handleDisplayChange);
}

function setupAppMenu(): void {
  const template: MenuItemConstructorOptions[] = [{ role: "editMenu" }];
  const menu = Menu.buildFromTemplate(template);
  Menu.setApplicationMenu(menu);
}

function setupDisplayMediaHandler(): void {
  session.defaultSession.setDisplayMediaRequestHandler(async (_request, callback) => {
    try {
      const sources = await desktopCapturer.getSources({ types: ["screen"] });
      const displays = screen.getAllDisplays();

      // Prefer the internal display
      for (const display of displays) {
        if (display.internal) {
          const source = sources.find((s) => s.display_id === String(display.id));
          if (source) {
            callback({ video: source, audio: "loopback" });
            return;
          }
        }
      }

      // Fall back to primary display, then first available source
      const primaryDisplay = screen.getPrimaryDisplay();
      const primarySource = sources.find((s) => s.display_id === String(primaryDisplay.id));
      callback({ video: primarySource ?? sources[0], audio: "loopback" });
    } catch {
      callback({});
    }
  });
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

  await startServer();
}

main();
