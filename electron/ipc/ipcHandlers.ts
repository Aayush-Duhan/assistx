import { app, desktopCapturer, shell, systemPreferences } from "electron";
import { windowManager } from "../windows/WindowManager";
import { handle, on } from "./ipcMain";
import { checkForUpdates, installUpdate } from "../features/autoUpdater";
import { enableDevShortcuts, registerGlobalShortcut, clearAllShortcuts, unregisterGlobalShortcut } from "../features/shortcuts";
import { captureScreenshot } from "../features/screenshot";
import { isMac } from "../utils/platform";
import { startMicMonitor, stopMicMonitor } from "../features/mac/micMonitor";
import { startMacNativeRecorder, stopMacNativeRecorder } from "../features/mac/nativeRecorder";
import { authorizeMcpClientAction, callMcpToolAction, checkTokenMcpClientAction, refreshMcpClientAction, removeMcpClientAction, selectMcpClientsAction, toggleMcpClientConnectionAction } from "../lib/ai/mcp/actions";
import { MCP_CONFIG_PATH } from "../lib/ai/mcp/config-path";
import { getSharedState, updateSharedState } from "../utils/shared/stateManager";

export function initializeIpcHandlers(): void {

  // Shared state
  handle('get-shared-state', () => {
    return getSharedState();
  });

  on('update-shared-state', (_event, updates) => {
    updateSharedState(updates);
  });

  // App Lifecycle
  on('quit-app', () => {
    app.quit();
  });
  on('relaunch-app', () => {
    app.relaunch();
    app.quit();
  });
  // Auto-updater
  on('check-for-update', () => {
    checkForUpdates();
  });
  on('install-update', () => {
    installUpdate();
  });

  // Global shortcuts
  on('register-global-shortcut', (_event, { accelerator }) => {
    registerGlobalShortcut(accelerator);
  });
  on('unregister-global-shortcut', (_event, { accelerator }) => {
    unregisterGlobalShortcut(accelerator);
  });
  on('enable-dev-shortcuts', () => {
    enableDevShortcuts();
  });
  on('reset-global-shortcuts', () => {
    clearAllShortcuts();
  });
  on('focus-window', () => {
    windowManager.getAppWindow()?.focus()
  });
  on('unfocus-window', () => {
    windowManager.getAppWindow()?.blur();
  });

  handle("is-cursor-outside-target-display", () => windowManager.isCursorOutsideTargetDisplay());

  handle("move-window-to-display-containing-cursor", () => ({ postMoveInfo: windowManager.moveToDisplayContainingCursor() }))

  // Screenshot
  handle('capture-screenshot', async () => {
    const { contentType, data } = await captureScreenshot();
    return { contentType, data };
  });

  // External URL opener
  handle('open-external-url', async (_event, { url }) => {
    await shell.openExternal(url);
  });

  // MCP handlers
  handle('mcp-list-clients', async () => {
    const clients = await selectMcpClientsAction();
    return clients.map((c) => ({
      id: c.id,
      name: c.name,
      status: c.status,
      error: c.error,
      toolInfo: c.toolInfo,
      config: c.config,
    }));
  });

  handle('mcp-refresh-client', async (_event, { id }) => {
    await refreshMcpClientAction(id);
  });

  handle('mcp-toggle-client', async (_event, { id, status }) => {
    await toggleMcpClientConnectionAction(id, status);
  });

  handle('mcp-authorize-client', async (_event, { id }) => {
    const url = await authorizeMcpClientAction(id).catch(() => undefined);
    return { url };
  });

  handle('mcp-check-token', async (_event, { id }) => {
    const authenticated = await checkTokenMcpClientAction(id);
    return { authenticated };
  });

  handle('mcp-call-tool', async (_event, { id, toolName, input }) => {
    const result = await callMcpToolAction(id, toolName, input);
    return result as any;
  });

  handle('mcp-get-config-path', async () => {
    return { path: MCP_CONFIG_PATH };
  });

  handle('mcp-open-config', async () => {
    await shell.openPath(MCP_CONFIG_PATH);
  });

  handle('mcp-reveal-config', async () => {
    shell.showItemInFolder(MCP_CONFIG_PATH);
  });

  handle('mcp-remove-client', async (_event, { id }) => {
    await removeMcpClientAction(id);
  });
  // Permissions
  handle('request-media-permission', async (_event, mediaType) => {
    if (isMac) {
      if (mediaType === 'screen') {
        try {
          // This is a proxy for checking screen recording permission.
          // It will throw if permission is denied or not yet granted.
          await desktopCapturer.getSources({ types: ['screen'] });
          return true;
        } catch {
          return false;
        }
      }
      try {
        const status = systemPreferences.getMediaAccessStatus(mediaType);
        if (status === 'not-determined') {
          return await systemPreferences.askForMediaAccess(mediaType);
        }
        return status === 'granted';
      } catch (error) {
        return false;
      }
    }
    // Assume granted on other platforms for now
    return true;
  });
  // macOS-specific handlers
  if (isMac) {

    on('mac-open-system-settings', (_event, { section }) => {
      if (section === 'privacy > microphone') {
        shell.openExternal('x-apple.systempreferences:com.apple.preference.security?Privacy_Microphone');
      } else if (section === 'privacy > screen-recording') {
        shell.openExternal('x-apple.systempreferences:com.apple.preference.security?Privacy_ScreenCapture');
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