/**
 * @file routes/modes.routes.ts
 * REST API routes for modes CRUD operations
 */

import type { FastifyInstance, FastifyRequest, FastifyReply } from "fastify";
import { listModes, createMode, updateMode, deleteMode, setActiveMode } from "../db";

// Request body types
interface CreateModeBody {
  name: string;
  description?: string;
  systemPrompt: string;
}

interface UpdateModeBody {
  name?: string;
  description?: string;
  systemPrompt?: string;
  isActive?: boolean;
}

interface IdParams {
  id: string;
}

export async function modesRoutes(fastify: FastifyInstance): Promise<void> {
  // GET /api/modes - List all modes
  fastify.get("/", async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const modes = listModes();
      return reply.send(modes);
    } catch (error) {
      request.ctx?.logger.error(
        error instanceof Error ? error : new Error(String(error)),
        "modes.list.error",
        "Failed to list modes",
      );
      return reply.status(500).send({ error: "Failed to list modes" });
    }
  });

  // POST /api/modes - Create a new mode
  fastify.post<{ Body: CreateModeBody }>("/", async (request, reply) => {
    try {
      const { name, description, systemPrompt } = request.body;

      if (!name || !systemPrompt) {
        return reply.status(400).send({ error: "name and systemPrompt are required" });
      }

      const result = createMode({ name, description, systemPrompt });
      return reply.status(201).send(result);
    } catch (error) {
      request.ctx?.logger.error(
        error instanceof Error ? error : new Error(String(error)),
        "modes.create.error",
        "Failed to create mode",
      );
      return reply.status(500).send({ error: "Failed to create mode" });
    }
  });

  // PUT /api/modes/:id - Update a mode
  fastify.put<{ Params: IdParams; Body: UpdateModeBody }>("/:id", async (request, reply) => {
    try {
      const { id } = request.params;
      const data = request.body;

      updateMode(id, data);
      return reply.status(204).send();
    } catch (error) {
      request.ctx?.logger.error(
        error instanceof Error ? error : new Error(String(error)),
        "modes.update.error",
        "Failed to update mode",
      );
      return reply.status(500).send({ error: "Failed to update mode" });
    }
  });

  // DELETE /api/modes/:id - Delete a mode
  fastify.delete<{ Params: IdParams }>("/:id", async (request, reply) => {
    try {
      const { id } = request.params;
      deleteMode(id);
      return reply.status(204).send();
    } catch (error) {
      request.ctx?.logger.error(
        error instanceof Error ? error : new Error(String(error)),
        "modes.delete.error",
        "Failed to delete mode",
      );
      return reply.status(500).send({ error: "Failed to delete mode" });
    }
  });

  // POST /api/modes/:id/activate - Set active mode
  fastify.post<{ Params: IdParams }>("/:id/activate", async (request, reply) => {
    try {
      const { id } = request.params;
      setActiveMode(id);
      return reply.status(204).send();
    } catch (error) {
      request.ctx?.logger.error(
        error instanceof Error ? error : new Error(String(error)),
        "modes.activate.error",
        "Failed to set active mode",
      );
      return reply.status(500).send({ error: "Failed to set active mode" });
    }
  });

  // POST /api/modes/deactivate - Deactivate all modes
  fastify.post("/deactivate", async (request, reply) => {
    try {
      setActiveMode(null);
      return reply.status(204).send();
    } catch (error) {
      request.ctx?.logger.error(
        error instanceof Error ? error : new Error(String(error)),
        "modes.deactivate.error",
        "Failed to deactivate modes",
      );
      return reply.status(500).send({ error: "Failed to deactivate modes" });
    }
  });
}
