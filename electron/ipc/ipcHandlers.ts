import { app, desktopCapturer, shell, systemPreferences } from "electron";
import { windowManager } from "../windows/WindowManager";
import { handle, on } from "./ipcMain";
import { checkForUpdates, installUpdate } from "../features/autoUpdater";
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

// MCP Server Status type
type MCPServerStatus = "connected" | "disconnected" | "loading" | "authorizing";

// MCP Server Info type for IPC responses
interface MCPClientInfo {
  id: string;
  name: string;
  status: MCPServerStatus;
  error?: unknown;
  toolInfo: Array<{ name: string; description: string; inputSchema?: Record<string, unknown> }>;
  config: Record<string, unknown>;
  allowedTools?: string[];
}

// Get MCP config path (same logic as mcp-config.service.ts)
function getMcpConfigPath(): string {
  return join(app.getPath("userData"), ".mcp-config.json");
}

// Lazy-loaded MCP service functions from server
// These will be populated once the server is initialized
let mcpService: {
  selectMcpClientsAction: () => Promise<MCPClientInfo[]>;
  refreshMcpClientAction: (id: string) => Promise<void>;
  toggleMcpClientConnectionAction: (id: string, status: MCPServerStatus) => Promise<void>;
  callMcpToolAction: (
    id: string,
    toolName: string,
    input: unknown,
  ) => Promise<Record<string, unknown>>;
  removeMcpClientAction: (id: string) => Promise<void>;
  setMcpAllowedToolsAction: (id: string, allowedTools: string[]) => Promise<void>;
} | null = null;

async function getMcpService() {
  if (!mcpService) {
    // Dynamically import from server once it's loaded
    const service = await import("@server/services/mcp.service");
    mcpService = {
      selectMcpClientsAction: service.selectMcpClientsAction as () => Promise<MCPClientInfo[]>,
      refreshMcpClientAction: service.refreshMcpClientAction,
      toggleMcpClientConnectionAction: service.toggleMcpClientConnectionAction,
      callMcpToolAction: service.callMcpToolAction as (
        id: string,
        toolName: string,
        input: unknown,
      ) => Promise<Record<string, unknown>>,
      removeMcpClientAction: service.removeMcpClientAction,
      setMcpAllowedToolsAction: service.setMcpAllowedToolsAction,
    };
  }
  return mcpService!;
}

export function initializeIpcHandlers(): void {
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
  on("check-for-update", () => {
    checkForUpdates();
  });
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

  // MCP handlers - these use the server's MCP service
  handle("mcp-list-clients", async () => {
    const service = await getMcpService();
    const clients = await service.selectMcpClientsAction();
    return clients.map((c) => ({
      id: c.id,
      name: c.name,
      status: c.status,
      error: c.error,
      toolInfo: c.toolInfo as Array<{
        name: string;
        description: string;
        inputSchema?: Record<string, unknown>;
      }>,
      config: c.config as Record<string, unknown>,
      allowedTools: c.allowedTools,
    }));
  });

  handle("mcp-refresh-client", async (_event, { id }) => {
    const service = await getMcpService();
    await service.refreshMcpClientAction(id);
  });

  handle("mcp-toggle-client", async (_event, { id, status }) => {
    const service = await getMcpService();
    await service.toggleMcpClientConnectionAction(id, status);
  });

  handle("mcp-authorize-client", async (_event, { id }) => {
    // Note: OAuth authorization requires Electron-specific code (shell.openExternal)
    // For now, return undefined - OAuth should be handled via HTTP API or custom flow
    const service = await getMcpService();
    try {
      await service.refreshMcpClientAction(id);
    } catch {
      // Ignore refresh errors
    }
    return { url: undefined };
  });

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  handle("mcp-check-token", async (_event, { id: _id }) => {
    // Token checking is not currently implemented in server MCP service
    // Return false for now - this can be enhanced later
    return { authenticated: false };
  });

  handle("mcp-call-tool", async (_event, { id, toolName, input }) => {
    const service = await getMcpService();
    const result = await service.callMcpToolAction(id, toolName, input);
    return result;
  });

  handle("mcp-get-config-path", async () => {
    return { path: getMcpConfigPath() };
  });

  handle("mcp-open-config", async () => {
    await shell.openPath(getMcpConfigPath());
  });

  handle("mcp-reveal-config", async () => {
    shell.showItemInFolder(getMcpConfigPath());
  });

  handle("mcp-remove-client", async (_event, { id }) => {
    const service = await getMcpService();
    await service.removeMcpClientAction(id);
  });

  handle("mcp-set-allowed-tools", async (_event, { id, allowedTools }) => {
    const service = await getMcpService();
    await service.setMcpAllowedToolsAction(id, allowedTools);
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
}
