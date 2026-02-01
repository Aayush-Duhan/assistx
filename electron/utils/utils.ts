import { readFileSync, existsSync, unlinkSync, writeFileSync } from "fs";
import { app, systemPreferences } from "electron";
import z from "zod";
import { IS_DEV, IS_MAC } from "@/shared/constants";
import os from "os";
import { onboardingStateSchema } from "@/shared/onboardingState";
import { STATE_FILES } from "./shared/stateManager";
import { DEFAULT_ONBOARDING_STATE } from "@/shared/onboardingState";
import { IS_INTEL_MAC } from "./constants";
export function loadJsonFile<T>(path: string, schema: z.ZodType<T>): T | null {
  try {
    const content = readFileSync(path).toString();
    const data = JSON.parse(content);
    const result = schema.safeParse(data);
    if (result.success) return result.data;
  } catch {
    // File doesn't exist or is invalid
  }
  return null;
}

/**
 * Check if file exists
 */
export function fileExists(path: string): boolean {
  try {
    return existsSync(path);
  } catch {
    return false;
  }
}

/**
 * Set file existence (create empty or delete)
 */
export function setFileExists(path: string, exists: boolean): void {
  try {
    if (exists) {
      writeFileSync(path, "");
    } else {
      unlinkSync(path);
    }
  } catch {
    // Ignore errors
  }
}

/**
 * Save JSON file
 */
export function saveJsonFile<T>(path: string, _schema: z.ZodType<T>, data: T): void {
  try {
    writeFileSync(path, JSON.stringify(data));
  } catch {
    // Ignore errors
  }
}

/**
 * Get auto-launch setting
 */
export function getAutoLaunchEnabled(): boolean {
  if (IS_DEV) return false;
  return app.getLoginItemSettings().openAtLogin;
}

/**
 * Check if running on Windows 10
 */
export function isWindows10(): boolean {
  if (process.platform !== "win32") return false;
  try {
    return os.version().includes("Windows 10");
  } catch {
    return false;
  }
}

/**
 * Check if running on macOS Sequoia
 */
export function isMacOsSequoia(): boolean {
  return IS_MAC && parseFloat(os.release()) === 25;
}

/**
 * Load onboarding state from disk
 */
export function loadOnboardingState(): z.infer<typeof onboardingStateSchema> {
  const savedState = loadJsonFile(STATE_FILES.onboardingState, onboardingStateSchema);

  if (savedState) {
    // Update permission states from system
    const permissions = IS_MAC
      ? {
          didGrantMicrophonePermission:
            systemPreferences.getMediaAccessStatus("microphone") === "granted",
          didGrantScreenPermission: systemPreferences.getMediaAccessStatus("screen") === "granted",
          didGrantAccessibilityPermission:
            IS_INTEL_MAC || systemPreferences.isTrustedAccessibilityClient(false),
        }
      : {
          didGrantMicrophonePermission: true,
          didGrantScreenPermission: true,
          didGrantAccessibilityPermission: true,
        };

    return {
      ...savedState,
      permissions,
      restarted:
        permissions.didGrantMicrophonePermission &&
        permissions.didGrantScreenPermission &&
        permissions.didGrantAccessibilityPermission,
    };
  }

  return DEFAULT_ONBOARDING_STATE;
}
