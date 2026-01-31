/**
 * @file routes/transcription.routes.ts
 * WebSocket routes for real-time audio transcription via Deepgram
 */

import type { FastifyInstance, FastifyRequest } from "fastify";
import type { WebSocket } from "ws";
import { createDeepgramSession } from "../services/deepgram.service";

/**
 * Register transcription routes
 */
export async function transcriptionRoutes(fastify: FastifyInstance): Promise<void> {
  /**
   * WebSocket endpoint for real-time transcription
   * Client sends audio chunks, server returns transcription results
   *
   * Usage:
   *   ws://localhost:3000/api/transcription/stream?source=mic
   *   ws://localhost:3000/api/transcription/stream?source=system
   */
  fastify.get("/stream", { websocket: true }, (connection, request: FastifyRequest) => {
    const socket = connection as WebSocket;
    const query = request.query as { source?: string };
    const source = query.source || "mic";

    fastify.log.info(`New transcription session started: source=${source}`);

    // Create Deepgram session
    const session = createDeepgramSession();

    // Handle transcription results
    session.onTranscript((result) => {
      if (socket.readyState === 1) {
        // WebSocket.OPEN
        socket.send(
          JSON.stringify({
            type: "transcript",
            data: result,
          }),
        );
      }
    });

    // Handle errors
    session.onError((error: Error) => {
      fastify.log.error(`Transcription error: ${error.message}`);
      if (socket.readyState === 1) {
        socket.send(
          JSON.stringify({
            type: "error",
            error: error.message,
          }),
        );
      }
    });

    // Handle session close
    session.onClose(() => {
      fastify.log.info("Deepgram session closed");
      if (socket.readyState === 1) {
        socket.send(
          JSON.stringify({
            type: "closed",
          }),
        );
      }
    });

    // Handle session open - notify client that Deepgram is ready
    session.onOpen(() => {
      fastify.log.info("Deepgram session ready");
      if (socket.readyState === 1) {
        socket.send(
          JSON.stringify({
            type: "ready",
          }),
        );
      }
    });

    // Start the session
    session.start().catch((err) => {
      fastify.log.error("Failed to start Deepgram session:", err);
      socket.send(
        JSON.stringify({
          type: "error",
          error: "Failed to start transcription session",
        }),
      );
      socket.close();
    });

    // Handle incoming audio data from client
    socket.on("message", (message: Buffer) => {
      try {
        // Check if it's a control message (JSON) or audio data (binary)
        if (message[0] === 0x7b) {
          // '{' character - JSON
          const control = JSON.parse(message.toString());
          if (control.type === "close") {
            session.close();
          }
        } else {
          // Binary audio data - forward to Deepgram
          session.sendAudio(message);
        }
      } catch {
        // Assume it's audio data if JSON parse fails
        session.sendAudio(message);
      }
    });

    // Handle client disconnect
    socket.on("close", () => {
      fastify.log.info("Client disconnected from transcription");
      session.close();
    });

    // Handle socket errors
    socket.on("error", (err: Error) => {
      fastify.log.error(`WebSocket error: ${err.message}`);
      session.close();
    });
  });

  /**
   * Health check for transcription service
   */
  fastify.get("/health", async () => {
    return {
      status: "ok",
      service: "transcription",
      timestamp: new Date().toISOString(),
    };
  });
}
