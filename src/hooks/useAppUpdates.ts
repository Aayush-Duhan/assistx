import { useState, useEffect } from "react";
import { GITHUB_API_RELEASES_URL } from "../lib/constants";

// Type definitions
interface GitHubRelease {
  tag_name: string;
  name: string;
  published_at: string;
  html_url: string;
  assets: Array<{
    name: string;
    browser_download_url: string;
  }>;
}

interface UpdateInfo {
  available: boolean;
  version?: string;
  downloadUrl?: string;
}

// Configuration for GitHub releases
const CHECK_INTERVAL = 1000 * 60 * 60; // Check every hour

// Global state for update checking - singleton pattern
const globalUpdateState: {
  updateInfo: UpdateInfo;
  isChecking: boolean;
  lastCheckTime: number;
  currentVersion: string | null;
} = {
  updateInfo: { available: false },
  isChecking: false,
  lastCheckTime: 0,
  currentVersion: null,
};

// Listeners for state changes
const updateListeners: Set<() => void> = new Set();

function notifyUpdateListeners() {
  updateListeners.forEach((listener) => listener());
}

function addUpdateListener(listener: () => void) {
  updateListeners.add(listener);
  return () => {
    updateListeners.delete(listener);
  };
}

/**
 * Global function to check for updates. This ensures update checking happens only once.
 */
async function checkForUpdatesGlobal(): Promise<void> {
  if (globalUpdateState.isChecking || !globalUpdateState.currentVersion) {
    return;
  }

  globalUpdateState.isChecking = true;
  notifyUpdateListeners();

  try {
    // Check GitHub releases API for latest version
    const response = await fetch(GITHUB_API_RELEASES_URL);

    if (!response.ok) {
      console.warn("Failed to check for updates:", response.statusText);
      return;
    }

    const release: GitHubRelease = await response.json();
    const latestVersion = release.tag_name.replace(/^v/, ""); // Remove 'v' prefix if present

    // Simple version comparison (assumes semantic versioning)
    if (isNewerVersion(latestVersion, globalUpdateState.currentVersion)) {
      // Find appropriate download asset for current platform
      const platform = await window.electron.ipcRenderer
        .invoke("get-platform")
        .catch(() => "unknown");
      const asset = findAssetForPlatform(release.assets, platform);

      globalUpdateState.updateInfo = {
        available: true,
        version: latestVersion,
        downloadUrl: asset?.browser_download_url || release.html_url,
      };
    } else {
      globalUpdateState.updateInfo = { available: false };
    }

    globalUpdateState.lastCheckTime = Date.now();
  } catch (error) {
    console.warn("Error checking for updates:", error);
    globalUpdateState.updateInfo = { available: false };
  } finally {
    globalUpdateState.isChecking = false;
    notifyUpdateListeners();
  }
}

/**
 * Hook to get the current app version.
 * In open source version, this comes from package.json or build info.
 */
export function useAppVersion(): string | null {
  const [version, setVersion] = useState<string | null>(globalUpdateState.currentVersion);

  useEffect(() => {
    // Try to get version from Electron main process
    if (window.electron.ipcRenderer && !globalUpdateState.currentVersion) {
      window.electron.ipcRenderer
        .invoke("get-app-version")
        .then((appVersion: string) => {
          globalUpdateState.currentVersion = appVersion;
          setVersion(appVersion);
          // Start the first update check after we have the version
          checkForUpdatesGlobal();
        })
        .catch(() => {
          // Fallback to a default version if IPC fails
          globalUpdateState.currentVersion = "1.0.0";
          setVersion("1.0.0");
          checkForUpdatesGlobal();
        });
    } else if (globalUpdateState.currentVersion) {
      setVersion(globalUpdateState.currentVersion);
    } else {
      globalUpdateState.currentVersion = "1.0.0";
      setVersion("1.0.0");
      checkForUpdatesGlobal();
    }

    // Set up periodic checking (every hour)
    const interval = setInterval(() => {
      checkForUpdatesGlobal();
    }, CHECK_INTERVAL);

    return () => clearInterval(interval);
  }, []);

  return version;
}

/**
 * Hook to check if an update is available from GitHub releases.
 * This replaces the proprietary update mechanism with GitHub-based updates.
 */
export function useUpdateAvailable(): boolean {
  const [isAvailable, setIsAvailable] = useState(globalUpdateState.updateInfo.available);

  useEffect(() => {
    setIsAvailable(globalUpdateState.updateInfo.available);

    const removeListener = addUpdateListener(() => {
      setIsAvailable(globalUpdateState.updateInfo.available);
    });

    return removeListener;
  }, []);

  return isAvailable;
}

/**
 * Hook to get update information including download URL.
 */
export function useUpdateInfo(): UpdateInfo {
  const [updateInfo, setUpdateInfo] = useState<UpdateInfo>(globalUpdateState.updateInfo);

  useEffect(() => {
    setUpdateInfo(globalUpdateState.updateInfo);

    const removeListener = addUpdateListener(() => {
      setUpdateInfo(globalUpdateState.updateInfo);
    });

    return removeListener;
  }, []);

  return updateInfo;
}

/**
 * Simple version comparison function.
 * Returns true if newVersion is newer than currentVersion.
 */
function isNewerVersion(newVersion: string, currentVersion: string): boolean {
  const parseVersion = (version: string) => {
    return version.split(".").map((num) => parseInt(num, 10));
  };

  const newParts = parseVersion(newVersion);
  const currentParts = parseVersion(currentVersion);

  for (let i = 0; i < Math.max(newParts.length, currentParts.length); i++) {
    const newPart = newParts[i] || 0;
    const currentPart = currentParts[i] || 0;

    if (newPart > currentPart) return true;
    if (newPart < currentPart) return false;
  }

  return false;
}

/**
 * Find the appropriate download asset for the current platform.
 */
function findAssetForPlatform(assets: GitHubRelease["assets"], platform: string) {
  // Platform-specific asset matching
  const platformPatterns: Record<string, RegExp[]> = {
    win32: [/\.exe$/, /windows/i, /win/i],
    darwin: [/\.dmg$/, /\.pkg$/, /mac/i, /darwin/i],
    linux: [/\.AppImage$/, /\.deb$/, /\.rpm$/, /linux/i],
  };

  const patterns = platformPatterns[platform] || [];

  for (const pattern of patterns) {
    const asset = assets.find((asset) => pattern.test(asset.name));
    if (asset) return asset;
  }

  // Fallback to first asset if no platform-specific match
  return assets[0];
}
