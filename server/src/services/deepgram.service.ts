/**
 * @file services/deepgram.service.ts
 * Deepgram transcription service - handles real-time audio transcription
 */

import { DeepgramClient } from "@deepgram/sdk";
import { getRequiredDeepgramApiKey } from "../env";
import type { TranscriptionResult } from "../types";
import { logger } from "../lib/pino/logger";

// Deepgram configuration.
// SDK v5 codegen types the boolean flags as "true" | "false" strings.
const DEEPGRAM_CONFIG = {
  model: "nova-3", // nova-2 has better real-time performance
  language: "en-US", // Specific language for faster processing
  encoding: "linear16",
  sample_rate: 16000,
  channels: 1,
  punctuate: "true",
  smart_format: "true",
  interim_results: "true", // Enable real-time interim results
  endpointing: 200, // Faster endpointing for real-time response
  utterance_end_ms: 1000, // End utterance after 1s of silence
  vad_events: "true", // Voice activity detection
};

type DeepgramConnection = Awaited<ReturnType<DeepgramClient["listen"]["v1"]["connect"]>>;

/**
 * Manages a Deepgram transcription session
 */
export class DeepgramSession {
  private connection: DeepgramConnection | null = null;
  private onTranscriptCallback: ((result: TranscriptionResult) => void) | null = null;
  private onErrorCallback: ((error: Error) => void) | null = null;
  private onCloseCallback: (() => void) | null = null;
  private onOpenCallback: (() => void) | null = null;
  private keepAliveInterval: NodeJS.Timeout | null = null;

  async start(): Promise<void> {
    const apiKey = getRequiredDeepgramApiKey();
    const deepgram = new DeepgramClient({ apiKey });

    const connection = await deepgram.listen.v1.connect(DEEPGRAM_CONFIG);

    // v5 sockets are created closed; handlers must be registered before opening.
    connection.on("open", () => {
      logger.info("deepgram.connection", "Deepgram connection opened");
      // Notify caller that connection is ready
      if (this.onOpenCallback) {
        this.onOpenCallback();
      }
      // Start keep-alive
      this.keepAliveInterval = setInterval(() => {
        if (this.connection) {
          this.connection.sendKeepAlive({ type: "KeepAlive" });
        }
      }, 10000);
    });

    connection.on("message", (data) => {
      if (data.type !== "Results") return;
      const transcript = data.channel?.alternatives?.[0];
      if (transcript && this.onTranscriptCallback) {
        this.onTranscriptCallback({
          transcript: transcript.transcript || "",
          isFinal: data.is_final || false,
          confidence: transcript.confidence || 0,
          words: transcript.words?.map((w: any) => ({
            word: w.word,
            start: w.start,
            end: w.end,
            confidence: w.confidence,
          })),
        });
      }
    });

    connection.on("error", (error) => {
      logger.error(
        error instanceof Error ? error : new Error(String(error)),
        "deepgram.error",
        "Deepgram error",
      );
      if (this.onErrorCallback) {
        this.onErrorCallback(error instanceof Error ? error : new Error(String(error)));
      }
    });

    connection.on("close", () => {
      logger.info("deepgram.connection", "Deepgram connection closed");
      this.cleanup();
      if (this.onCloseCallback) {
        this.onCloseCallback();
      }
    });

    connection.connect();
    await connection.waitForOpen();
    this.connection = connection;
  }

  sendAudio(audioData: Buffer): void {
    if (this.connection) {
      // Convert Buffer to ArrayBuffer for Deepgram SDK
      const arrayBuffer = audioData.buffer.slice(
        audioData.byteOffset,
        audioData.byteOffset + audioData.byteLength,
      ) as ArrayBuffer;
      this.connection.sendMedia(arrayBuffer);
    }
  }

  onTranscript(callback: (result: TranscriptionResult) => void): void {
    this.onTranscriptCallback = callback;
  }

  onError(callback: (error: Error) => void): void {
    this.onErrorCallback = callback;
  }

  onClose(callback: () => void): void {
    this.onCloseCallback = callback;
  }

  onOpen(callback: () => void): void {
    this.onOpenCallback = callback;
  }

  close(): void {
    this.connection?.close();
    this.cleanup();
  }

  private cleanup(): void {
    if (this.keepAliveInterval) {
      clearInterval(this.keepAliveInterval);
      this.keepAliveInterval = null;
    }
    this.connection = null;
  }
}

/**
 * Factory function to create a new Deepgram session
 */
export function createDeepgramSession(): DeepgramSession {
  return new DeepgramSession();
}
