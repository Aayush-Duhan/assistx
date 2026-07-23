import { app, desktopCapturer, shell, systemPreferences, BrowserWindow } from "electron";
import { windowManager } from "../windows/WindowManager";
import { handle, on } from "./ipcMain";
import {
  checkForUpdates,
  getUpdateStatus,
  installUpdate,
} from "../features/autoUpdater";
import { getVersionInfo } from "../utils/versionInfo";
import {
  enableDevShortcuts,
  registerGlobalShortcut,
  clearAllShortcuts,
  unregisterGlobalShortcut,
} from "../features/shortcuts";
import { captureScreenshot } from "../features/screenshot";
import { IS_MAC } from "@/shared/constants";
import { getSharedState, updateSharedState } from "../utils/shared/stateManager";
import { join } from "path";

import { getServerConfig } from "../utils/serverConfig";

// Get MCP config path (same logic as mcp-config.service.ts)
function getMcpConfigPath(): string {
  return join(app.getPath("userData"), ".mcp-config.json");
}

export function initializeIpcHandlers(): void {
  // Server configuration for renderer
  handle("get-server-config", () => {
    return getServerConfig();
  });

  // Shared state
  handle("get-shared-state", () => {
    return getSharedState();
  });

  on("update-shared-state", (_event, updates) => {
    updateSharedState(updates);
  });

  // App Lifecycle
  on("quit-app", () => {
    app.quit();
  });
  on("relaunch-app", () => {
    app.relaunch();
    app.quit();
  });
  // Auto-updater
  handle("check-for-updates", () => checkForUpdates());
  handle("get-update-status", () => getUpdateStatus());
  handle("get-version-info", () => getVersionInfo());
  on("install-update", () => {
    installUpdate();
  });

  // Global shortcuts
  on("register-global-shortcut", (_event, { accelerator }) => {
    registerGlobalShortcut(accelerator);
  });
  on("unregister-global-shortcut", (_event, { accelerator }) => {
    unregisterGlobalShortcut(accelerator);
  });
  on("enable-dev-shortcuts", () => {
    enableDevShortcuts();
  });
  on("reset-global-shortcuts", () => {
    clearAllShortcuts();
  });
  on("focus-window", () => {
    windowManager.getAppWindow()?.focus();
  });
  on("unfocus-window", () => {
    windowManager.getAppWindow()?.blur();
  });

  handle("is-cursor-outside-target-display", () => windowManager.isCursorOutsideTargetDisplay());

  handle("move-window-to-display-containing-cursor", () => ({
    postMoveInfo: windowManager.moveToDisplayContainingCursor(),
  }));

  // Screenshot
  handle("capture-screenshot", async () => {
    const { contentType, data } = await captureScreenshot();
    return { contentType, data };
  });

  // External URL opener
  handle("open-external-url", async (_event, { url }) => {
    await shell.openExternal(url);
  });

  // MCP configuration OS handlers
  handle("mcp-get-config-path", async () => {
    return { path: getMcpConfigPath() };
  });

  handle("mcp-open-config", async () => {
    await shell.openPath(getMcpConfigPath());
  });

  handle("mcp-reveal-config", async () => {
    shell.showItemInFolder(getMcpConfigPath());
  });
  // Permissions
  handle("request-media-permission", async (_event, mediaType) => {
    if (IS_MAC) {
      if (mediaType === "screen") {
        try {
          // This is a proxy for checking screen recording permission.
          // It will throw if permission is denied or not yet granted.
          await desktopCapturer.getSources({ types: ["screen"] });
          return true;
        } catch {
          return false;
        }
      }
      if (mediaType === "accessibility") {
        // Accessibility permission check is not available via systemPreferences
        return true;
      }
      try {
        const status = systemPreferences.getMediaAccessStatus(
          mediaType as "microphone" | "camera" | "screen",
        );
        if (status === "not-determined") {
          return await systemPreferences.askForMediaAccess(mediaType as "microphone" | "camera");
        }
        return status === "granted";
      } catch {
        return false;
      }
    }
    // Assume granted on other platforms for now
    return true;
  });
  // macOS-specific handlers
  if (IS_MAC) {
    on("mac-open-system-settings", (_event, { section }) => {
      if (section === "privacy > microphone") {
        shell.openExternal(
          "x-apple.systempreferences:com.apple.preference.security?Privacy_Microphone",
        );
      } else if (section === "privacy > screen-recording") {
        shell.openExternal(
          "x-apple.systempreferences:com.apple.preference.security?Privacy_ScreenCapture",
        );
      }
    });

    // on('mac-set-native-recorder-enabled', (_event, { enabled }) => {
    //   if (enabled) {
    //     startMacNativeRecorder(getCurrentWindow());
    //   } else {
    //     stopMacNativeRecorder();
    //   }
    // });

    // on('mac-set-mic-monitor-enabled', (_event, { enabled }) => {
    //   if (enabled) {
    //     startMicMonitor(getCurrentWindow());
    //   } else {
    //     stopMicMonitor();
    //   }
    // });
  }

  handle("open-oauth-popup", async (_event, { url, redirectUrlPrefix }) => {
    return new Promise((resolve) => {
      const authWindow = new BrowserWindow({
        width: 600,
        height: 800,
        show: true,
        webPreferences: {
          nodeIntegration: false,
          contextIsolation: true,
        },
      });

      let resolved = false;

      const handleCallback = (currentUrl: string) => {
        if (currentUrl.startsWith(redirectUrlPrefix)) {
          const parsed = new URL(currentUrl);
          const code = parsed.searchParams.get("code");
          const error = parsed.searchParams.get("error");
          
          resolved = true;
          authWindow.destroy();
          resolve({ code, error });
        }
      };

      authWindow.webContents.on("will-navigate", (_e, currentUrl) => {
        handleCallback(currentUrl);
      });

      authWindow.webContents.on("will-redirect", (_e, currentUrl) => {
        handleCallback(currentUrl);
      });

      authWindow.on("closed", () => {
        if (!resolved) {
          resolve({ code: null, error: "Window closed by user" });
        }
      });

      authWindow.loadURL(url).catch((err) => {
        console.error("Failed to load OAuth URL:", err);
        resolved = true;
        authWindow.destroy();
        resolve({ code: null, error: "Failed to load URL" });
      });
    });
  });

  handle("open-oauth-external", async (_event, { url }) => {
    try {
      await shell.openExternal(url);
      return { success: true };
    } catch (err) {
      console.error("Failed to open OAuth URL externally:", err);
      return { success: false };
    }
  });
}

