/**
 * @file routes/api-keys.routes.ts
 * REST API routes for API keys management
 */

import type { FastifyInstance, FastifyRequest, FastifyReply } from "fastify";
import { listApiKeys, saveApiKey, deleteApiKey, getApiKeyForProvider } from "../db";

interface SaveApiKeyBody {
  provider: string;
  key: string;
}

interface ProviderParams {
  provider: string;
}

export async function apiKeysRoutes(fastify: FastifyInstance): Promise<void> {
  // GET /api/api-keys - List all configured providers (without exposing actual keys)
  fastify.get("/", async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const keys = listApiKeys();
      // Return provider info without the actual key values
      return reply.send(
        keys.map((k) => ({
          provider: k.provider,
          name: k.name,
          isConfigured: true,
          isValid: k.isValid,
          updatedAt: k.updatedAt,
        })),
      );
    } catch (error) {
      request.ctx?.logger.error(
        error instanceof Error ? error : new Error(String(error)),
        "api-keys.list.error",
        "Failed to list API keys",
      );
      return reply.status(500).send({ error: "Failed to list API keys" });
    }
  });

  // GET /api/api-keys/:provider/status - Check if a provider has a key configured
  fastify.get<{ Params: ProviderParams }>("/:provider/status", async (request, reply) => {
    try {
      const { provider } = request.params;
      const key = getApiKeyForProvider(provider);
      return reply.send({
        provider,
        isConfigured: !!key,
      });
    } catch (error) {
      request.ctx?.logger.error(
        error instanceof Error ? error : new Error(String(error)),
        "api-keys.status.error",
        "Failed to check API key status",
      );
      return reply.status(500).send({ error: "Failed to check API key status" });
    }
  });

  // GET /api/api-keys/:provider/copy - Get the actual key for copying to clipboard
  // This endpoint returns the decrypted key - use with caution
  fastify.get<{ Params: ProviderParams }>("/:provider/copy", async (request, reply) => {
    try {
      const { provider } = request.params;
      const key = getApiKeyForProvider(provider);

      if (!key) {
        return reply.status(404).send({ error: "API key not found for provider" });
      }

      return reply.send({ key });
    } catch (error) {
      request.ctx?.logger.error(
        error instanceof Error ? error : new Error(String(error)),
        "api-keys.copy.error",
        "Failed to retrieve API key for copy",
      );
      return reply.status(500).send({ error: "Failed to retrieve API key" });
    }
  });

  // POST /api/api-keys - Save an API key for a provider
  fastify.post<{ Body: SaveApiKeyBody }>("/", async (request, reply) => {
    try {
      const { provider, key } = request.body;

      if (!provider || !key) {
        return reply.status(400).send({ error: "provider and key are required" });
      }

      saveApiKey(provider, key);
      return reply.status(201).send({ success: true });
    } catch (error) {
      request.ctx?.logger.error(
        error instanceof Error ? error : new Error(String(error)),
        "api-keys.save.error",
        "Failed to save API key",
      );
      return reply.status(500).send({ error: "Failed to save API key" });
    }
  });

  // DELETE /api/api-keys/:provider - Remove an API key
  fastify.delete<{ Params: ProviderParams }>("/:provider", async (request, reply) => {
    try {
      const { provider } = request.params;
      deleteApiKey(provider);
      return reply.status(204).send();
    } catch (error) {
      request.ctx?.logger.error(
        error instanceof Error ? error : new Error(String(error)),
        "api-keys.delete.error",
        "Failed to delete API key",
      );
      return reply.status(500).send({ error: "Failed to delete API key" });
    }
  });
}
