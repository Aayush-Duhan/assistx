/**
 * @file services/deepgram.service.ts
 * Deepgram transcription service - handles real-time audio transcription
 */

import { createClient, type LiveClient, LiveTranscriptionEvents } from "@deepgram/sdk";
import { getRequiredDeepgramApiKey } from "../env";
import type { TranscriptionResult } from "../types";
import { logger } from "../lib/pino/logger";

// Deepgram configuration
const DEEPGRAM_CONFIG = {
  model: "nova-3", // nova-2 has better real-time performance
  language: "en-US", // Specific language for faster processing
  encoding: "linear16",
  sample_rate: 16000,
  channels: 1,
  punctuate: true,
  smart_format: true,
  interim_results: true, // Enable real-time interim results
  endpointing: 200, // Faster endpointing for real-time response
  utterance_end_ms: 1000, // End utterance after 1s of silence
  vad_events: true, // Voice activity detection
};

/**
 * Creates a Deepgram live transcription client
 */
export function createDeepgramClient(): LiveClient {
  const apiKey = getRequiredDeepgramApiKey();
  const deepgram = createClient(apiKey);

  const connection = deepgram.listen.live(DEEPGRAM_CONFIG);

  return connection;
}

/**
 * Manages a Deepgram transcription session
 */
export class DeepgramSession {
  private connection: LiveClient | null = null;
  private onTranscriptCallback: ((result: TranscriptionResult) => void) | null = null;
  private onErrorCallback: ((error: Error) => void) | null = null;
  private onCloseCallback: (() => void) | null = null;
  private onOpenCallback: (() => void) | null = null;
  private keepAliveInterval: NodeJS.Timeout | null = null;

  async start(): Promise<void> {
    const apiKey = getRequiredDeepgramApiKey();
    const deepgram = createClient(apiKey);

    this.connection = deepgram.listen.live(DEEPGRAM_CONFIG);

    // Set up event handlers
    this.connection.on(LiveTranscriptionEvents.Open, () => {
      logger.info("deepgram.connection", "Deepgram connection opened");
      // Notify caller that connection is ready
      if (this.onOpenCallback) {
        this.onOpenCallback();
      }
      // Start keep-alive
      this.keepAliveInterval = setInterval(() => {
        if (this.connection) {
          this.connection.keepAlive();
        }
      }, 10000);
    });

    this.connection.on(LiveTranscriptionEvents.Transcript, (data) => {
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

    this.connection.on(LiveTranscriptionEvents.Error, (error) => {
      logger.error(
        error instanceof Error ? error : new Error(String(error)),
        "deepgram.error",
        "Deepgram error",
      );
      if (this.onErrorCallback) {
        this.onErrorCallback(error instanceof Error ? error : new Error(String(error)));
      }
    });

    this.connection.on(LiveTranscriptionEvents.Close, () => {
      logger.info("deepgram.connection", "Deepgram connection closed");
      this.cleanup();
      if (this.onCloseCallback) {
        this.onCloseCallback();
      }
    });
  }

  sendAudio(audioData: Buffer): void {
    if (this.connection) {
      // Convert Buffer to ArrayBuffer for Deepgram SDK
      const arrayBuffer = audioData.buffer.slice(
        audioData.byteOffset,
        audioData.byteOffset + audioData.byteLength,
      );
      this.connection.send(arrayBuffer);
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
    if (this.connection) {
      this.connection.requestClose();
    }
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
