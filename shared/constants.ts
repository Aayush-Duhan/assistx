// Platform detection - works in both main process and renderer
const platform =
  typeof window !== "undefined" && window.electron?.process?.platform
    ? window.electron.process.platform
    : process.platform;

export const IS_MAC = platform === "darwin";
export const IS_WINDOWS = platform === "win32";
export const IS_DEV =
  typeof window !== "undefined" && window.electron?.process?.env
    ? window.electron.process.env.NODE_ENV === "development"
    : process.env.NODE_ENV === "development";

// App metadata (static, no environment detection needed)
export const APP_NAME = "AssistX";
/**
 * Fallback version string for non-Electron contexts.
 * Runtime UI should prefer `sharedState.appVersion` / `app.getVersion()`
 * (sourced from package.json by Electron).
 */
export const APP_VERSION = "0.0.1";
