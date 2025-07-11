import { app } from 'electron';
import { electronApp } from '@electron-toolkit/utils';
import * as dotenv from 'dotenv';

// Load environment variables from .env.local
dotenv.config({ path: '.env.local' });
import { isMac, isWindows } from './utils/platform';
import { windowManager } from './windows/WindowManager';
import { setupAppMenu, setupDisplayMediaHandler, setupAutoUpdater } from './setup';
import { setupIpcHandlers } from './ipcHandlers';
import { setupDisplayListeners } from './display-listeners';
import { applyGlobalShortcuts } from './shortcuts';

const APP_ID = 'AssistX';

// Hide the dock icon on macOS.
if (isMac) {
  app.dock.hide();
}

// Ensure only one instance of the app can run, primarily for Windows.
if (isWindows) {
  const isSingleInstance = app.requestSingleInstanceLock();
  if (!isSingleInstance) {
    app.quit();
    process.exit(0);
  }
}

/**
 * The main application function.
 */
async function main(): Promise<void> {
  // Wait for Electron to be ready.
  await app.whenReady();

  // Set the App User Model ID for Windows notifications and taskbar grouping.
  electronApp.setAppUserModelId(`com.${APP_ID}`);

  // Perform initial, non-window-dependent setup.
  setupAppMenu();
  setupDisplayMediaHandler();

  // Create the main application window (this will be the onboarding or main overlay).
  windowManager.createWindow();

  // After creating the window, set up handlers and services that depend on it.
  setupAutoUpdater();
  setupIpcHandlers();
  setupDisplayListeners();
  applyGlobalShortcuts();
}

// Start the application.
main();