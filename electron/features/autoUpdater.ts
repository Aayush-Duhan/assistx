import { app } from "electron";
import { autoUpdater } from "electron-updater";
import log from "electron-log";
import { compareVersions, type UpdateStatus } from "@/shared/updateStatus";
import { windowManager } from "../windows/WindowManager";

/** Update check interval (1 hour) */
const UPDATE_CHECK_INTERVAL = 1000 * 60 * 60;

/** Throttle download-progress broadcasts */
const PROGRESS_BROADCAST_INTERVAL_MS = 300;

/** Whether app is quitting for update installation */
let isQuittingForUpdate = false;

/** Main-owned update lifecycle status (not SharedState) */
let updateStatus: UpdateStatus = { state: "idle" };

let lastProgressBroadcastAt = 0;

interface ConfigData {
  minimumElectronVersion: string;
  recommendedElectronVersion: string;
}

/** Local force/recommend thresholds (remote config can replace later) */
const configData: ConfigData = {
  minimumElectronVersion: "0.0.0",
  recommendedElectronVersion: "0.0.0",
};

function isBelowWarningThreshold(): boolean {
  return compareVersions(app.getVersion(), configData.recommendedElectronVersion) < 0;
}

function isBelowMinimumVersion(): boolean {
  return compareVersions(app.getVersion(), configData.minimumElectronVersion) < 0;
}

function broadcastUpdateStatus(status: UpdateStatus, options?: { force?: boolean }): void {
  if (status.state === "downloading" && !options?.force) {
    const now = Date.now();
    if (now - lastProgressBroadcastAt < PROGRESS_BROADCAST_INTERVAL_MS) {
      updateStatus = status;
      return;
    }
    lastProgressBroadcastAt = now;
  } else {
    lastProgressBroadcastAt = 0;
  }

  updateStatus = status;
  windowManager.sendToWebContents("update-status-changed", status);
}

export function getUpdateStatus(): UpdateStatus {
  return updateStatus;
}

export function initializeUpdater(): void {
  autoUpdater.logger = log;
  autoUpdater.autoDownload = true;
  autoUpdater.autoInstallOnAppQuit = true;

  autoUpdater.on("checking-for-update", () => {
    log.info("Checking for update...");
    broadcastUpdateStatus({ state: "checking" }, { force: true });
  });

  autoUpdater.on("update-available", (info) => {
    log.info("Update available:", info.version);
    if (updateStatus.state === "downloaded") return;
    broadcastUpdateStatus(
      {
        state: "available",
        version: info.version,
        isBelowWarningThreshold: isBelowWarningThreshold(),
      },
      { force: true },
    );
  });

  autoUpdater.on("update-not-available", (info) => {
    log.info("Update not available:", info.version);
    if (updateStatus.state === "downloaded") return;
    broadcastUpdateStatus({ state: "idle" }, { force: true });
  });

  autoUpdater.on("download-progress", (progress) => {
    const version =
      updateStatus.state === "available" ||
      updateStatus.state === "downloading" ||
      updateStatus.state === "downloaded"
        ? updateStatus.version
        : "unknown";

    broadcastUpdateStatus({
      state: "downloading",
      version,
      percent: progress.percent,
      transferred: progress.transferred,
      total: progress.total,
    });
  });

  autoUpdater.on("update-downloaded", (info) => {
    log.info("Update downloaded:", info.version);
    broadcastUpdateStatus(
      {
        state: "downloaded",
        version: info.version,
        isBelowWarningThreshold: isBelowWarningThreshold(),
      },
      { force: true },
    );

    if (isBelowMinimumVersion()) {
      installUpdate();
    }
  });

  autoUpdater.on("error", (error) => {
    log.error("Error in auto-updater:", error);
    const version =
      updateStatus.state === "available" ||
      updateStatus.state === "downloading" ||
      updateStatus.state === "downloaded"
        ? updateStatus.version
        : undefined;

    broadcastUpdateStatus(
      {
        state: "error",
        message: error?.message || String(error),
        version,
      },
      { force: true },
    );
  });

  if (app.isPackaged || process.env.TEST_AUTO_UPDATE === "true") {
    checkForUpdates().catch((err) => log.error("Initial update check failed:", err));
    setInterval(() => {
      checkForUpdates().catch((err) => log.error("Scheduled update check failed:", err));
    }, UPDATE_CHECK_INTERVAL);
  }
}

/**
 * Check for available updates.
 * Compares remote version against the running app version.
 */
export async function checkForUpdates(): Promise<"available" | "none" | "failed"> {
  try {
    const result = await autoUpdater.checkForUpdates();
    const remoteVersion = result?.updateInfo?.version;
    if (!remoteVersion) {
      return "none";
    }

    if (compareVersions(remoteVersion, app.getVersion()) > 0) {
      return "available";
    }

    return "none";
  } catch (error) {
    log.error("Failed to check for updates:", error);
    return "failed";
  }
}

export function isQuittingForUpdateInstall(): boolean {
  return isQuittingForUpdate;
}

/** Install downloaded update (quit and install). */
export function installUpdate(): void {
  if (updateStatus.state !== "downloaded") return;

  isQuittingForUpdate = true;
  autoUpdater.quitAndInstall();
}
