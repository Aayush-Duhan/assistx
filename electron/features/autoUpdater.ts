import { getSharedState, updateSharedState } from '../utils/shared/stateManager';
import { app } from 'electron';
import autoUpdater from 'electron-updater';

/** Update check interval (1 hour) */
const UPDATE_CHECK_INTERVAL = 1000 * 60 * 60;

/** TODO: Replace with actual update server URL */
const UPDATE_DOWNLOAD_URL = "https://example.com/updates";

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

/** Default config data (TODO: fetch from server when backend is available) */
const configData: ConfigData = {
  minimumElectronVersion: "0.0.0",
  recommendedElectronVersion: "0.0.0",
};

export function initializeUpdater(): void {
  const { autoUpdater: updater } = autoUpdater;
  updater.setFeedURL({
    provider: "generic",
    url: UPDATE_DOWNLOAD_URL,
  });

  // updater.logger = log;

  updater.on('update-available', (info) => {
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

  updater.on('update-downloaded', (info) => {
    const state = {
      state: "downloaded" as const,
      version: info.version,
      isBelowWarningThreshold:
        !!configData &&
        compareVersions(app.getVersion(), configData.recommendedElectronVersion) < 0,
    };
    updateSharedState({ autoUpdateState: state });
    // Force update if below minimum version
    if (
      configData &&
      compareVersions(app.getVersion(), configData.minimumElectronVersion) < 0
    ) {
      installUpdate();
    }
  });

  checkForUpdates();
  setInterval(checkForUpdates, UPDATE_CHECK_INTERVAL);
}

/**
 * Check for available updates
 */
export async function checkForUpdates(): Promise<"available" | "none" | "failed"> {
  try {
    // TODO: Fetch config from server when backend is available
    // configData ??= await fetchConfigData();

    const result = await autoUpdater.autoUpdater.checkForUpdates();

    return result?.isUpdateAvailable ? "available" : "none";
  } catch {
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
  autoUpdater.autoUpdater.quitAndInstall();
}

/**
 * Fetch config data from server with retry
 * TODO: Uncomment when backend is available
 */
// async function fetchConfigData(): Promise<ConfigData | null> {
//   let delay = 5000;
//
//   for (let attempt = 0; attempt < 3; attempt++) {
//     try {
//       const response = await createApiClient().config.get();
//       if (!response.error) return response.data;
//       console.error(response.error);
//     } catch (error) {
//       console.error(error);
//     }
//
//     await new Promise((resolve) => setTimeout(resolve, delay));
//     delay *= 2;
//   }
//
//   return null;
// }