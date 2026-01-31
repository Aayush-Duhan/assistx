import { IS_MAC } from "@/lib/constants";
import { APP_NAME } from "@/lib/constants";

// no device found
export class NoMicDeviceError extends Error {
  cause?: Error;
  constructor(message: string, cause?: Error) {
    super(message);
    this.name = "NoMicDeviceError";
    this.cause = cause;
  }
}

// device found, but no permission to read it
export class MicAudioCapturePermissionError extends Error {
  cause?: Error;
  constructor(message: string, cause?: Error) {
    super(message);
    this.name = "MicAudioCapturePermissionError";
    this.cause = cause;
  }
}

// device found, and permissions are okay, but no audio tracks available
export class NoMicAudioError extends Error {
  cause?: Error;
  constructor(message: string, cause?: Error) {
    super(message);
    this.name = "NoMicAudioError";
    this.cause = cause;
  }
}

export class UnableToEnumerateDevicesError extends Error {
  cause?: Error;
  constructor(message: string, cause?: Error) {
    super(message);
    this.name = "UnableToEnumerateDevicesError";
    this.cause = cause;
  }
}

export class UnsupportedPlatformError extends Error {
  cause?: Error;
  constructor(message: string, cause?: Error) {
    super(message);
    this.name = "UnsupportedPlatformError";
    this.cause = cause;
  }
}

// no system audio device found
export class NoSystemAudioDeviceError extends Error {
  cause?: Error;
  constructor(message: string, cause?: Error) {
    super(message);
    this.name = "NoSystemAudioDeviceError";
    this.cause = cause;
  }
}

// system audio capture permission denied
export class SystemAudioCapturePermissionError extends Error {
  cause?: Error;
  constructor(message: string, cause?: Error) {
    super(message);
    this.name = "MediaCapturePermissionError";
    this.cause = cause;
  }
}

// no system audio tracks found
export class NoSystemAudioTracksError extends Error {
  cause?: Error;
  constructor(message: string, cause?: Error) {
    super(message);
    this.name = "NoSystemAudioTracksError";
    this.cause = cause;
  }
}

export class NoWindowsVirtualAudioDeviceError extends Error {
  cause?: Error;
  constructor(message: string, cause?: Error) {
    super(message);
    this.name = "NoWindowsVirtualAudioDeviceError";
    this.cause = cause;
  }
}

export class NetworkError extends Error {
  cause?: Error;
  constructor(message: string, cause?: Error) {
    super(message);
    this.name = "NetworkError";
    this.cause = cause;
  }
}

export class UnknownError extends Error {
  cause?: Error;
  constructor(message: string, cause?: Error) {
    super(message);
    this.name = "UnknownError";
    this.cause = cause;
  }
}

type Action = "close" | "retry" | "macSettings";

export function getAudioCaptureErrorMessage(error: Error): {
  title: string;
  message: string;
  actions: Action[];
} {
  switch (true) {
    case error instanceof SystemAudioCapturePermissionError:
      return {
        title: "Missing System Audio Permission",
        message: `${APP_NAME} needs permission to capture your system audio`,
        actions: ["close", IS_MAC ? "macSettings" : "retry"],
      };
    case error instanceof MicAudioCapturePermissionError:
      return {
        title: "Missing Microphone Permission",
        message: `${APP_NAME} needs permission to capture your microphone audio`,
        actions: ["close", IS_MAC ? "macSettings" : "retry"],
      };
    case error instanceof NoMicDeviceError:
      return {
        title: "No Microphone Found",
        message: `${APP_NAME} couldn't find your microphone, please try again`,
        actions: ["close", "retry"],
      };
    case error instanceof NoMicAudioError:
      return {
        title: "No Microphone Audio",
        message: `${APP_NAME} couldn't capture audio from your microphone, please try again`,
        actions: ["close", "retry"],
      };
    case error instanceof NoSystemAudioDeviceError:
      return {
        title: "No System Audio",
        message: `${APP_NAME} couldn't find your system audio device, please try again`,
        actions: ["close", "retry"],
      };
    case error instanceof NoSystemAudioTracksError:
      return {
        title: "No System Audio",
        message: `${APP_NAME} couldn't find any system audio tracks, please try again`,
        actions: ["close", "retry"],
      };
    case error instanceof NetworkError:
      return {
        title: "Network Error",
        message: `${APP_NAME}'s having trouble connecting, please try again later`,
        actions: ["close", "retry"],
      };
    default:
      return {
        title: "Unknown Error",
        message: `${APP_NAME} couldn't capture audio, please try again`,
        actions: ["close", "retry"],
      };
  }
}
