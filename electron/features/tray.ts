import { app, Menu, Tray } from "electron";
import { IS_DEV } from "../../shared/constants";
import path from "node:path";
import { windowManager } from "../windows/WindowManager";
import { getSharedState, updateSharedState } from "../utils/shared/stateManager";
const ExtraResourcePath = path.join(
  IS_DEV ? app.getAppPath() : process.resourcesPath,
  "extraResources",
);

function getExtraResourcePath(...paths: string[]) {
  return path.join(ExtraResourcePath, ...paths);
}

export class TrayManager {
  tray: Tray | null = null;
  isInSession: boolean = false;
  isHidden: boolean = false;

  InitializeTray() {
    if (this.tray !== null) return;
    const Icon = this.getImage();

    this.tray = new Tray(Icon);
    this.tray.setContextMenu(this.generateContextMenu());
  }

  removeTray() {
    this.tray?.destroy();
    this.tray = null;
  }

  getImage() {
    const iconName = this.isInSession
      ? "trayActiveTemplate.png" // Active session (e.g., glowing/recording)
      : "trayTemplate.png"; // Idle state

    return getExtraResourcePath("tray", iconName);
  }
  updateImage() {
    if (this.tray === null) return;
    this.tray.setImage(this.getImage());
  }
  setHiddenState(isHidden: boolean) {
    this.isHidden = isHidden;
    if (this.tray === null) return;

    const updatedMenu = this.generateContextMenu();
    this.tray.setContextMenu(updatedMenu);
  }
  setInSessionState(isInSession: boolean) {
    this.isInSession = isInSession;
    if (this.tray === null) return;

    this.updateImage();
    const updatedMenu = this.generateContextMenu();
    this.tray.setContextMenu(updatedMenu);
  }
  handleTrayState() {
    if (getSharedState().undetectabilityEnabled) {
      this.removeTray();
    } else {
      this.InitializeTray();
    }
  }
  generateContextMenu() {
    if (this.isInSession) {
      // User is in an active session
      return Menu.buildFromTemplate([
        {
          label: this.isHidden ? `Show AssistX` : `Hide AssistX`,
          click: () => {
            updateSharedState({ windowHidden: !getSharedState().windowHidden });
          },
        },
        {
          label: "Make Invisible",
          click: () => {
            updateSharedState({
              undetectabilityEnabled: !getSharedState().undetectabilityEnabled,
            });
          },
        },
        { type: "separator" },
        {
          label: "View Sessions",
          click: () => {
            updateSharedState({ showDashboard: true });
          },
        },
        {
          label: "Preferences",
          click: () => {
            updateSharedState({ showDashboard: true });
            windowManager.sendToWebContents("broadcast-to-all-windows", {
              command: "open-dashboard-page",
              page: "/settings/general",
            });
          },
        },
        { type: "separator" },
        {
          label: "Stop Listening",
          click: () => {
            windowManager.sendToWebContents("broadcast-to-all-windows", {
              command: "stop-listening",
            });
          },
        },
        {
          label: `Quit AssistX`,
          click: () => {
            app.quit();
          },
        },
      ]);
    } else {
      // User is NOT in a session
      return Menu.buildFromTemplate([
        {
          label: "Start Listening",
          click: () => {
            windowManager.sendToWebContents("broadcast-to-all-windows", {
              command: "start-listening",
              meetingId: null,
              attendeeEmails: null,
            });
          },
        },
        { type: "separator" },
        {
          label: "View Sessions",
          click: () => {
            updateSharedState({ showDashboard: true });
          },
        },
        {
          label: "Preferences",
          click: () => {
            windowManager.sendToWebContents("broadcast-to-all-windows", {
              command: "open-dashboard-page",
              page: "/settings/general",
            });
            updateSharedState({ showDashboard: true });
          },
        },
        { type: "separator" },
        {
          label: `Quit AssistX`,
          click: () => {
            app.quit();
          },
        },
      ]);
    }
  }
}

export const trayManager = new TrayManager();
