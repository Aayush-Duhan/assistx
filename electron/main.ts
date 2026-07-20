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

import { setServerConfig } from "./utils/serverConfig";

dotenv.config({ path: ".env.local" });

const APP_ID = "assistx";

/**
 * Start the Fastify server in-process.
 * Electron ships with Node.js, so we run the server directly
 * without spawning a separate child process.
 */
async function startServer(): Promise<void> {
  try {
    process.env.ASSISTX_DATA_PATH = app.getPath("userData");

    const { app: serverApp, initializeApp, getSessionToken } = await import("@server/app");
    await initializeApp();
    const targetPort = process.env.PORT ? parseInt(process.env.PORT, 10) : 0;
    await serverApp.listen({ port: targetPort, host: "127.0.0.1" });

    const address = serverApp.server.address();
    const resolvedPort =
      typeof address === "object" && address !== null ? address.port : targetPort;
    const token = getSessionToken();

    setServerConfig({
      port: resolvedPort,
      host: "127.0.0.1",
      baseUrl: `http://127.0.0.1:${resolvedPort}/api`,
      wsUrl: `ws://127.0.0.1:${resolvedPort}/api`,
      token,
    });
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
      windowManager.sendToWebContents("reset-widget-position", null);
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

  // Server must start before windows so renderer API requests succeed
  await startServer();
  windowManager.recreateWindowsForView();
}

main();
