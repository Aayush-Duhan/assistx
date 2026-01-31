/**
 * @file routes/index.ts
 * Central route registration
 */

import type { FastifyInstance } from "fastify";
import { transcriptionRoutes } from "./transcription.routes";
import { modesRoutes } from "./modes.routes";
import { agentsRoutes } from "./agents.routes";
import { apiKeysRoutes } from "./api-keys.routes";
import { modelsRoutes } from "./models.routes";
import { mcpRoutes } from "./mcp.routes";

/**
 * Register all API routes
 */
export async function registerRoutes(fastify: FastifyInstance): Promise<void> {
  // Transcription routes (WebSocket for real-time audio)
  await fastify.register(transcriptionRoutes, { prefix: "/api/transcription" });

  // Modes routes (CRUD operations)
  await fastify.register(modesRoutes, { prefix: "/api/modes" });

  // Agents routes (CRUD operations)
  await fastify.register(agentsRoutes, { prefix: "/api/agents" });

  // API Keys routes (secure key management)
  await fastify.register(apiKeysRoutes, { prefix: "/api/api-keys" });

  // Models routes (built-in + custom models)
  await fastify.register(modelsRoutes, { prefix: "/api/models" });

  // MCP routes (Model Context Protocol server management)
  await fastify.register(mcpRoutes, { prefix: "/api/mcp" });
}
