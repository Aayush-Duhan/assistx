/**
 * @file routes/providers.routes.ts
 * REST API routes for unified provider management (connections + nodes + validation)
 */

import type { FastifyInstance, FastifyRequest, FastifyReply } from "fastify";
import {
  getProviderConnections,
  getProviderConnectionById,
  createProviderConnection,
  updateProviderConnection,
  deleteProviderConnection,
  getProviderNodes,
  createProviderNode,
  updateProviderNode,
  deleteProviderNode,
} from "../db";
import { PROVIDER_MODELS, REGISTRY } from "../lib/providers";
import { fetchSuggestedModels } from "../lib/providers/suggestedModels";

interface ConnectionBody {
  provider: string;
  authType: string;
  name?: string;
  email?: string;
  priority?: number;
  isActive?: boolean;
  apiKey?: string;
  providerSpecificData?: any;
  proxyPoolId?: string;
  connectionProxyEnabled?: boolean;
  connectionProxyUrl?: string;
  connectionNoProxy?: string;
}

interface NodeBody {
  id?: string;
  type: string;
  name: string;
  prefix?: string;
  apiType?: string;
  baseUrl?: string;
}

interface ValidateBody {
  provider: string;
  apiKey?: string;
  providerSpecificData?: any;
}

interface IdParams {
  id: string;
}

interface ProviderIdParams {
  providerId: string;
}

async function probeProvider(
  provider: string,
  apiKey: string,
  baseUrl?: string,
): Promise<{ valid: boolean; error?: string }> {
  try {
    if (provider === "openai") {
      const res = await fetch("https://api.openai.com/v1/models", {
        headers: { Authorization: `Bearer ${apiKey}` },
      });
      return { valid: res.ok, error: res.ok ? undefined : "Invalid API key" };
    }
    if (provider === "anthropic") {
      const res = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: {
          "x-api-key": apiKey,
          "anthropic-version": "2023-06-01",
          "content-type": "application/json",
        },
        body: JSON.stringify({
          model: "claude-3-haiku-20240307",
          max_tokens: 1,
          messages: [{ role: "user", content: "test" }],
        }),
      });
      return {
        valid: res.status !== 401,
        error: res.status === 401 ? "Invalid API key" : undefined,
      };
    }
    if (provider === "gemini") {
      const res = await fetch(`https://generativelanguage.googleapis.com/v1/models?key=${apiKey}`);
      return { valid: res.ok, error: res.ok ? undefined : "Invalid API key" };
    }
    if (provider === "openrouter") {
      const res = await fetch("https://openrouter.ai/api/v1/models", {
        headers: { Authorization: `Bearer ${apiKey}` },
      });
      return { valid: res.ok, error: res.ok ? undefined : "Invalid API key" };
    }

    if (baseUrl) {
      const modelsUrl = `${baseUrl.replace(/\/$/, "")}/models`;
      const res = await fetch(modelsUrl, {
        headers: { Authorization: `Bearer ${apiKey}` },
      });
      if (res.ok) return { valid: true };

      // Try fallback to chat completion ping
      const chatRes = await fetch(`${baseUrl.replace(/\/$/, "")}/chat/completions`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "ping",
          messages: [{ role: "user", content: "ping" }],
          max_tokens: 1,
        }),
      });
      const valid = chatRes.status !== 401 && chatRes.status !== 403;
      return { valid, error: valid ? undefined : "Invalid API key or endpoint" };
    }

    return { valid: true };
  } catch (err) {
    return { valid: false, error: err instanceof Error ? err.message : String(err) };
  }
}

export async function providersRoutes(fastify: FastifyInstance): Promise<void> {
  // GET /api/providers - List all connections (safe metadata only)
  fastify.get("/", async (_request: FastifyRequest, reply: FastifyReply) => {
    try {
      const connections = getProviderConnections();

      let nodeNameMap: Record<string, string> = {};
      try {
        const nodes = getProviderNodes();
        for (const node of nodes) {
          if (node.id && node.name) nodeNameMap[node.id] = node.name;
        }
      } catch {
        // Safe fallback
      }

      const safeConnections = connections.map((c) => {
        const isCompatible =
          c.provider === "openai-compatible" || c.provider === "anthropic-compatible";
        const name = isCompatible
          ? c.name || nodeNameMap[c.provider] || c.providerSpecificData?.nodeName || c.provider
          : c.name;

        const result = { ...c, name };
        delete result.apiKey;
        delete result.accessToken;
        delete result.refreshToken;
        delete result.idToken;
        return result;
      });

      return reply.send({ connections: safeConnections });
    } catch {
      return reply.status(500).send({ error: "Failed to fetch providers" });
    }
  });

  // GET /api/providers/:id - Get single connection
  fastify.get<{ Params: IdParams }>("/:id", async (request, reply) => {
    try {
      const { id } = request.params;
      const connection = getProviderConnectionById(id);
      if (!connection) {
        return reply.status(404).send({ error: "Connection not found" });
      }

      const result = { ...connection };
      delete result.apiKey;
      delete result.accessToken;
      delete result.refreshToken;
      delete result.idToken;

      return reply.send({ connection: result });
    } catch {
      return reply.status(500).send({ error: "Failed to fetch connection" });
    }
  });

  // POST /api/providers - Create new connection
  fastify.post<{ Body: ConnectionBody }>("/", async (request, reply) => {
    try {
      const conn = createProviderConnection(request.body);
      const result = { ...conn };
      delete result.apiKey;
      delete result.accessToken;
      delete result.refreshToken;
      delete result.idToken;

      return reply.status(201).send({ connection: result });
    } catch {
      return reply.status(500).send({ error: "Failed to create connection" });
    }
  });

  // PUT /api/providers/:id - Update connection
  fastify.put<{ Params: IdParams; Body: ConnectionBody }>("/:id", async (request, reply) => {
    try {
      const { id } = request.params;
      const conn = updateProviderConnection(id, request.body);
      if (!conn) {
        return reply.status(404).send({ error: "Connection not found" });
      }

      const result = { ...conn };
      delete result.apiKey;
      delete result.accessToken;
      delete result.refreshToken;
      delete result.idToken;

      return reply.send({ connection: result });
    } catch {
      return reply.status(500).send({ error: "Failed to update connection" });
    }
  });

  // DELETE /api/providers/:id - Delete connection
  fastify.delete<{ Params: IdParams }>("/:id", async (request, reply) => {
    try {
      const { id } = request.params;
      const ok = deleteProviderConnection(id);
      if (!ok) {
        return reply.status(404).send({ error: "Connection not found" });
      }
      return reply.send({ message: "Connection deleted successfully" });
    } catch {
      return reply.status(500).send({ error: "Failed to delete connection" });
    }
  });

  // POST /api/providers/validate - Validate probe credentials
  fastify.post<{ Body: ValidateBody }>("/validate", async (request, reply) => {
    try {
      const { provider, apiKey, providerSpecificData } = request.body;
      if (!provider) {
        return reply.status(400).send({ error: "Provider is required" });
      }
      const res = await probeProvider(provider, apiKey || "", providerSpecificData?.baseUrl);
      return reply.send(res);
    } catch {
      return reply.status(500).send({ error: "Failed to validate credentials" });
    }
  });

  // GET /api/providers/:id/models - Get models list for a specific connection
  fastify.get<{ Params: IdParams }>("/:id/models", async (request, reply) => {
    try {
      const { id } = request.params;
      const connection = getProviderConnectionById(id);
      if (!connection) {
        return reply.status(404).send({ error: "Connection not found" });
      }

      let modelsList: any[] = [];
      const isCompatible =
        connection.provider === "openai-compatible" ||
        connection.provider === "anthropic-compatible" ||
        connection.provider === "custom-embedding";

      if (isCompatible && connection.providerSpecificData?.baseUrl) {
        try {
          const baseUrl = connection.providerSpecificData.baseUrl.replace(/\/$/, "");
          const url = `${baseUrl}/models`;
          const headers: any = {};
          if (connection.apiKey) {
            headers["Authorization"] = `Bearer ${connection.apiKey}`;
          }
          const res = await fetch(url, { headers, signal: AbortSignal.timeout(5000) });
          if (res.ok) {
            const data: any = await res.json();
            const rawModels = data.data || data.models || data.results || [];
            modelsList = rawModels.map((m: any) => ({
              id: m.id || m.name,
              name: m.name || m.id,
            }));
          }
        } catch {
          // Fallback to static
        }
      }

      if (modelsList.length === 0) {
        // Copy — merging customModels/suggested below must not mutate the shared registry array
        modelsList = [...(PROVIDER_MODELS[connection.provider] || [])];
      }

      // Models the user added manually in the providers UI
      const customModels: string[] = connection.providerSpecificData?.customModels || [];
      if (customModels.length > 0) {
        const existing = new Set(modelsList.map((m) => m.id));
        for (const id of customModels) {
          if (!existing.has(id)) modelsList.push({ id, name: id });
        }
      }

      // No-auth providers (e.g. OpenCode Free) discover models from their public API
      const registryEntry = REGISTRY.find((e: any) => e.id === connection.provider) as any;
      if (registryEntry?.noAuth && registryEntry?.modelsFetcher) {
        const suggested = await fetchSuggestedModels(registryEntry.modelsFetcher);
        const existing = new Set(modelsList.map((m) => m.id));
        for (const m of suggested) {
          if (!existing.has(m.id)) modelsList.push(m);
        }
      }

      return reply.send({ models: modelsList });
    } catch {
      return reply.status(500).send({ error: "Failed to fetch models" });
    }
  });

  // GET /api/providers/nodes - List all custom nodes
  fastify.get("/nodes", async (_request, reply) => {
    try {
      const nodes = getProviderNodes();
      return reply.send({ nodes });
    } catch {
      return reply.status(500).send({ error: "Failed to fetch nodes" });
    }
  });

  // POST /api/providers/nodes - Create custom node
  fastify.post<{ Body: NodeBody }>("/nodes", async (request, reply) => {
    try {
      const node = createProviderNode(request.body);
      return reply.status(201).send({ node });
    } catch {
      return reply.status(500).send({ error: "Failed to create node" });
    }
  });

  // PUT /api/providers/nodes/:id - Update custom node
  fastify.put<{ Params: IdParams; Body: NodeBody }>("/nodes/:id", async (request, reply) => {
    try {
      const { id } = request.params;
      const node = updateProviderNode(id, request.body);
      if (!node) {
        return reply.status(404).send({ error: "Node not found" });
      }
      return reply.send({ node });
    } catch {
      return reply.status(500).send({ error: "Failed to update node" });
    }
  });

  // DELETE /api/providers/nodes/:id - Delete custom node
  fastify.delete<{ Params: IdParams }>("/nodes/:id", async (request, reply) => {
    try {
      const { id } = request.params;
      const node = deleteProviderNode(id);
      if (!node) {
        return reply.status(404).send({ error: "Node not found" });
      }
      return reply.send({ node, message: "Node deleted successfully" });
    } catch {
      return reply.status(500).send({ error: "Failed to delete node" });
    }
  });

  // GET /api/providers/models - List all registry-defined models
  fastify.get("/models", async (_request, reply) => {
    try {
      // Build response mapping category of providers to their static models list
      const responseData: Record<string, any[]> = {};
      for (const entry of REGISTRY) {
        const providerModels = PROVIDER_MODELS[entry.id] || [];
        if (providerModels.length > 0) {
          // Copy — the customModels merge below must not mutate the shared registry array
          responseData[entry.id] = [...providerModels];
        } else if ((entry as any).modelsFetcher) {
          // No static list (e.g. OpenCode Free) — expose an empty entry so the
          // provider still shows up in the chat model picker; its models are
          // discovered via /suggested-models/:providerId and customModels.
          responseData[entry.id] = [];
        }
      }
      // Merge models the user added manually per connection so they show up in chat pickers
      try {
        for (const conn of getProviderConnections()) {
          const custom: string[] = conn.providerSpecificData?.customModels || [];
          if (!custom.length) continue;
          const list = (responseData[conn.provider] ||= []);
          const existing = new Set(list.map((m) => m.id));
          for (const id of custom) {
            if (!existing.has(id)) list.push({ id, name: id });
          }
        }
      } catch {
        // Non-fatal: static registry models still returned
      }

      // No-auth providers (e.g. OpenCode Free) have no static list — discover their
      // models from the public API so they're usable in chat without any setup
      await Promise.all(
        REGISTRY.filter((e: any) => e.noAuth && e.modelsFetcher).map(async (e: any) => {
          const suggested = await fetchSuggestedModels(e.modelsFetcher);
          if (!suggested.length) return;
          const list = (responseData[e.id] ||= []);
          const existing = new Set(list.map((m) => m.id));
          for (const m of suggested) {
            if (!existing.has(m.id)) list.push(m);
          }
        }),
      );

      return reply.send({ providerModels: responseData });
    } catch {
      return reply.status(500).send({ error: "Failed to fetch provider models" });
    }
  });

  // GET /api/providers/catalog - Registry metadata (noAuth flag) for the chat picker
  fastify.get("/catalog", async (_request, reply) => {
    return reply.send({
      providers: REGISTRY.map((e: any) => ({ id: e.id, noAuth: !!e.noAuth })),
    });
  });

  // GET /api/providers/suggested-models/:providerId - Discover models from a provider's public API
  fastify.get<{ Params: ProviderIdParams }>(
    "/suggested-models/:providerId",
    async (request, reply) => {
      try {
        const entry = REGISTRY.find((e: any) => e.id === request.params.providerId) as any;
        if (!entry?.modelsFetcher) {
          return reply.status(404).send({ error: "Provider has no models fetcher" });
        }
        const data = await fetchSuggestedModels(entry.modelsFetcher);
        return reply.send({ data });
      } catch {
        return reply.status(500).send({ error: "Failed to fetch suggested models" });
      }
    },
  );
}
