import { useEffect, useState } from "react";
import {
  MicAudioCapturePermissionError,
  NoMicAudioError,
  NoMicDeviceError,
  UnknownError,
} from "@/lib/audio/error";

/**
 * Returns the microphone stream, or throws if no microphone is found or unable to capture microphone data.
 *
 * @param posthog
 * @returns The microphone stream.
 *
 * @throws NoMicDeviceError if no microphone is found.
 * @throws NoMicAudioError if unable to capture microphone data.
 * @throws MicAudioCapturePermissionError if permission is denied.
 * @throws UnknownError if an unknown error occurs.
 */
export async function getMicStream() {
  const devices = await navigator.mediaDevices.enumerateDevices();
  const micDevice = devices.find((d) => d.kind === "audioinput" && d.deviceId === "default");
  if (!micDevice) {
    const error = new NoMicDeviceError("No microphone found.");
    throw error;
  }

  const micStream = await navigator.mediaDevices
    .getUserMedia({
      audio: {
        deviceId: { exact: micDevice.deviceId },
        // pass the raw audio to the transcription provider
        echoCancellation: false,
        noiseSuppression: false,
        autoGainControl: false,
      },
    })
    .catch((error) => {
      let newErr: Error;
      if (error instanceof DOMException) {
        // https://developer.mozilla.org/en-US/docs/Web/API/MediaDevices/getUserMedia#exceptions
        switch (error.name) {
          case "NotAllowedError":
          case "NotReadableError":
            newErr = new MicAudioCapturePermissionError(
              "Unable to capture microphone data.",
              error,
            );
            break;
          case "NotFoundError":
          case "OverconstrainedError":
            newErr = new NoMicDeviceError("Unable to capture microphone data.", error);
            break;
          default:
            newErr = new NoMicAudioError("Unable to capture microphone data.", error);
        }
      } else {
        newErr = new UnknownError("Unable to capture microphone data.", error);
      }
      throw newErr;
    });

  console.log(
    "Obtained mic stream:",
    micDevice.deviceId,
    "tracks:",
    micStream.getAudioTracks().length,
  );

  return micStream;
}

export function useMicDeviceName() {
  const [micDeviceName, setMicDeviceName] = useState<string | null>(null);

  useEffect(() => {
    const updateMicDeviceName = async () => {
      const devices = await navigator.mediaDevices.enumerateDevices();
      const micDevice = devices.find((d) => d.kind === "audioinput" && d.deviceId === "default");
      setMicDeviceName(micDevice?.label ?? null);
    };

    void updateMicDeviceName();

    navigator.mediaDevices.addEventListener("devicechange", updateMicDeviceName);
    return () => navigator.mediaDevices.removeEventListener("devicechange", updateMicDeviceName);
  }, []);

  return micDeviceName;
}
