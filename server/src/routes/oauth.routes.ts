/**
 * @file routes/oauth.routes.ts
 * OAuth flow routes — start, callback, device code poll, manual refresh.
 */
import type { FastifyInstance, FastifyRequest, FastifyReply } from "fastify";
import {
  getOAuthProviders,
  generateAuthData,
  exchangeToken,
  requestDeviceCode,
  pollDeviceToken,
  refreshToken,
} from "../lib/oauth";
import {
  createProviderConnection,
  getProviderConnectionById,
  updateProviderConnection,
} from "../db";

function stripSecrets(conn: Record<string, unknown>): Record<string, unknown> {
  const safe = { ...conn };
  delete safe.apiKey;
  delete safe.accessToken;
  delete safe.refreshToken;
  delete safe.idToken;
  return safe;
}

interface ProviderParams {
  provider: string;
}

export async function oauthRoutes(fastify: FastifyInstance): Promise<void> {
  // GET / — list OAuth-capable providers
  fastify.get("/providers", async (_req: FastifyRequest, reply: FastifyReply) => {
    return reply.send({ providers: getOAuthProviders() });
  });

  // POST /:provider/start — initiate OAuth or device code flow
  fastify.post<{ Params: ProviderParams; Body: { redirectUri?: string } }>(
    "/:provider/start",
    async (request, reply) => {
      const { provider } = request.params;
      const { redirectUri } = request.body || {};

      try {
        // Check if this is a device code provider
        const providers = getOAuthProviders();
        const providerInfo = providers.find((p) => p.id === provider);
        if (!providerInfo) {
          return reply.status(404).send({ error: `Unknown OAuth provider: ${provider}` });
        }

        if (providerInfo.flowType === "device_code") {
          const deviceData = await requestDeviceCode(provider);
          return reply.send({ flowType: "device_code", ...deviceData });
        }

        if (!redirectUri) {
          return reply.status(400).send({ error: "redirectUri is required for authorization code flow" });
        }

        const authData = generateAuthData(provider, redirectUri);
        return reply.send(authData);
      } catch (err) {
        return reply
          .status(500)
          .send({ error: err instanceof Error ? err.message : "Failed to start OAuth" });
      }
    },
  );

  // POST /:provider/callback — exchange authorization code for tokens
  fastify.post<{ Params: ProviderParams; Body: { code: string; state: string } }>(
    "/:provider/callback",
    async (request, reply) => {
      const { provider } = request.params;
      const { code, state } = request.body || {};

      if (!code || !state) {
        return reply.status(400).send({ error: "code and state are required" });
      }

      try {
        const tokenResult = await exchangeToken(provider, code, state);

        const conn = createProviderConnection({
          provider,
          authType: "oauth",
          name: tokenResult.displayName || tokenResult.email || provider,
          email: tokenResult.email,
          accessToken: tokenResult.accessToken,
          refreshToken: tokenResult.refreshToken,
          idToken: tokenResult.idToken,
          expiresAt: tokenResult.expiresIn
            ? new Date(Date.now() + tokenResult.expiresIn * 1000).toISOString()
            : undefined,
          scope: tokenResult.scope,
          projectId: tokenResult.projectId,
          isActive: true,
          providerSpecificData: tokenResult.providerSpecificData,
        });

        return reply.status(201).send({ connection: stripSecrets(conn) });
      } catch (err) {
        return reply
          .status(400)
          .send({ error: err instanceof Error ? err.message : "Token exchange failed" });
      }
    },
  );

  // POST /:provider/poll — poll device code for token
  fastify.post<{ Params: ProviderParams; Body: { deviceCode: string; codeVerifier?: string; extraData?: Record<string, unknown> } }>(
    "/:provider/poll",
    async (request, reply) => {
      const { provider } = request.params;
      const { deviceCode, codeVerifier, extraData } = request.body || {};

      if (!deviceCode) {
        return reply.status(400).send({ error: "deviceCode is required" });
      }

      try {
        const result = await pollDeviceToken(provider, deviceCode, codeVerifier, extraData);

        if (result.success && result.tokens) {
          const conn = createProviderConnection({
            provider,
            authType: "oauth",
            name: result.tokens.displayName || result.tokens.email || provider,
            email: result.tokens.email,
            accessToken: result.tokens.accessToken,
            refreshToken: result.tokens.refreshToken,
            expiresAt: result.tokens.expiresIn
              ? new Date(Date.now() + result.tokens.expiresIn * 1000).toISOString()
              : undefined,
            scope: result.tokens.scope,
            isActive: true,
            providerSpecificData: result.tokens.providerSpecificData,
          });

          return reply.status(201).send({ success: true, connection: stripSecrets(conn) });
        }

        return reply.send({
          success: false,
          pending: result.pending || false,
          error: result.error,
        });
      } catch (err) {
        return reply
          .status(500)
          .send({ success: false, error: err instanceof Error ? err.message : "Poll failed" });
      }
    },
  );

  // POST /:provider/refresh — manually refresh a connection's token
  fastify.post<{ Params: ProviderParams; Body: { connectionId: string } }>(
    "/:provider/refresh",
    async (request, reply) => {
      const { provider } = request.params;
      const { connectionId } = request.body || {};

      if (!connectionId) {
        return reply.status(400).send({ error: "connectionId is required" });
      }

      try {
        const conn = getProviderConnectionById(connectionId);
        if (!conn) return reply.status(404).send({ error: "Connection not found" });
        if (!conn.refreshToken) {
          return reply.status(400).send({ error: "No refresh token available" });
        }

        const result = await refreshToken(provider, conn.refreshToken);
        if (!result) {
          return reply.status(502).send({ error: "Refresh failed" });
        }

        const updated = updateProviderConnection(connectionId, {
          accessToken: result.accessToken,
          refreshToken: result.refreshToken,
          expiresAt: new Date(Date.now() + (result.expiresIn || 3600) * 1000).toISOString(),
        });

        return reply.send({ connection: stripSecrets(updated) });
      } catch (err) {
        return reply
          .status(500)
          .send({ error: err instanceof Error ? err.message : "Refresh failed" });
      }
    },
  );
}
