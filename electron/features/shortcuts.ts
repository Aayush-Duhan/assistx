import { globalShortcut } from 'electron';
import { isDev } from '../utils/platform';
import { windowManager } from '../windows/WindowManager';
import { toggleUndetectability } from '../features/undetectability';

let devShortcutsEnabled = isDev;
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

  for (const accelerator of registeredShortcuts) {    
    const success = globalShortcut.register(accelerator, () => {
      windowManager.getCurrentWindow().sendToWebContents('global-shortcut-triggered', accelerator);
    });
    if (!success) {
      console.error(`Failed to register global shortcut: ${accelerator}`);
    }
  }

  if (devShortcutsEnabled) {
    globalShortcut.register('CommandOrControl+Alt+Shift+I', () => {
      toggleUndetectability();
    });
    globalShortcut.register('CommandOrControl+Alt+R', () => {
      windowManager.getCurrentWindow().reload();
    });
    globalShortcut.register('CommandOrControl+Alt+I', () => {
      windowManager.getCurrentWindow().toggleDevTools();
    });
  }
} 