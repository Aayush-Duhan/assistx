/**
 * Workflow MCP Service
 * Provides MCP tool execution for workflow Tool nodes
 *
 * Integrates with the existing MCP service to call tools from configured MCP servers.
 */

import { getMCPManager } from "../../services/mcp.service";
import { logger } from "../pino/logger";

/**
 * MCP tool execution options
 */
export interface MCPToolExecutionOptions {
  serverName: string;
  toolName: string;
  input?: Record<string, unknown>;
}

/**
 * MCP tool execution result
 */
export interface MCPToolExecutionResult {
  success: boolean;
  result?: unknown;
  error?: string;
}

/**
 * Execute an MCP tool
 *
 * @param options - MCP tool execution options
 * @returns Execution result with output or error
 */
export async function executeMCPTool(
  options: MCPToolExecutionOptions,
): Promise<MCPToolExecutionResult> {
  const { serverName, toolName, input } = options;

  try {
    const manager = getMCPManager();

    logger.info("workflow.mcp.tool.call", "Calling MCP tool", {
      serverName,
      toolName,
    });

    const result = await manager.toolCallByServerName(serverName, toolName, input);

    if (result.isError) {
      const errorText =
        result.content
          ?.filter((c) => c.type === "text")
          .map((c) => (c as { type: "text"; text: string }).text)
          .join("\n") ?? "MCP tool execution failed";

      logger.warn("workflow.mcp.tool.error", "MCP tool returned error", {
        serverName,
        toolName,
        error: errorText,
      });

      return {
        success: false,
        error: errorText,
      };
    }

    // Extract text content from the result
    const textContent = result.content
      ?.filter((c) => c.type === "text")
      .map((c) => (c as { type: "text"; text: string }).text)
      .join("\n");

    // Try to parse JSON if it looks like JSON
    let parsedResult: unknown = textContent;
    if (textContent && (textContent.startsWith("{") || textContent.startsWith("["))) {
      try {
        parsedResult = JSON.parse(textContent);
      } catch {
        // Keep as text
      }
    }

    logger.info("workflow.mcp.tool.success", "MCP tool execution completed", {
      serverName,
      toolName,
    });

    return {
      success: true,
      result: parsedResult,
    };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);

    logger.error(
      error instanceof Error ? error : new Error(errorMessage),
      "workflow.mcp.tool.failed",
      "MCP tool execution failed",
      { serverName, toolName },
    );

    return {
      success: false,
      error: errorMessage,
    };
  }
}

/**
 * List available MCP tools from all connected servers
 */
export async function listAvailableMCPTools(): Promise<
  Array<{
    serverName: string;
    toolName: string;
    description: string;
  }>
> {
  try {
    const manager = getMCPManager();
    const clients = await manager.getClients();
    const tools: Array<{ serverName: string; toolName: string; description: string }> = [];

    for (const { client, name } of clients) {
      const info = client.getInfo();
      for (const tool of info.toolInfo) {
        tools.push({
          serverName: name,
          toolName: tool.name,
          description: tool.description,
        });
      }
    }

    return tools;
  } catch (error) {
    logger.error(
      error instanceof Error ? error : new Error(String(error)),
      "workflow.mcp.list.failed",
      "Failed to list MCP tools",
    );
    return [];
  }
}
