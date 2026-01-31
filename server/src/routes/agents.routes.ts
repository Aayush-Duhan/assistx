/**
 * @file routes/agents.routes.ts
 * REST API routes for agents CRUD operations
 */

import type { FastifyInstance, FastifyRequest, FastifyReply } from "fastify";
import { listAgents, createAgent, updateAgent, deleteAgent } from "../db";

// Request body types
interface CreateAgentBody {
  name: string;
  description?: string;
  role?: string;
  systemPrompt: string;
  iconUrl?: string;
  iconBgColor?: string;
}

interface UpdateAgentBody {
  name?: string;
  description?: string;
  role?: string;
  systemPrompt?: string;
  iconUrl?: string;
  iconBgColor?: string;
}

interface IdParams {
  id: string;
}

export async function agentsRoutes(fastify: FastifyInstance): Promise<void> {
  // GET /api/agents - List all agents
  fastify.get("/", async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const agents = listAgents();
      return reply.send(agents);
    } catch (error) {
      request.ctx?.logger.error(
        error instanceof Error ? error : new Error(String(error)),
        "agents.list.error",
        "Failed to list agents",
      );
      return reply.status(500).send({ error: "Failed to list agents" });
    }
  });

  // POST /api/agents - Create a new agent
  fastify.post<{ Body: CreateAgentBody }>("/", async (request, reply) => {
    try {
      const { name, description, role, systemPrompt, iconUrl, iconBgColor } = request.body;

      if (!name || !systemPrompt) {
        return reply.status(400).send({ error: "name and systemPrompt are required" });
      }

      const result = createAgent({
        name,
        description,
        role,
        systemPrompt,
        iconUrl,
        iconBgColor,
      });
      return reply.status(201).send(result);
    } catch (error) {
      request.ctx?.logger.error(
        error instanceof Error ? error : new Error(String(error)),
        "agents.create.error",
        "Failed to create agent",
      );
      return reply.status(500).send({ error: "Failed to create agent" });
    }
  });

  // PUT /api/agents/:id - Update an agent
  fastify.put<{ Params: IdParams; Body: UpdateAgentBody }>("/:id", async (request, reply) => {
    try {
      const { id } = request.params;
      const data = request.body;

      updateAgent(id, data);
      return reply.status(204).send();
    } catch (error) {
      request.ctx?.logger.error(
        error instanceof Error ? error : new Error(String(error)),
        "agents.update.error",
        "Failed to update agent",
      );
      return reply.status(500).send({ error: "Failed to update agent" });
    }
  });

  // DELETE /api/agents/:id - Delete an agent
  fastify.delete<{ Params: IdParams }>("/:id", async (request, reply) => {
    try {
      const { id } = request.params;
      deleteAgent(id);
      return reply.status(204).send();
    } catch (error) {
      request.ctx?.logger.error(
        error instanceof Error ? error : new Error(String(error)),
        "agents.delete.error",
        "Failed to delete agent",
      );
      return reply.status(500).send({ error: "Failed to delete agent" });
    }
  });
}
