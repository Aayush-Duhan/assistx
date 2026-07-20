/**
 * MCP server configuration change detection utilities.
 * Uses hash-based comparison for faster, more reliable diff detection.
 * Adapted from Claude Code's hashMcpConfig.
 */

import { createHash } from "crypto";
import equal from "../../equal";
import { isMaybeMCPServerConfig } from "./is-mcp-config";
import type { MCPServerConfig } from "@/shared/mcp";

// Types of changes that can occur in configuration
export type ConfigChangeType = "add" | "remove" | "update";

/**
 * Represents a change in MCP server configuration
 */
export interface ConfigChange {
  type: ConfigChangeType;
  key: string;
  value: MCPServerConfig;
}

/**
 * Validates that a config is a valid MCP server config
 */
const validate = (config: unknown) => {
  if (!isMaybeMCPServerConfig(config)) {
    throw new Error("Invalid MCP server configuration");
  }
  return config;
};

/**
 * Compute a stable hash of an MCP server config for change detection.
 * Keys are sorted so {a:1,b:2} and {b:2,a:1} hash the same.
 *
 * @param config MCP server configuration object
 * @returns 16-character hex hash string
 */
export function hashMcpConfig(config: MCPServerConfig): string {
  const stable = JSON.stringify(config, (_k, v: unknown) => {
    if (v && typeof v === "object" && !Array.isArray(v)) {
      const obj = v as Record<string, unknown>;
      const sorted: Record<string, unknown> = {};
      for (const k of Object.keys(obj).sort()) sorted[k] = obj[k];
      return sorted;
    }
    return v;
  });
  return createHash("sha256").update(stable).digest("hex").slice(0, 16);
}

/**
 * Check if two MCP server configs are equivalent by comparing their hashes.
 * More reliable than deep equality for configs that may have different key ordering.
 */
export function areMcpConfigsEqual(a: MCPServerConfig, b: MCPServerConfig): boolean {
  return hashMcpConfig(a) === hashMcpConfig(b);
}

/**
 * Detects changes between two MCP server configuration objects.
 * Identifies added, removed, and updated configurations.
 * Uses hash-based comparison for update detection.
 */
export function detectConfigChanges(
  prev: Record<string, unknown>,
  next: Record<string, unknown>,
): ConfigChange[] {
  const changes: ConfigChange[] = [];
  const allKeys = new Set([...Object.keys(prev), ...Object.keys(next)]);

  for (const key of allKeys) {
    const prevValue = prev[key];
    const nextValue = next[key];

    if (!(key in prev)) {
      // New configuration added
      changes.push({
        type: "add",
        key,
        value: validate(nextValue),
      });
    } else if (!(key in next)) {
      // Configuration removed
      changes.push({
        type: "remove",
        key,
        value: validate(prevValue),
      });
    } else if (!equal(prevValue, nextValue)) {
      // Configuration updated
      changes.push({
        type: "update",
        key,
        value: validate(nextValue),
      });
    }
  }

  return changes;
}
