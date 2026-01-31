/**
 * @file server.ts
 * Server entry point
 */

import { app, initializeApp } from "./app";

const PORT = process.env.PORT ? parseInt(process.env.PORT, 10) : 3000;
const HOST = process.env.HOST || "0.0.0.0";

async function start(): Promise<void> {
  try {
    // Initialize the application
    await initializeApp();

    // Start listening
    await app.listen({ port: PORT, host: HOST });

    app.log.info(`Server running at http://${HOST}:${PORT}`);
    app.log.info("Available endpoints:");
    app.log.info("  GET  /health - Health check");
    app.log.info("  WS   /api/transcription/stream - Real-time transcription");
    app.log.info("  GET  /api/transcription/health - Transcription service health");
  } catch (err) {
    app.log.error(err);
    process.exit(1);
  }
}

start();
