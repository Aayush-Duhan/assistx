/**
 * MCP tool name normalization and ID generation utilities.
 * Adopts the mcp__server__tool naming convention from Claude Code.
 *
 * Tool names follow the format: mcp__<normalized_server>__<normalized_tool>
 * This double-underscore separator is unambiguous for parsing.
 */

/**
 * Normalize a name to be compatible with the API pattern ^[a-zA-Z0-9_-]{1,64}$
 * Replaces any invalid characters (including dots and spaces) with underscores.
 */
export function normalizeNameForMCP(name: string): string {
  return name.replace(/[^a-zA-Z0-9_-]/g, "_");
}

/**
 * Returns the MCP tool/command name prefix for a given server.
 * @example getMcpPrefix("my-server") => "mcp__my-server__"
 */
export function getMcpPrefix(serverName: string): string {
  return `mcp__${normalizeNameForMCP(serverName)}__`;
}

/**
 * Build a fully qualified MCP tool name from server and tool names.
 * @example createMCPToolId("my-server", "list_files") => "mcp__my-server__list_files"
 */
export const createMCPToolId = (serverName: string, toolName: string): string => {
  return `${getMcpPrefix(serverName)}${normalizeNameForMCP(toolName)}`;
};

/**
 * Parse a fully qualified MCP tool name back into its server and tool components.
 *
 * Handles the new `mcp__server__tool` format.
 *
 * Known limitation: If a server name contains "__", parsing will be incorrect.
 * This is rare in practice since server names typically don't contain double underscores.
 *
 * @returns { serverName, toolName } or null if not a valid MCP tool name
 */
export const extractMCPToolId = (
  toolId: string,
): { serverName: string; toolName: string } | null => {
  const parts = toolId.split("__");
  const [mcpPart, serverName, ...toolNameParts] = parts;

  if (mcpPart !== "mcp" || !serverName) {
    return null;
  }

  // Join all parts after server name to preserve double underscores in tool names
  const toolName = toolNameParts.length > 0 ? toolNameParts.join("__") : "";
  return { serverName, toolName };
};

/**
 * Checks if a tool name is an MCP tool (starts with mcp__ prefix).
 */
export function isMcpToolName(toolName: string): boolean {
  return toolName.startsWith("mcp__");
}

/**
 * Extracts a display-friendly name from a fully qualified MCP tool name.
 * @example getMcpDisplayName("mcp__github__list_repos", "github") => "list_repos"
 */
export function getMcpDisplayName(fullName: string, serverName: string): string {
  const prefix = getMcpPrefix(serverName);
  return fullName.replace(prefix, "");
}

/**
 * Sanitizes a name to be compatible with function name requirements:
 * - Must start with a letter or underscore
 * - Can only contain alphanumeric characters, underscores, dots, or dashes
 * - Maximum length of 124 characters
 */
export const sanitizeFunctionName = (name: string): string => {
  // Replace any characters that aren't alphanumeric, underscore, dot, or dash with underscore
  let sanitized = name.replace(/[^a-zA-Z0-9_.-]/g, "_");

  // Ensure it starts with a letter or underscore
  if (!/^[a-zA-Z_]/.test(sanitized)) {
    sanitized = "_" + sanitized;
  }

  // Truncate to 124 characters if needed
  if (sanitized.length > 124) {
    sanitized = sanitized.substring(0, 124);
  }

  return sanitized;
};
