/**
 * @file routes/mcp.routes.ts
 * REST API routes for MCP (Model Context Protocol) server management
 */

import type { FastifyInstance, FastifyRequest, FastifyReply } from "fastify";
import {
  selectMcpClientsAction,
  selectMcpClientAction,
  saveMcpClientAction,
  removeMcpClientAction,
  refreshMcpClientAction,
  toggleMcpClientConnectionAction,
  callMcpToolAction,
  getMcpToolsAction,
  setMcpAllowedToolsAction,
} from "../services/mcp.service";
import { getMcpConfigPath } from "../services/mcp-config.service";

// ============================================================================
// Request Types
// ============================================================================

type MCPServerStatus = "connected" | "disconnected" | "loading" | "authorizing";

type MCPServerConfig =
  | { url: string; headers?: Record<string, string> }
  | { command: string; args?: string[]; env?: Record<string, string> };

interface IdParams {
  id: string;
}

interface CreateMcpServerBody {
  name: string;
  config: MCPServerConfig;
}

interface CallToolBody {
  toolName: string;
  input: unknown;
}

interface ToggleClientBody {
  status: MCPServerStatus;
}

interface UpdateAllowedToolsBody {
  allowedTools: string[];
}

// ============================================================================
// Routes
// ============================================================================

export async function mcpRoutes(fastify: FastifyInstance): Promise<void> {
  // GET /api/mcp - List all MCP servers with their status
  fastify.get("/", async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const clients = await selectMcpClientsAction();
      return reply.send(clients);
    } catch (error) {
      request.ctx?.logger.error(
        error instanceof Error ? error : new Error(String(error)),
        "mcp.list.error",
        "Failed to list MCP clients",
      );
      return reply.status(500).send({ error: "Failed to list MCP clients" });
    }
  });

  // GET /api/mcp/tools - Get all available tools from all connected MCP servers
  fastify.get("/tools", async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const tools = await getMcpToolsAction();
      // Convert to serializable format (remove execute functions)
      const serializedTools = Object.entries(tools).map(([id, tool]) => ({
        id,
        description: tool.description,
        inputSchema: tool.inputSchema,
        _mcpServerName: tool._mcpServerName,
        _mcpServerId: tool._mcpServerId,
        _originToolName: tool._originToolName,
      }));
      return reply.send(serializedTools);
    } catch (error) {
      request.ctx?.logger.error(
        error instanceof Error ? error : new Error(String(error)),
        "mcp.tools.error",
        "Failed to get MCP tools",
      );
      return reply.status(500).send({ error: "Failed to get MCP tools" });
    }
  });

  // GET /api/mcp/config-path - Get the MCP configuration file path
  fastify.get("/config-path", async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const path = getMcpConfigPath();
      return reply.send({ path });
    } catch (error) {
      request.ctx?.logger.error(
        error instanceof Error ? error : new Error(String(error)),
        "mcp.config-path.error",
        "Failed to get MCP config path",
      );
      return reply.status(500).send({ error: "Failed to get MCP config path" });
    }
  });

  // GET /api/mcp/:id - Get a specific MCP server
  fastify.get<{ Params: IdParams }>("/:id", async (request, reply) => {
    try {
      const { id } = request.params;
      const client = await selectMcpClientAction(id);
      return reply.send(client);
    } catch (error) {
      request.ctx?.logger.error(
        error instanceof Error ? error : new Error(String(error)),
        "mcp.get.error",
        "Failed to get MCP client",
      );
      const message = error instanceof Error ? error.message : "Failed to get MCP client";
      if (message.includes("not found")) {
        return reply.status(404).send({ error: message });
      }
      return reply.status(500).send({ error: message });
    }
  });

  // POST /api/mcp - Create a new MCP server
  fastify.post<{ Body: CreateMcpServerBody }>("/", async (request, reply) => {
    try {
      const { name, config } = request.body;

      if (!name || !config) {
        return reply.status(400).send({ error: "name and config are required" });
      }

      const result = await saveMcpClientAction({ name, config });
      return reply.status(201).send(result);
    } catch (error) {
      request.ctx?.logger.error(
        error instanceof Error ? error : new Error(String(error)),
        "mcp.create.error",
        "Failed to create MCP client",
      );
      const message = error instanceof Error ? error.message : "Failed to create MCP client";
      return reply.status(500).send({ error: message });
    }
  });

  // DELETE /api/mcp/:id - Remove an MCP server
  fastify.delete<{ Params: IdParams }>("/:id", async (request, reply) => {
    try {
      const { id } = request.params;
      await removeMcpClientAction(id);
      return reply.status(204).send();
    } catch (error) {
      request.ctx?.logger.error(
        error instanceof Error ? error : new Error(String(error)),
        "mcp.delete.error",
        "Failed to remove MCP client",
      );
      return reply.status(500).send({ error: "Failed to remove MCP client" });
    }
  });

  // POST /api/mcp/:id/refresh - Refresh/reconnect an MCP server
  fastify.post<{ Params: IdParams }>("/:id/refresh", async (request, reply) => {
    try {
      const { id } = request.params;
      await refreshMcpClientAction(id);
      return reply.status(204).send();
    } catch (error) {
      request.ctx?.logger.error(
        error instanceof Error ? error : new Error(String(error)),
        "mcp.refresh.error",
        "Failed to refresh MCP client",
      );
      const message = error instanceof Error ? error.message : "Failed to refresh MCP client";
      return reply.status(500).send({ error: message });
    }
  });

  // POST /api/mcp/:id/toggle - Toggle MCP server connection state
  fastify.post<{ Params: IdParams; Body: ToggleClientBody }>(
    "/:id/toggle",
    async (request, reply) => {
      try {
        const { id } = request.params;
        const { status } = request.body;

        if (!status) {
          return reply.status(400).send({ error: "status is required" });
        }

        await toggleMcpClientConnectionAction(id, status);
        return reply.status(204).send();
      } catch (error) {
        request.ctx?.logger.error(
          error instanceof Error ? error : new Error(String(error)),
          "mcp.toggle.error",
          "Failed to toggle MCP client",
        );
        const message = error instanceof Error ? error.message : "Failed to toggle MCP client";
        return reply.status(500).send({ error: message });
      }
    },
  );

  // POST /api/mcp/:id/tool - Call a tool on an MCP server
  fastify.post<{ Params: IdParams; Body: CallToolBody }>("/:id/tool", async (request, reply) => {
    try {
      const { id } = request.params;
      const { toolName, input } = request.body;

      if (!toolName) {
        return reply.status(400).send({ error: "toolName is required" });
      }

      const result = await callMcpToolAction(id, toolName, input);
      return reply.send(result);
    } catch (error) {
      request.ctx?.logger.error(
        error instanceof Error ? error : new Error(String(error)),
        "mcp.tool.error",
        "Failed to call MCP tool",
      );
      const message = error instanceof Error ? error.message : "Failed to call MCP tool";
      return reply.status(500).send({ error: message });
    }
  });

  // POST /api/mcp/:id/allowed-tools - Update allowed tools for a server
  fastify.post<{ Params: IdParams; Body: UpdateAllowedToolsBody }>(
    "/:id/allowed-tools",
    async (request, reply) => {
      try {
        const { id } = request.params;
        const { allowedTools } = request.body;

        if (!Array.isArray(allowedTools)) {
          return reply.status(400).send({ error: "allowedTools must be an array" });
        }

        await setMcpAllowedToolsAction(id, allowedTools);
        return reply.status(204).send();
      } catch (error) {
        request.ctx?.logger.error(
          error instanceof Error ? error : new Error(String(error)),
          "mcp.allowed-tools.error",
          "Failed to update allowed tools",
        );
        const message = error instanceof Error ? error.message : "Failed to update allowed tools";
        return reply.status(500).send({ error: message });
      }
    },
  );
}
