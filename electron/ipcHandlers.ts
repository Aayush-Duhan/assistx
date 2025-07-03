import { ipcMain, app, desktopCapturer, systemPreferences, shell, IpcMainEvent, IpcMainInvokeEvent } from 'electron';
import { autoUpdater } from 'electron-updater';
import { windowManager } from './windows/WindowManager';
import { getHasOnboarded, setOnboarded } from './onboarding';
import { captureScreenshot } from './utils/screenshot';
import { isMac } from './utils/platform';
import { displayOverlayManager, getAvailableDisplays, getDisplayById } from './display-overlay-manager';
import { enableDevShortcuts, registerGlobalShortcut, resetGlobalShortcuts, unregisterGlobalShortcut } from './shortcuts';

// Mac-specific imports
import { 
  checkMacosVersion, 
  startMacNativeRecorder, 
  stopMacNativeRecorder, 
  enableMicMonitor, 
  disableMicMonitor 
} from './mac';

/**
 * Sets up all ipcMain listeners and handlers.
 */
export function setupIpcHandlers(): void {
  let currentWindow = windowManager.getCurrentWindow();
  // Ensure the window reference is always up-to-date.
  windowManager.onWindowChange((newWindow) => {
    currentWindow = newWindow;
  });

  // --- App control events ---
  ipcMain.on('quit-app', () => {
    app.quit();
  });

  // --- Auto-updater events ---
  ipcMain.on('check-for-update', () => {
    autoUpdater.checkForUpdatesAndNotify();
  });
  ipcMain.on('install-update', () => {
    autoUpdater.quitAndInstall();
  });

  // --- App info requests ---
  ipcMain.handle('get-app-version', async (): Promise<string> => {
    return app.getVersion();
  });

  ipcMain.handle('get-app-name', async (): Promise<string> => {
    return process.env.APP_NAME || 'Yolo';
  });

  // --- Platform info ---
  ipcMain.handle('get-platform', async (): Promise<string> => {
    return process.platform;
  });

  // --- Onboarding ---
  ipcMain.handle('request-has-onboarded', async () => ({ hasOnboarded: getHasOnboarded() }));
  ipcMain.handle('set-has-onboarded-true', async () => {
    setOnboarded();
    return { success: true };
  });

  // --- Permissions ---
  ipcMain.handle('request-media-permission', async (_event: IpcMainInvokeEvent, type: 'microphone' | 'camera' | 'screen'): Promise<boolean> => {
    if (isMac) {
      if (type === 'screen') {
        try {
          await desktopCapturer.getSources({ types: ['screen'] });
          return true;
        } catch {
          return false;
        }
      }
      try {
        const status = systemPreferences.getMediaAccessStatus(type);
        if (status === 'not-determined') {
          return await systemPreferences.askForMediaAccess(type);
        }
        return status === 'granted';
      } catch (error) {
        console.error('Media permission error:', error);
        return false;
      }
    }
    return true;
  });

  // --- Global shortcuts ---
  ipcMain.on('register-global-shortcut', (_event: IpcMainEvent, { accelerator }: { accelerator: string }) => {
    registerGlobalShortcut(accelerator);
  });

  ipcMain.on('unregister-global-shortcut', (_event: IpcMainEvent, { accelerator }: { accelerator: string }) => {
    unregisterGlobalShortcut(accelerator);
  });

  // --- Window manipulation ---
  ipcMain.on('set-ignore-mouse-events', (_event: IpcMainEvent, { ignore }: { ignore: boolean }) => {
    currentWindow.setIgnoreMouseEvents(ignore);
  });
  ipcMain.on('resize-window', (_event: IpcMainEvent, { width, height, duration }: { width: number; height: number; duration: number }) => {
    currentWindow.resizeWindow(width, height, duration);
  });
  ipcMain.on('focus-window', () => {
    currentWindow.focus();
  });
  
  ipcMain.on('unfocus-window', () => {
    currentWindow.window.blur();
  });
  
  ipcMain.on('toggle-visibility', () => {
    currentWindow.toggleVisibility();
  });

  ipcMain.on('hide-window', () => {
    currentWindow.hide();
  });

  ipcMain.handle('get-visibility', async (): Promise<boolean> => {
    return currentWindow.isVisible();
  });

  ipcMain.on('open-external-url', (_event: IpcMainEvent, url: string) => {
    shell.openExternal(url);
  });

  ipcMain.on('reset-global-shortcuts', () => {
    resetGlobalShortcuts();
  });
  
  ipcMain.on('enable-dev-shortcuts', () => {
    enableDevShortcuts();
  });

  // --- Features ---
  ipcMain.handle('capture-screenshot', async () => {
    const { contentType, data } = await captureScreenshot();
    return { contentType, data };
  });

  // Add the correct handler for the screenshot capture that the renderer expects
  ipcMain.on('capture-screenshot', async (_event: IpcMainEvent) => {
    try {
      const { contentType, data } = await captureScreenshot();
      
      // Send the screenshot back to the renderer via the expected event
      currentWindow.sendToWebContents('new-screenshot', { contentType, data });
    } catch (error) {
      console.error('Screenshot capture failed:', error);
      // Send null to indicate failure
      currentWindow.sendToWebContents('new-screenshot', null);
    }
  });

  // --- Display overlay management ---
  ipcMain.handle('get-available-displays', async () => {
    return getAvailableDisplays();
  });

  ipcMain.on('move-window-to-display', (_event: IpcMainEvent, { displayId }: { displayId: number }) => {
    const display = getDisplayById(displayId);
    if (display) {
      currentWindow.moveToDisplay(display);
    }
  });

  ipcMain.on('show-display-overlays', () => {
    displayOverlayManager.showOverlays();
  });

  ipcMain.on('hide-display-overlays', () => {
    displayOverlayManager.hideOverlays();
  });

  ipcMain.on('highlight-display', (_event: IpcMainEvent, { displayId }: { displayId: number }) => {
    displayOverlayManager.highlightDisplay(displayId);
  });

  ipcMain.on('unhighlight-display', (_event: IpcMainEvent, { displayId }: { displayId: number }) => {
    displayOverlayManager.unhighlightDisplay(displayId);
  });

  // --- macOS-specific handlers ---
  if (isMac) {
    ipcMain.on('mac-check-macos-version', async () => {
      const { isSupported } = await checkMacosVersion();
      currentWindow.sendToWebContents('mac-check-macos-version-result', { isSupported });
    });

    ipcMain.on('mac-open-system-settings', (_event: IpcMainEvent, { section }: { section: 'privacy > microphone' | 'privacy > screen-recording' }) => {
      if (section === 'privacy > microphone') {
        shell.openExternal('x-apple.systempreferences:com.apple.preference.security?Privacy_Microphone');
      } else if (section === 'privacy > screen-recording') {
        shell.openExternal('x-apple.systempreferences:com.apple.preference.security?Privacy_ScreenCapture');
      }
    });

    ipcMain.on('mac-set-native-recorder-enabled', (_event: IpcMainEvent, { enabled }: { enabled: boolean }) => {
      if (enabled) {
        startMacNativeRecorder(currentWindow);
      } else {
        stopMacNativeRecorder();
      }
    });

    ipcMain.on('mac-set-mic-monitor-enabled', (_event: IpcMainEvent, { enabled }: { enabled: boolean }) => {
      if (enabled) {
        enableMicMonitor(currentWindow);
      } else {
        disableMicMonitor();
      }
    });
  }
}