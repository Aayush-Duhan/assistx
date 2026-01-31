import { globalShortcut } from "electron";
import { IS_DEV } from "../../shared/constants";
import { windowManager } from "../windows/WindowManager";
import { updateSharedState, getSharedState } from "../utils/shared/stateManager";

/** Whether dev shortcuts are enabled */
let devShortcutsEnabled = IS_DEV;

/** Set of registered global shortcuts */
const registeredShortcuts = new Set<string>();

/**
 * Register a global shortcut
 */
export function registerGlobalShortcut(accelerator: string): void {
  if (registeredShortcuts.has(accelerator)) {
    console.warn(`Shortcut already registered: ${accelerator}`);
    return;
  }
  registeredShortcuts.add(accelerator);
  refreshGlobalShortcuts();
}

/**
 * Unregister a global shortcut
 */
export function unregisterGlobalShortcut(accelerator: string): void {
  if (!registeredShortcuts.has(accelerator)) {
    console.warn(`Shortcut not registered: ${accelerator}`);
    return;
  }
  registeredShortcuts.delete(accelerator);
  refreshGlobalShortcuts();
}

/**
 * Enable developer shortcuts
 */
export function enableDevShortcuts(): void {
  devShortcutsEnabled = true;
  refreshGlobalShortcuts();
}

/**
 * Clear all registered shortcuts
 */
export function clearAllShortcuts(): void {
  registeredShortcuts.clear();
  refreshGlobalShortcuts();
}

/**
 * Refresh all global shortcut registrations
 */
export function refreshGlobalShortcuts(): void {
  globalShortcut.unregisterAll();

  // Register user shortcuts
  for (const accelerator of registeredShortcuts) {
    const success = globalShortcut.register(accelerator, () => {
      windowManager.sendToWebContents("global-shortcut-triggered", { accelerator });
    });

    if (!success) {
      console.error(`Failed to register global shortcut: ${accelerator}`);
    }
  }

  // Register dev shortcuts if enabled
  if (devShortcutsEnabled) {
    // Toggle undetectability mode
    globalShortcut.register("CommandOrControl+Alt+Shift+I", () => {
      updateSharedState({
        undetectabilityEnabled: !getSharedState().undetectabilityEnabled,
      });
    });

    // Reload all windows
    globalShortcut.register("CommandOrControl+Alt+R", () => {
      windowManager.getAppWindow()?.reload();
      windowManager.getDashboardWindow()?.reload();
      windowManager.getOnboardingWindow()?.reload();
      windowManager.getOfflineWindow()?.reload();
    });

    // Toggle dev tools
    globalShortcut.register("CommandOrControl+Alt+I", () => {
      if (windowManager.getDashboardWindow()?.window.isFocused()) {
        windowManager.getDashboardWindow()?.toggleDevTools();
        windowManager.getAppWindow()?.window.webContents.closeDevTools();
      } else {
        windowManager.getAppWindow()?.toggleDevTools();
        windowManager.getDashboardWindow()?.window.webContents.closeDevTools();
      }
      windowManager.getOnboardingWindow()?.toggleDevTools();
      windowManager.getOfflineWindow()?.toggleDevTools();
    });
  }
}
