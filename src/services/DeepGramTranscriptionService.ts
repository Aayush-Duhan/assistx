/**
 * @file DeepGramTranscriptionService.ts
 *
 * Client-side transcription service that connects to the server WebSocket endpoint.
 * The actual Deepgram connection is handled by the server - this client just:
 * 1. Opens a WebSocket to the server
 * 2. Streams audio data to the server
 * 3. Receives transcription results from the server
 */

import { makeObservable, observable, action } from "mobx";
import { Buffer } from "buffer";
import { AudioCaptureService } from "./AudioCaptureService";
import {
  AudioDataSource,
  AudioTranscription,
  ITranscriptionService,
  BufferState,
  Transcription,
} from "../types";

// Server WebSocket endpoint
const SERVER_WS_URL = "ws://localhost:3000/api/transcription/stream";

type ServiceState =
  | { state: "loading" }
  | { state: "running"; partialText: string | null }
  | { state: "error"; error: "permission" | "network" | "unknown" }
  | { state: "not-running" };

/**
 * Transcription service that connects to the server WebSocket endpoint.
 * Streams audio to server, receives transcription results.
 */
export class DeepgramTranscriptionService implements ITranscriptionService {
  public state: ServiceState = { state: "loading" };
  private socket: WebSocket | null = null;
  private transcriptionListeners = new Set<(transcription: AudioTranscription) => void>();
  private cleanUpOnChunk: () => void;
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 3;

  constructor(
    private audioCaptureService: AudioCaptureService,
    public readonly source: AudioDataSource,
  ) {
    makeObservable(this, {
      state: observable,
      setState: action,
    });

    // Subscribe to raw audio data from the capture service
    this.cleanUpOnChunk = this.audioCaptureService.onData((data) => {
      if (this.state.state === "running" && this.socket?.readyState === WebSocket.OPEN) {
        // Convert base64 PCM16 to binary and send to server
        const buffer = Buffer.from(data.pcm16Base64, "base64");
        this.socket.send(buffer);
      }
    });

    // Start connection to server
    this.connect();
  }

  public setState(newState: ServiceState): void {
    this.state = newState;
  }

  public dispose(): void {
    this.cleanUpOnChunk();
    this.close();
  }

  public get buffer(): BufferState | null {
    if (this.state.state === "running" && this.state.partialText != null) {
      return { partialText: this.state.partialText };
    }
    return null;
  }

  public onTranscription(callback: (transcription: AudioTranscription) => void): () => void {
    this.transcriptionListeners.add(callback);
    return () => this.transcriptionListeners.delete(callback);
  }

  public async commitTranscription(): Promise<void> {
    if (this.socket?.readyState === WebSocket.OPEN) {
      // Send finalize command to server
      this.socket.send(JSON.stringify({ type: "finalize" }));
    }
  }

  private connect(): void {
    try {
      const wsUrl = `${SERVER_WS_URL}?source=${this.source}`;
      console.log(`DeepgramTranscriptionService (${this.source}): Connecting to server...`);

      this.socket = new WebSocket(wsUrl);

      this.socket.onopen = () => {
        console.log(
          `DeepgramTranscriptionService (${this.source}): Connected to server, waiting for Deepgram ready...`,
        );
        this.reconnectAttempts = 0;
        // Don't transition to running yet - wait for 'ready' message from server
      };

      this.socket.onmessage = (event) => {
        console.log(`DeepgramTranscriptionService (${this.source}): Received message:`, event.data);
        try {
          const message = JSON.parse(event.data);
          console.log(
            `DeepgramTranscriptionService (${this.source}): Parsed message type:`,
            message.type,
          );

          switch (message.type) {
            case "ready":
              console.log(
                `DeepgramTranscriptionService (${this.source}): Deepgram ready, setting state to running`,
              );
              console.log(
                `DeepgramTranscriptionService (${this.source}): Current state before:`,
                this.state,
              );
              this.setState({ state: "running", partialText: null });
              console.log(
                `DeepgramTranscriptionService (${this.source}): Current state after:`,
                this.state,
              );
              break;
            case "transcript":
              this.handleTranscript(message.data);
              break;
            case "error":
              console.error(
                `DeepgramTranscriptionService (${this.source}): Server error:`,
                message.error,
              );
              this.setState({ state: "error", error: "network" });
              break;
            case "closed":
              console.log(
                `DeepgramTranscriptionService (${this.source}): Server closed connection`,
              );
              break;
          }
        } catch (err) {
          console.error("Failed to parse server message:", err);
        }
      };

      this.socket.onerror = (error) => {
        console.error(`DeepgramTranscriptionService (${this.source}): WebSocket error:`, error);
      };

      this.socket.onclose = (event) => {
        console.log(
          `DeepgramTranscriptionService (${this.source}): Connection closed (code: ${event.code})`,
        );

        // Attempt reconnection if not intentionally closed
        if (this.state.state === "running" && this.reconnectAttempts < this.maxReconnectAttempts) {
          this.reconnectAttempts++;
          console.log(
            `DeepgramTranscriptionService (${this.source}): Reconnecting (attempt ${this.reconnectAttempts})...`,
          );
          setTimeout(() => this.connect(), 1000 * this.reconnectAttempts);
        } else if (this.reconnectAttempts >= this.maxReconnectAttempts) {
          this.setState({ state: "error", error: "network" });
        }
      };
    } catch (error) {
      console.error(`DeepgramTranscriptionService (${this.source}): Failed to connect:`, error);
      this.setState({ state: "error", error: "network" });
    }
  }

  private handleTranscript(data: {
    transcript: string;
    isFinal: boolean;
    confidence: number;
  }): void {
    const transcript = data.transcript?.trim() ?? "";

    if (data.isFinal) {
      console.log(`DeepgramTranscriptionService (${this.source}): Final transcript:`, transcript);
      this.setState({ state: "running", partialText: null });

      if (transcript.length > 0) {
        const finalTranscription = new Transcription({ source: this.source, text: transcript });
        this.transcriptionListeners.forEach((listener) => listener(finalTranscription));
      }
    } else if (transcript.length > 0) {
      console.log(`DeepgramTranscriptionService (${this.source}): Interim transcript:`, transcript);
      this.setState({ state: "running", partialText: transcript });
    }
  }

  private close(): void {
    if (this.socket) {
      // Send close message to server
      if (this.socket.readyState === WebSocket.OPEN) {
        this.socket.send(JSON.stringify({ type: "close" }));
      }
      this.socket.close();
      this.socket = null;
    }
    this.setState({ state: "not-running" });
  }
}
