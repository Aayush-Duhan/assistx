import { Buffer } from "node:buffer";

export interface AudioCaptureStatus {
  isCapturing: boolean;
  microphoneActive: boolean;
  systemAudioActive: boolean;
}

export interface AudioCaptureStartOptions {
  useCoreAudio: boolean;
  disableEchoCancellationOnHeadphones: boolean;
  enableAutomaticGainCompensation: boolean;
  sampleRate?: number;
}

export type IncomingMessage =
  | { event: "stop-audio-capture" }
  | { event: "request-microphone-permission" }
  | { event: "request-system-audio-permission"; useCoreAudio: boolean }
  | {
      event: "start-audio-capture";
      useCoreAudio: boolean;
      disableEchoCancellationOnHeadphones: boolean;
      enableAutomaticGainCompensation: boolean;
      sampleRate?: number;
    }
  | { event: "crash-audio-capture" }
  | { event: "get-audio-capture-status" };

export type OutgoingMessage =
  | { event: "initialized" }
  | { event: "microphone-permission-response"; granted: boolean }
  | { event: "system-audio-permission-response"; granted: boolean }
  | { event: "audio-capture-status"; status: AudioCaptureStatus }
  | {
      event: "audio-capture-buffer";
      microphoneBuffer: Buffer | null;
      systemAudioBuffer: Buffer | null;
    }
  | { event: "audio-volume"; system: number; microphone: number }
  | { event: "log-to-backend"; level: string; logEvent: string; payload?: any };

export type LogCallback = (level: string, logEvent: string, payload?: any) => void;
export type AudioDataCallback = (micBuffer: Buffer | null, systemBuffer: Buffer | null) => void;

export interface NativeAudioCapture {
  setGlobalLogFunction(callback: LogCallback): void;
  stopAudioCapture(): void;
  requestMicrophonePermission(callback: (granted: boolean) => void): void;
  requestSystemAudioPermission(useCoreAudio: boolean, callback: (granted: boolean) => void): void;
  startAudioCapture(
    useCoreAudio: boolean,
    disableEchoCancellationOnHeadphones: boolean,
    enableAutomaticGainCompensation: boolean,
    sampleRate: number | undefined,
    callback: AudioDataCallback,
  ): void;
  crashAudioCapture(): void;
  getAudioCaptureStatus(): AudioCaptureStatus;
}

export interface NativeModule {
  AudioCapture: new () => NativeAudioCapture;
}
