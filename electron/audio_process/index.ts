import { parentPort } from "worker_threads";
import * as _ from "lodash";
import { initNativeModule, getNativeInstance } from "./native-module";
import { SILENCE_BUFFER } from "./constants";
import { bufferToInt16, calculateAverageVolume } from "./utils";
import { IncomingMessage, OutgoingMessage, AudioCaptureStartOptions } from "./types";
import { APP_NAME } from "@/shared";

const PROCESS_TITLE = `${APP_NAME} Helper (Audio)`;

process.title = PROCESS_TITLE;

// Initialize Native Module from command line argument
const modulePath = process.argv[2];
if (modulePath) {
  try {
    initNativeModule(modulePath);
  } catch (err) {
    console.error("Failed to initialize native module:", err);
    console.error(err);
  }
}

function postMessage(msg: OutgoingMessage) {
  if (parentPort) {
    // eslint-disable-next-line unicorn/require-post-message-target-origin
    parentPort.postMessage(msg);
  }
}

// Volume calculation helpers
const calculateVolume = (buffer: Buffer): number => {
  const int16Data = bufferToInt16(buffer);
  return calculateAverageVolume(int16Data);
};

// Throttle volume updates (logic from 'WT' in bundle)
const throttleVolumeSend = _.throttle(
  (sysVol: number, micVol: number) => {
    postMessage({ event: "audio-volume", system: sysVol, microphone: micVol });
  },
  100,
  { trailing: true },
);

// State for adaptive volume normalization (logic from 'KT' variables '_t', 'gt')
const INITIAL_MAX_VOLUME = 200;
let maxMicVolume = INITIAL_MAX_VOLUME;
let maxSysVolume = INITIAL_MAX_VOLUME;

// --- Action Handlers ---

function handleStopAudioCapture() {
  getNativeInstance().stopAudioCapture();
}

function handleRequestMicrophonePermission() {
  getNativeInstance().requestMicrophonePermission((granted) => {
    postMessage({ event: "microphone-permission-response", granted });
  });
}

let isRequestingSysAudio = false;
function handleRequestSystemAudioPermission(useCoreAudio: boolean) {
  if (isRequestingSysAudio) {
    postMessage({
      event: "log-to-backend",
      level: "info",
      logEvent: "audio-capture-process-ongoing-request-system-audio-permission",
    });
    return;
  }

  isRequestingSysAudio = true;
  console.log("Requesting audio permissions", { useCoreAudio });

  getNativeInstance().requestSystemAudioPermission(useCoreAudio, (granted) => {
    if (parentPort) {
      // eslint-disable-next-line unicorn/require-post-message-target-origin
      parentPort.postMessage({ event: "system-audio-permission-response", granted });
    }
    isRequestingSysAudio = false;
  });
}

function handleStartAudioCapture(options: AudioCaptureStartOptions) {
  const {
    useCoreAudio,
    disableEchoCancellationOnHeadphones,
    enableAutomaticGainCompensation,
    sampleRate,
  } = options;

  let bufferCounter = 0;

  getNativeInstance().startAudioCapture(
    useCoreAudio,
    disableEchoCancellationOnHeadphones,
    enableAutomaticGainCompensation,
    sampleRate,
    (rawMic, rawSys) => {
      let micBuf = rawMic;
      let sysBuf = rawSys;

      let micVol = 0;
      let sysVol = 0;

      // Process Microphone Buffer
      if (micBuf) {
        micVol = calculateVolume(micBuf);
        // If silence detected (0 volume), swap with silence buffer pattern
        if (micVol === 0) {
          micBuf = SILENCE_BUFFER.subarray(0, micBuf.byteLength);
          micVol = calculateVolume(micBuf);
        }
      }

      // Process System Buffer
      if (sysBuf) {
        sysVol = calculateVolume(sysBuf);
        if (sysVol === 0) {
          sysBuf = SILENCE_BUFFER.subarray(0, sysBuf.byteLength);
          sysVol = calculateVolume(sysBuf);
        }
      }

      // Send raw audio data
      postMessage({
        event: "audio-capture-buffer",
        microphoneBuffer: micBuf,
        systemAudioBuffer: sysBuf,
      });

      // Update Adaptive Max Volume (Decay logic from bundle)
      // _t = Math.max(fr, _t * .9)
      if (typeof micVol === "number") {
        maxMicVolume =
          micVol > maxMicVolume ? micVol : Math.max(INITIAL_MAX_VOLUME, maxMicVolume * 0.9);
      }

      if (typeof sysVol === "number") {
        maxSysVolume =
          sysVol > maxSysVolume ? sysVol : Math.max(INITIAL_MAX_VOLUME, maxSysVolume * 0.9);
      }

      // Normalize (0.0 to 1.0)
      const normMic = maxMicVolume > 0 ? Math.min(1, micVol / maxMicVolume) : 0;
      const normSys = maxSysVolume > 0 ? Math.min(1, sysVol / maxSysVolume) : 0;

      throttleVolumeSend(normSys, normMic);

      // Heartbeat logging every 100,000 buffers
      if (bufferCounter % 100000 === 0) {
        postMessage({
          event: "log-to-backend",
          level: "info",
          logEvent: "audio-capture-process-buffer-received",
          payload: {
            count: bufferCounter,
            microphoneBufferSize: micBuf ? micBuf.byteLength : undefined,
            systemAudioBufferSize: sysBuf ? sysBuf.byteLength : undefined,
          },
        });
      }
      bufferCounter++;
    },
  );
}

function handleCrashAudioCapture() {
  getNativeInstance().crashAudioCapture();
}

function handleGetAudioCaptureStatus() {
  postMessage({
    event: "audio-capture-status",
    status: getNativeInstance().getAudioCaptureStatus(),
  });
}

// --- Message Loop ---

if (parentPort) {
  parentPort.on("message", (message: { data: IncomingMessage }) => {
    try {
      const payload = message.data;
      // In bundle: const t = e.data; switch(t.event) ...

      switch (payload.event) {
        case "stop-audio-capture":
          handleStopAudioCapture();
          break;
        case "request-microphone-permission":
          handleRequestMicrophonePermission();
          break;
        case "request-system-audio-permission":
          handleRequestSystemAudioPermission(payload.useCoreAudio);
          break;
        case "start-audio-capture":
          handleStartAudioCapture({
            useCoreAudio: payload.useCoreAudio,
            disableEchoCancellationOnHeadphones: payload.disableEchoCancellationOnHeadphones,
            enableAutomaticGainCompensation: payload.enableAutomaticGainCompensation,
            sampleRate: payload.sampleRate,
          });
          break;
        case "crash-audio-capture":
          handleCrashAudioCapture();
          break;
        case "get-audio-capture-status":
          handleGetAudioCaptureStatus();
          break;
        default:
          // The bundle throws an "Unreachable code reached" error here
          throw new Error(`Unhandled event type: ${(payload as any).event}`);
      }
    } catch (error) {
      console.error(error);
    }
  });
}
