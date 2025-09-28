import { app, desktopCapturer, shell, systemPreferences } from "electron";
import { windowManager } from "../windows/WindowManager";
import { handle, on } from "./ipcMain";
import { checkForUpdate, getUpdaterState, quitAndInstallUpdate } from "../features/autoUpdater";
import { finishOnboarding, getOnboardingStatus, resetOnboarding } from "../onboarding";
import { isUndetectabilityEnabled, toggleUndetectability } from "../features/undetectability";
import { enableDevShortcuts, registerGlobalShortcut, resetGlobalShortcuts, unregisterGlobalShortcut } from "../features/shortcuts";
import { captureScreenshot } from "../features/screenshot";
import { displayOverlayManager, getAvailableDisplays, getDisplayById } from "../windows/OverlayManager";
import { isMac } from "../utils/platform";
import { startMicMonitor, stopMicMonitor } from "../features/mac/micMonitor";
import { checkMacOsVersion } from "../features/mac/utils";
import { startMacNativeRecorder, stopMacNativeRecorder } from "../features/mac/nativeRecorder";
import { clearTokens, getStatus, sendGmailEmail, setOAuthClient, startOAuthFlow } from "../features/gmailOAuth";
import { authorizeMcpClientAction, callMcpToolAction, checkTokenMcpClientAction, refreshMcpClientAction, removeMcpClientAction, selectMcpClientsAction } from "../lib/ai/mcp/actions";
import { MCP_CONFIG_PATH } from "../lib/ai/mcp/config-path";

export function initializeIpcHandlers(): void {
  let currentWindow = windowManager.getCurrentWindow();
  windowManager.onWindowChange((newWindow) => {
    currentWindow = newWindow;
  });

  // App Lifecycle
  on('quit-app', () => {
    app.quit();
  });
  on('restart-window', () => {
    windowManager.createOrRecreateWindow();
  });
  // Auto-updater
  on('check-for-update', () => {
    checkForUpdate();
  });
  on('install-update', () => {
    quitAndInstallUpdate();
  });
  on('get-update-status', () => {
    currentWindow.sendToWebContents('update-status', { status: getUpdaterState() });
  });

  // Onboarding
  handle('request-has-onboarded', async () => ({ hasOnboarded: getOnboardingStatus() }));
  on('finish-onboarding', () => {
    finishOnboarding();
  });
  on('reset-onboarding', () => {
    resetOnboarding();
  });

  // Undetectability / Invisible Mode
  on('get-invisible', () => {
    currentWindow.sendToWebContents('invisible-changed', {
      invisible: isUndetectabilityEnabled(),
    });
  });
  on('toggle-invisible', () => {
    toggleUndetectability();
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
    resetGlobalShortcuts(); 
  });
  on('toggle-visibility', () => {
    currentWindow.toggleVisibility();
  });
  // Window management
  on('set-ignore-mouse-events', (_event, { ignore }) => {
    currentWindow.setIgnoreMouseEvents(ignore);
  });
  on('resize-window', (_event, { width, height, duration }) => {
    currentWindow.resizeWindow(width, height, duration);
  });
  on('focus-window', () => {
    currentWindow.focus();
  });
  on('unfocus-window', () => {
    currentWindow.blur();
  });
  handle('request-window-visibility', async () => ({ visible: currentWindow.isVisible() }));

  // Screenshot
  handle('capture-screenshot', async () => {
    const { contentType, data } = await captureScreenshot();
    return { contentType, data };
  });

  // External URL opener
  handle('open-external-url', async (_event, { url }) => {
    await shell.openExternal(url);
  });

  // Gmail integration handlers
  handle('gmail-set-oauth-client', async (_event, payload) => {
    setOAuthClient(payload);
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
  handle('gmail-get-status', async () => {
    return getStatus();
  });
  handle('gmail-login', async () => {
    try {
      await startOAuthFlow();
      return { success: true };
    } catch (e) {
      return { success: false };
    }
  });
  handle('gmail-logout', async () => {
    clearTokens();
  });
  handle('gmail-send', async (_event, payload) => {
    await sendGmailEmail(payload);
    return { success: true };
  });
  // Display management
  on('get-available-displays', () => {
    const displays = getAvailableDisplays();
    currentWindow.sendToWebContents('available-displays', { displays });
  });
  on('move-window-to-display', (_event, { displayId }) => {
    const display = getDisplayById(displayId);
    if (display) {
      currentWindow.moveToDisplay(display);
    }
  });
  on('show-display-overlay', () => {
    displayOverlayManager.showOverlays();
  });
  on('hide-display-overlay', () => {
    displayOverlayManager.hideOverlays();
  });
  on('highlight-display', (_event, { displayId }) => {
    displayOverlayManager.highlightDisplay(displayId);
  });
  on('unhighlight-display', (_event, { displayId }) => {
    displayOverlayManager.unhighlightDisplay(displayId);
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
    handle('mac-check-macos-version', async () => {
      const { isSupported } = await checkMacOsVersion();
      return { isSupported };
    });

    on('mac-open-system-settings', (_event, { section }) => {
      if (section === 'privacy > microphone') {
        shell.openExternal('x-apple.systempreferences:com.apple.preference.security?Privacy_Microphone');
      } else if (section === 'privacy > screen-recording') {
        shell.openExternal('x-apple.systempreferences:com.apple.preference.security?Privacy_ScreenCapture');
      }
    });

    on('mac-set-native-recorder-enabled', (_event, { enabled }) => {
      if (enabled) {
        startMacNativeRecorder(currentWindow);
      } else {
        stopMacNativeRecorder();
      }
    });

    on('mac-set-mic-monitor-enabled', (_event, { enabled }) => {
      if (enabled) {
        startMicMonitor(currentWindow);
      } else {
        stopMicMonitor();
      }
    });
  }
}