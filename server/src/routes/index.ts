/**
 * @file routes/index.ts
 * Central route registration
 */

import type { FastifyInstance } from "fastify";
import { transcriptionRoutes } from "./transcription.routes";
import { modesRoutes } from "./modes.routes";
import { agentsRoutes } from "./agents.routes";
import { providersRoutes } from "./providers.routes";
import { oauthRoutes } from "./oauth.routes";
import { mcpRoutes } from "./mcp.routes";
import { chatRoutes } from "./chat.routes";

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

  // OAuth routes (registered before providers to avoid :id matching "oauth")
  await fastify.register(oauthRoutes, { prefix: "/api/providers/oauth" });

  // Providers routes (unified connection and node management)
  await fastify.register(providersRoutes, { prefix: "/api/providers" });

  // MCP routes (Model Context Protocol server management)
  await fastify.register(mcpRoutes, { prefix: "/api/mcp" });

  // Chat routes (OpenAI-compatible proxy over provider connections)
  await fastify.register(chatRoutes, { prefix: "/api/chat" });

  // Global OAuth loopback callback landing page for browser OAuth redirects (e.g. Google / Antigravity / Gemini)
  fastify.get<{ Querystring: { code?: string; state?: string; error?: string } }>(
    "/oauth/callback",
    async (request, reply) => {
      const { code, state, error } = request.query || {};
      process.emit("provider-oauth-callback" as any, { code, state, error });

      reply.type("text/html");
      return reply.send(`
        <!DOCTYPE html>
        <html>
          <head>
            <meta charset="utf-8"/>
            <title>AssistX Authentication</title>
            <style>
              body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; background-color: #0f172a; color: #f8fafc; display: flex; align-items: center; justify-content: center; height: 100vh; margin: 0; }
              .card { background: #1e293b; border: 1px solid #334155; padding: 2.5rem; border-radius: 12px; text-align: center; max-width: 400px; box-shadow: 0 10px 25px -5px rgba(0,0,0,0.5); }
              h2 { color: #38bdf8; margin-top: 0; font-size: 1.5rem; }
              p { color: #94a3b8; line-height: 1.5; font-size: 0.95rem; }
            </style>
          </head>
          <body>
            <div class="card">
              <h2>${error ? "Authentication Failed" : "Authentication Successful!"}</h2>
              <p>${error ? error : "You have successfully authenticated. You may close this tab and return to AssistX."}</p>
            </div>
            <script>setTimeout(() => window.close(), 2000);</script>
          </body>
        </html>
      `);
    },
  );
}
