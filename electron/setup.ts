import { Menu, session, desktopCapturer, MenuItemConstructorOptions, MenuItem } from 'electron';
import { autoUpdater } from 'electron-updater';
import { windowManager } from './windows/WindowManager';

/**
 * Sets up the application menu.
 */
export function setupAppMenu(): void {
  const template: (MenuItemConstructorOptions | MenuItem)[] = [
    { role: 'editMenu' },
    {
      role: 'viewMenu',
      submenu: [
        { role: 'zoomIn', enabled: false },
        { role: 'zoomOut', enabled: false }
      ]
    }
  ];
  const menu = Menu.buildFromTemplate(template);
  Menu.setApplicationMenu(menu);
}

/**
 * Overrides the default display media picker.
 */
export function setupDisplayMediaHandler(): void {
  session.defaultSession.setDisplayMediaRequestHandler(
    (_request, callback) => {
      desktopCapturer
        .getSources({ types: ['screen'] })
        .then((sources) => {
          callback({ video: sources[0], audio: 'loopback' });
        })
        .catch(() => {
          callback({});
        });
    }
  );
}

/**
 * Initializes the auto-updater.
 */
export function setupAutoUpdater(): void {
  autoUpdater.on('update-downloaded', () => {
    windowManager.getCurrentWindow().sendToWebContents('update-downloaded', null);
  });

  autoUpdater.checkForUpdatesAndNotify();
}