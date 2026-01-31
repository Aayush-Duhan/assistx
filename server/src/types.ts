/**
 * @file types.ts
 * Shared type definitions for the server
 */

// Deepgram transcription types
export interface TranscriptionRequest {
  // Audio source type
  source: "mic" | "system";
}

export interface TranscriptionResult {
  transcript: string;
  isFinal: boolean;
  confidence: number;
  words?: Array<{
    word: string;
    start: number;
    end: number;
    confidence: number;
  }>;
}

// AI API types
export type PromptType = "system" | "screenshot";

export interface AIStreamRequest {
  promptType: PromptType;
  userContext: string;
  userMessage: string;
  screenshot?: {
    contentType: string;
    data: string; // base64 encoded
  };
  provider?: string;
  model?: string;
}

export interface AIStreamChunk {
  type: "text" | "done" | "error";
  content?: string;
  error?: string;
  usage?: {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
  };
}

// Health check types
export interface HealthResponse {
  status: "ok" | "error";
  timestamp: string;
  services?: {
    deepgram: boolean;
    ai: boolean;
  };
}
