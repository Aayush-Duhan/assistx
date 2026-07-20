/**
 * @file server.ts
 * Server entry point
 */

import { app, initializeApp, getSessionToken } from "./app";

const PORT = process.env.PORT ? parseInt(process.env.PORT, 10) : 0;
const HOST = process.env.HOST || "127.0.0.1";

async function start(): Promise<void> {
  try {
    // Initialize the application
    await initializeApp();

    // Start listening
    await app.listen({ port: PORT, host: HOST });

    const address = app.server.address();
    const actualPort = typeof address === "object" && address !== null ? address.port : PORT;
    const token = getSessionToken();

    app.log.info(`Server running at http://${HOST}:${actualPort}`);
    app.log.info(`Session Token: ${token}`);
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
