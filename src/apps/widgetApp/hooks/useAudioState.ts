import type { AudioState } from "../types";
import { useGlobalServices } from "@/services/GlobalServicesContextProvider";
import {
  UnknownError,
  MicAudioCapturePermissionError,
  SystemAudioCapturePermissionError,
  NetworkError
} from "@/lib/audio/error";

/**
 * Converts a string error code from audio/transcription services to a proper Error object.
 */
function createErrorFromCode(
  errorCode: 'permission' | 'network' | 'unknown' | undefined,
  source: 'mic' | 'system'
): Error {
  switch (errorCode) {
    case 'permission':
      return source === 'mic'
        ? new MicAudioCapturePermissionError("Microphone permission denied")
        : new SystemAudioCapturePermissionError("System audio permission denied");
    case 'network':
      return new NetworkError("Network connection error");
    case 'unknown':
    default:
      return new UnknownError("An unknown error occurred while capturing audio.");
  }
}

export function useAudioState(): AudioState {
  const {
    micAudioCaptureService: mic,
    systemAudioCaptureService: sys,
    contextService,
  } = useGlobalServices();

  const micState = mic.state.state;
  const sysState = sys.state.state;

  const micTranscriptionState = mic.transcriptionService?.state.state;
  const sysTranscriptionState = sys.transcriptionService?.state.state;

  const { isInAudioSessionAndAudioIsPaused } = contextService;

  const retryAction = () => contextService.restartAudio();
  const stopAction = () => {
    contextService.stopAudio();
  };
  const pauseAction = () => contextService.pauseAudio();
  const resumeAction = () => contextService.resumeAudio();
  const startAction = () => contextService.restartAudio();

  const errorState = (error: Error): AudioState => ({
    state: "error",
    error,
    retryAction,
    stopAction,
  });

  // Check for errors from audio capture services
  if (micState === "error") {
    return errorState(createErrorFromCode(mic.state.error, 'mic'));
  }
  if (sysState === "error") {
    return errorState(createErrorFromCode(sys.state.error, 'system'));
  }

  // Check for errors from transcription services
  if (mic.transcriptionService && micTranscriptionState === "error") {
    return errorState(createErrorFromCode(mic.transcriptionService.state.error, 'mic'));
  }
  if (sys.transcriptionService && sysTranscriptionState === "error") {
    return errorState(createErrorFromCode(sys.transcriptionService.state.error, 'system'));
  }

  // Check for loading states

  if (micState === "loading" || sysState === "loading") {
    return { state: "loading", stopAction };
  }

  if (micTranscriptionState === "loading" || sysTranscriptionState === "loading") {
    return { state: "loading", stopAction };
  }

  // if here, each of the two services is either running or not running

  if (micState === "running" && sysState === "running") {
    if (isInAudioSessionAndAudioIsPaused) {
      return { state: "paused", resumeAction, stopAction };
    } else {
      return { state: "on", pauseAction, stopAction };
    }
  }

  if (micState === "not-running" && sysState === "not-running") {
    return { state: "off", startAction };
  }

  // bad state: one is running and the other is not
  return errorState(new UnknownError("An unknown error occurred while capturing audio."));
}
