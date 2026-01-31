/**
 * @file services/mcp-config.service.ts
 * Utilities for determining MCP configuration file path
 */

import { join } from "path";
import { homedir } from "os";

/**
 * Get the MCP configuration file path.
 *
 * Priority:
 * 1. MCP_CONFIG_PATH environment variable
 * 2. ASSISTX_USER_DATA_PATH environment variable (set by Electron)
 * 3. Default to ~/.assistx/.mcp-config.json
 */
export function getMcpConfigPath(): string {
  // Allow explicit override via environment variable
  if (process.env.MCP_CONFIG_PATH) {
    return process.env.MCP_CONFIG_PATH;
  }

  // When running from Electron, it sets this env var
  if (process.env.ASSISTX_USER_DATA_PATH) {
    return join(process.env.ASSISTX_USER_DATA_PATH, ".mcp-config.json");
  }

  // Default fallback for standalone server
  const platform = process.platform;
  let userDataDir: string;

  if (platform === "win32") {
    // Windows: %APPDATA%/assistx
    userDataDir = join(process.env.APPDATA || join(homedir(), "AppData", "Roaming"), "assistx");
  } else if (platform === "darwin") {
    // macOS: ~/Library/Application Support/assistx
    userDataDir = join(homedir(), "Library", "Application Support", "assistx");
  } else {
    // Linux: ~/.config/assistx
    userDataDir = join(process.env.XDG_CONFIG_HOME || join(homedir(), ".config"), "assistx");
  }

  return join(userDataDir, ".mcp-config.json");
}
