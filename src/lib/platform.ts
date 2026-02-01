/**
 * Platform detection utilities
 */

// Detect platform based on navigator.platform or userAgent
const platform = typeof navigator !== "undefined" ? navigator.platform?.toLowerCase() || "" : "";
const userAgent = typeof navigator !== "undefined" ? navigator.userAgent?.toLowerCase() || "" : "";

/**
 * Is Windows platform
 */
export const isWin = platform.includes("win") || userAgent.includes("windows");

/**
 * Is macOS platform
 */
export const isMac = platform.includes("mac") || userAgent.includes("macintosh");

/**
 * Is Linux platform
 */
export const isLinux = platform.includes("linux") || userAgent.includes("linux");

/**
 * Get platform name
 */
export const getPlatformName = (): "windows" | "macos" | "linux" | "unknown" => {
  if (isWin) return "windows";
  if (isMac) return "macos";
  if (isLinux) return "linux";
  return "unknown";
};
