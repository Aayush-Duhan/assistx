import { globalShortcut } from 'electron';
import { isDevelopment } from './utils/platform';
import { windowManager } from './windows/WindowManager';

let devShortcutsEnabled = isDevelopment;
const registeredShortcuts = new Set<string>();

export function registerGlobalShortcut(accelerator: string): void {
  if (registeredShortcuts.has(accelerator)) {
    console.warn(`Shortcut already registered: ${accelerator}`);
    return;
  }
  registeredShortcuts.add(accelerator);
  applyGlobalShortcuts();
}

export function unregisterGlobalShortcut(accelerator: string): void {
  if (!registeredShortcuts.has(accelerator)) {
    console.warn(`Shortcut not registered: ${accelerator}`);
    return;
  }
  registeredShortcuts.delete(accelerator);
  applyGlobalShortcuts();
}

export function enableDevShortcuts(): void {
  devShortcutsEnabled = true;
  applyGlobalShortcuts();
}

export function resetGlobalShortcuts(): void {
  registeredShortcuts.clear();
  applyGlobalShortcuts();
}

export function applyGlobalShortcuts(): void {
  globalShortcut.unregisterAll();

  // Register user-defined shortcuts
  for (const accelerator of registeredShortcuts) {
    if (!accelerator) {
      console.warn(`[shortcuts] Skipping invalid accelerator: ${accelerator}`);
      continue;
    }
    
    const success = globalShortcut.register(accelerator, () => {
      try {
        // Send just the accelerator string, not an object
        windowManager.getCurrentWindow().sendToWebContents('global-shortcut-triggered', accelerator);
      } catch (error) {
        console.error(`[shortcuts] Error sending shortcut trigger for ${accelerator}:`, error);
      }
    });
    if (!success) {
      console.error(`Failed to register global shortcut: ${accelerator}`);
    }
  }

  // Register fixed internal shortcuts
  globalShortcut.register('CommandOrControl+Alt+Shift+I', () => {
    windowManager.toggleSkipUndetectability();
  });

  // Register developer shortcuts
  if (devShortcutsEnabled) {
    globalShortcut.register('CommandOrControl+Alt+R', () => {
      windowManager.getCurrentWindow().reload();
    });
    globalShortcut.register('CommandOrControl+Alt+I', () => {
      windowManager.getCurrentWindow().toggleDevTools();
    });
  }
} 