/**
 * @file routes/models.routes.ts
 * REST API routes for AI models CRUD operations
 */

import type { FastifyInstance, FastifyRequest, FastifyReply } from "fastify";
import { listAIModels, createAIModel, updateAIModel, deleteAIModel, listApiKeys } from "../db";
import { PROVIDERS } from "../db/seed-data";

// Request body types
interface CreateModelBody {
  providerId: string;
  modelId: string;
  displayName: string;
  contextWindow?: number;
  maxOutputTokens?: number;
  supportsVision?: boolean;
  supportsTools?: boolean;
}

interface UpdateModelBody {
  providerId?: string;
  modelId?: string;
  displayName?: string;
  contextWindow?: number;
  maxOutputTokens?: number;
  supportsVision?: boolean;
  supportsTools?: boolean;
  isEnabled?: boolean;
}

interface IdParams {
  id: string;
}

export async function modelsRoutes(fastify: FastifyInstance): Promise<void> {
  // GET /api/models - List all models (built-in + custom) with provider key status
  fastify.get("/", async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      // Get all models from DB (includes both built-in and custom)
      const allModels = listAIModels();

      // Get configured API keys to check provider status
      const apiKeys = listApiKeys();
      const configuredProviders = new Set(apiKeys.map((k) => k.provider));

      // Build response grouped by provider
      const providers = PROVIDERS.map((provider) => {
        const providerModels = allModels.filter((m) => m.providerId === provider.id);

        return {
          providerId: provider.id,
          displayName: provider.displayName,
          hasApiKey: configuredProviders.has(provider.id),
          builtInModels: providerModels.filter((m) => m.isBuiltIn),
          customModels: providerModels.filter((m) => !m.isBuiltIn),
        };
      });

      return reply.send(providers);
    } catch (error) {
      request.ctx?.logger.error(
        error instanceof Error ? error : new Error(String(error)),
        "models.list.error",
        "Failed to list models",
      );
      return reply.status(500).send({ error: "Failed to list models" });
    }
  });

  // GET /api/models/custom - List only custom models
  fastify.get("/custom", async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const models = listAIModels();
      return reply.send(models);
    } catch (error) {
      request.ctx?.logger.error(
        error instanceof Error ? error : new Error(String(error)),
        "models.custom.list.error",
        "Failed to list custom models",
      );
      return reply.status(500).send({ error: "Failed to list custom models" });
    }
  });

  // POST /api/models - Create a custom model
  fastify.post<{ Body: CreateModelBody }>("/", async (request, reply) => {
    try {
      const {
        providerId,
        modelId,
        displayName,
        contextWindow,
        maxOutputTokens,
        supportsVision,
        supportsTools,
      } = request.body;

      if (!providerId || !modelId || !displayName) {
        return reply
          .status(400)
          .send({ error: "providerId, modelId, and displayName are required" });
      }

      const result = createAIModel({
        providerId,
        modelId,
        displayName,
        contextWindow,
        maxOutputTokens,
        supportsVision,
        supportsTools,
      });

      return reply.status(201).send(result);
    } catch (error) {
      request.ctx?.logger.error(
        error instanceof Error ? error : new Error(String(error)),
        "models.create.error",
        "Failed to create model",
      );
      return reply.status(500).send({ error: "Failed to create model" });
    }
  });

  // PUT /api/models/:id - Update a custom model
  fastify.put<{ Params: IdParams; Body: UpdateModelBody }>("/:id", async (request, reply) => {
    try {
      const { id } = request.params;
      const data = request.body;

      updateAIModel(id, data);
      return reply.status(204).send();
    } catch (error) {
      request.ctx?.logger.error(
        error instanceof Error ? error : new Error(String(error)),
        "models.update.error",
        "Failed to update model",
      );
      return reply.status(500).send({ error: "Failed to update model" });
    }
  });

  // DELETE /api/models/:id - Delete a custom model
  fastify.delete<{ Params: IdParams }>("/:id", async (request, reply) => {
    try {
      const { id } = request.params;
      deleteAIModel(id);
      return reply.status(204).send();
    } catch (error) {
      request.ctx?.logger.error(
        error instanceof Error ? error : new Error(String(error)),
        "models.delete.error",
        "Failed to delete model",
      );
      return reply.status(500).send({ error: "Failed to delete model" });
    }
  });
}
