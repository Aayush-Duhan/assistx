/**
 * @file app.ts
 * Fastify application setup with plugins and routes
 */

import fastifyCors from "@fastify/cors";
import fastifyWebsocket from "@fastify/websocket";
import dotenv from "dotenv";
import Fastify from "fastify";
import { validateEnvConfig } from "./env";
import { logger } from "./lib/pino";
import ctxPlugin from "./lib/plugins/ctxPlugin";
import { registerRoutes } from "./routes";
import { initializeDatabase } from "./db";
import { initMCPService } from "./services/mcp.service";

// Load environment variables
dotenv.config();

// Create Fastify instance
export const app = Fastify({
  logger: true,
});

// Export app logger for child loggers
export const appLogger = logger;
export { logger };

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
