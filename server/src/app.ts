/**
 * @file app.ts
 * Fastify application setup with plugins and routes
 */

import fastifyCors from "@fastify/cors";
import fastifyWebsocket from "@fastify/websocket";
import dotenv from "dotenv";
import Fastify, { type FastifyBaseLogger } from "fastify";
import crypto from "crypto";
import { validateEnvConfig } from "./env";
import { logger } from "./lib/pino";
import ctxPlugin from "./lib/plugins/ctxPlugin";
import { registerRoutes } from "./routes";
import { initializeDatabase } from "./db";
import { initMCPService } from "./services/mcp.service";

// Load environment variables
dotenv.config();

let sessionToken: string =
  process.env.ASSISTX_SERVER_TOKEN || crypto.randomBytes(32).toString("hex");

export function getSessionToken(): string {
  return sessionToken;
}

export function setSessionToken(token: string): void {
  sessionToken = token;
  process.env.ASSISTX_SERVER_TOKEN = token;
}

// Create Fastify instance
// Route Fastify's built-in logger through the shared pino instance so its
// output matches the app logger (pretty-printed in dev) instead of raw JSON.
// The cast bridges pino 10's BaseLogger (adds msgPrefix) with Fastify's type.
export const app = Fastify({
  loggerInstance: logger.pino as unknown as FastifyBaseLogger,
});

// Export app logger for child loggers
export const appLogger = logger;
export { logger };

// Authentication hook for loopback security
app.addHook("onRequest", async (request, reply) => {
  const url = request.raw.url || "";
  // Exclude health check, OAuth callback landing, favicon, and CORS preflight OPTIONS requests
  if (
    url === "/health" ||
    url.startsWith("/health?") ||
    url === "/oauth/callback" ||
    url.startsWith("/oauth/callback?") ||
    url === "/favicon.ico" ||
    request.method === "OPTIONS"
  ) {
    return;
  }

  let token: string | undefined;

  const authHeader = request.headers.authorization;
  if (authHeader && authHeader.toLowerCase().startsWith("bearer ")) {
    token = authHeader.substring(7).trim();
  } else if (request.headers["x-api-key"]) {
    token = request.headers["x-api-key"] as string;
  } else if (url.includes("?")) {
    const queryStr = url.split("?")[1];
    const params = new URLSearchParams(queryStr);
    token = params.get("token") || undefined;
  }

  if (!token || token !== getSessionToken()) {
    return reply.status(401).send({ error: "Unauthorized: Invalid or missing session token" });
  }
});

// Register plugins
async function registerPlugins(): Promise<void> {
  // CORS - allow requests from Electron app
  await app.register(fastifyCors, {
    origin: true, // Allow all origins (Electron app runs on file://)
    credentials: true,
    methods: ["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"],
  });

  // WebSocket support for real-time transcription
  await app.register(fastifyWebsocket);

  // Context plugin - provides request.ctx with ai, db, and logger
  await app.register(ctxPlugin);
}

// Health check endpoint
app.get("/health", async () => {
  return {
    status: "ok",
    timestamp: new Date().toISOString(),
    version: "1.0.0",
  };
});

// Initialize the application
export async function initializeApp(): Promise<void> {
  // Validate environment configuration
  validateEnvConfig();

  // Initialize database
  initializeDatabase();

  // Initialize MCP service
  try {
    await initMCPService();
    logger.info("app.init", "MCP service initialized");
  } catch (error) {
    logger.error(
      error instanceof Error ? error : new Error(String(error)),
      "app.init.error",
      "Failed to initialize MCP service",
    );
  }

  // Register plugins
  await registerPlugins();

  // Register routes
  await registerRoutes(app);

  logger.info("app.init", "Application initialized");
}
