import { getSharedState, updateSharedState } from "../utils/shared/stateManager";
import { app } from "electron";
import { autoUpdater } from "electron-updater";
import log from "electron-log";

/** Update check interval (1 hour) */
const UPDATE_CHECK_INTERVAL = 1000 * 60 * 60;

/** Whether app is quitting for update installation */
let isQuittingForUpdate = false;

/**
 * Compare semantic version strings
 * Returns: 1 if a > b, -1 if a < b, 0 if equal
 */
function compareVersions(a: string, b: string): number {
  const partsA = a.split(".").map(Number);
  const partsB = b.split(".").map(Number);

  for (let i = 0; i < Math.max(partsA.length, partsB.length); i++) {
    const numA = partsA[i] || 0;
    const numB = partsB[i] || 0;

    if (numA > numB) return 1;
    if (numA < numB) return -1;
  }

  return 0;
}

interface ConfigData {
  minimumElectronVersion: string;
  recommendedElectronVersion: string;
}

/** Default config data */
const configData: ConfigData = {
  minimumElectronVersion: "0.0.0",
  recommendedElectronVersion: "0.0.0",
};

export function initializeUpdater(): void {
  // Attach logger for electron-updater debugging
  autoUpdater.logger = log;

  autoUpdater.autoDownload = true;
  autoUpdater.autoInstallOnAppQuit = true;

  autoUpdater.on("error", (error) => {
    log.error("Error in auto-updater:", error);
  });

  autoUpdater.on("update-available", (info) => {
    log.info("Update available:", info.version);
    if (getSharedState().autoUpdateState.state === "downloaded") return;
    const state = {
      state: "available" as const,
      version: info.version,
      isBelowWarningThreshold:
        !!configData &&
        compareVersions(app.getVersion(), configData.recommendedElectronVersion) < 0,
    };
    updateSharedState({ autoUpdateState: state });
  });

  autoUpdater.on("update-downloaded", (info) => {
    log.info("Update downloaded:", info.version);
    const state = {
      state: "downloaded" as const,
      version: info.version,
      isBelowWarningThreshold:
        !!configData &&
        compareVersions(app.getVersion(), configData.recommendedElectronVersion) < 0,
    };
    updateSharedState({ autoUpdateState: state });
    // Force update if below minimum version
    if (configData && compareVersions(app.getVersion(), configData.minimumElectronVersion) < 0) {
      installUpdate();
    }
  });

  // Check for updates on application launch (only in packaged build or when dev testing)
  if (app.isPackaged || process.env.TEST_AUTO_UPDATE === "true") {
    checkForUpdates().catch((err) => log.error("Initial update check failed:", err));
    setInterval(() => {
      checkForUpdates().catch((err) => log.error("Scheduled update check failed:", err));
    }, UPDATE_CHECK_INTERVAL);
  }
}

/**
 * Check for available updates
 */
export async function checkForUpdates(): Promise<"available" | "none" | "failed"> {
  try {
    const result = await autoUpdater.checkForUpdates();
    return result?.updateInfo.version ? "available" : "none";
  } catch (error) {
    log.error("Failed to check for updates:", error);
    return "failed";
  }
}

/**
 * Check if app is quitting for update
 */
export function isQuittingForUpdateInstall(): boolean {
  return isQuittingForUpdate;
}

/**
 * Install downloaded update (quit and install)
 */
export function installUpdate(): void {
  if (getSharedState().autoUpdateState.state !== "downloaded") return;

  isQuittingForUpdate = true;
  autoUpdater.quitAndInstall();
}
