import electronUpdater from 'electron-updater';
import { windowManager } from '../windows/WindowManager';

const { autoUpdater } = electronUpdater;

type UpdaterState = 'none' | 'available' | 'downloaded';
let updaterState: UpdaterState = 'none';

export function initializeUpdater(): void {
  autoUpdater.on('update-available', () => {
    updaterState = 'available';
    windowManager.getCurrentWindow().sendToWebContents('updater-state', { state: updaterState });
  });

  autoUpdater.on('update-downloaded', () => {
    updaterState = 'downloaded';
    windowManager.getCurrentWindow().sendToWebContents('updater-state', { state: updaterState });
  });

  autoUpdater.checkForUpdatesAndNotify();
}

export function getUpdaterState(): UpdaterState {
  return updaterState;
}

export function checkForUpdate(): void {
  autoUpdater.checkForUpdatesAndNotify();
}

export function quitAndInstallUpdate(): void {
  autoUpdater.quitAndInstall();
}