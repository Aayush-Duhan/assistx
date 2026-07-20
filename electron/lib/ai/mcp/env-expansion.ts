/**
 * Environment variable expansion for MCP server configurations.
 * Ported from Claude Code's envExpansion.ts.
 *
 * Supports ${VAR} and ${VAR:-default} syntax in config values.
 */

import type { MCPServerConfig, MCPStdioConfig, MCPRemoteConfig } from "@/shared/mcp";

/**
 * Expand environment variables in a string value.
 * Handles ${VAR} and ${VAR:-default} syntax.
 * @returns Object with expanded string and list of missing variables
 */
export function expandEnvVarsInString(value: string): {
  expanded: string;
  missingVars: string[];
} {
  const missingVars: string[] = [];

  const expanded = value.replace(/\$\{([^}]+)\}/g, (match, varContent) => {
    // Split on :- to support default values (limit to 2 parts to preserve :- in defaults)
    const [varName, defaultValue] = varContent.split(":-", 2);
    const envValue = process.env[varName];

    if (envValue !== undefined) {
      return envValue;
    }
    if (defaultValue !== undefined) {
      return defaultValue;
    }

    // Track missing variable for error reporting
    missingVars.push(varName);
    // Return original if not found (allows debugging but will be reported)
    return match;
  });

  return { expanded, missingVars };
}

/**
 * Type guard for stdio config
 */
function isStdioConfig(config: MCPServerConfig): config is MCPStdioConfig {
  return "command" in config && typeof (config as MCPStdioConfig).command === "string";
}

/**
 * Type guard for remote config
 */
function isRemoteConfig(config: MCPServerConfig): config is MCPRemoteConfig {
  return "url" in config && typeof (config as MCPRemoteConfig).url === "string";
}

/**
 * Expand environment variables in all string fields of an MCP server config.
 * Processes command, args, env (for stdio) and url, headers (for remote).
 *
 * @returns Object with expanded config and list of missing variables
 */
export function expandConfigEnvVars(config: MCPServerConfig): {
  expanded: MCPServerConfig;
  missingVars: string[];
} {
  const allMissing: string[] = [];

  function expand(str: string): string {
    const { expanded, missingVars } = expandEnvVarsInString(str);
    allMissing.push(...missingVars);
    return expanded;
  }

  function expandRecord(record: Record<string, string>): Record<string, string> {
    const result: Record<string, string> = {};
    for (const [key, value] of Object.entries(record)) {
      result[key] = expand(value);
    }
    return result;
  }

  let expanded: MCPServerConfig;

  if (isStdioConfig(config)) {
    expanded = {
      command: expand(config.command),
      args: config.args?.map(expand),
      env: config.env ? expandRecord(config.env) : undefined,
    };
  } else if (isRemoteConfig(config)) {
    expanded = {
      url: expand(config.url),
      headers: config.headers ? expandRecord(config.headers) : undefined,
    };
  } else {
    // Unknown config type — return as-is
    expanded = config;
  }

  return {
    expanded,
    missingVars: [...new Set(allMissing)],
  };
}
