import { parentPort } from "worker_threads";
import { createRequire } from "node:module";
import { NativeAudioCapture, NativeModule } from "./types";

let nativeInstance: NativeAudioCapture | undefined;

export function initNativeModule(modulePath: string): void {
  // Support for both 'require' (CJS) logic found in bundle
  const requireFunc = typeof require !== "undefined" ? require : createRequire(import.meta.url);

  const loadedModule = requireFunc(modulePath);

  // Logic from 'qT' function in bundle
  if (process.platform === "win32") {
    const ModuleClass = loadedModule as NativeModule;
    nativeInstance = new ModuleClass.AudioCapture();
  } else {
    nativeInstance = loadedModule as NativeAudioCapture;
  }

  // Set up the log bridge to send native logs to the backend/parent
  nativeInstance!.setGlobalLogFunction((level, logEvent, payload) => {
    if (parentPort) {
      parentPort.postMessage({
        event: "log-to-backend",
        level,
        logEvent,
        payload,
      });
    }
  });

  console.log("Audio process initialized");

  if (parentPort) {
    parentPort.postMessage({ event: "initialized" });
  }
}

export function getNativeInstance(): NativeAudioCapture {
  if (!nativeInstance) {
    throw new Error("Native audio module not initialized. Call initNativeModule first.");
  }
  return nativeInstance;
}
