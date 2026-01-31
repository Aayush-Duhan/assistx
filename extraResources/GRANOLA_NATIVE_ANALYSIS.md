# Granola Native Module Reverse Engineering Analysis

## Overview

**File:** `granola.native.windows.win32-x64-msvc.node`
**Type:** Node.js Native Addon (N-API)
**Architecture:** x86-64 Windows
**Compiler:** MSVC (Microsoft Visual C++)
**Language:** Rust (compiled with napi-rs bindings)
**Size:** ~545 KB

## Module Summary

This is a Rust-based Node.js native module that provides **audio capture capabilities** for the Granola application. It uses:

- **napi-rs** (v2.16.17) for Node.js bindings
- **Windows WASAPI** for audio capture
- **Media Foundation** for audio processing
- **Windows Registry** for device/system identification

## Exports

| Export | Address | Description |
|--------|---------|-------------|
| `napi_register_module_v1` | 0x18002abc0 | Main N-API module registration entry point |
| `entry` | 0x180054380 | DLL entry point |
| `tls_callback_0` | 0x180048140 | Thread Local Storage callback |

## Main Classes/Components

### 1. AudioCapture
**Source:** `src\audio_capture\mod.rs`

The main audio capture class with the following exported methods:

| Method | Description |
|--------|-------------|
| `constructor` | Creates a new AudioCapture instance |
| `crashAudioCapture` | Intentionally crash for debugging ("Audio capture crashed intentionally") |
| `getAudioCaptureStatus` | Returns capture status |
| `requestMicrophonePermission` | Request microphone access |
| `requestSystemAudioPermission` | Request system audio (loopback) access |
| `setGlobalLogFunction` | Set logging callback function |
| `startAudioCapture` | Start audio capture |
| `stopAudioCapture` | Stop audio capture |

**Constructor Options:**
```javascript
{
    input: ...,           // Input configuration
    output: ...,          // Output configuration
    outputDeviceIsHeadphones: boolean  // Whether output device is headphones
}
```

**Events/Callbacks:**
- `audio-capture-default-device-changed` - Device change notification
- `new_session` / `type` / `session_active` / `session_inactive` / `session_expired`
- `default_device_changed`

**Session Info Structure:**
```javascript
{
    sessionId: string,
    processId: number,
    processName: string,
    deviceId: string
}
```

### 2. DeviceInfo
**Source:** `src\device_info\mod.rs`

Provides device information with:

| Method | Description |
|--------|-------------|
| `uuid` | Get unique device identifier |

Uses Windows Registry key `SOFTWARE\Microsoft\Cryptography\MachineGuid` for device identification.

### 3. MicActivityTracker
**Source:** `src\mic_activity\mod.rs`

Tracks microphone activity across the system:

| Method | Description |
|--------|-------------|
| `constructor` | Creates tracker instance |
| `start` | Start monitoring microphone activity |
| `stop` | Stop monitoring |

**Callback file:** `src\mic_activity\callbacks.rs`

## Audio Capture Architecture

### Capture Flow

1. **Initialization**
   - `MFStartup()` - Initialize Media Foundation
   - `CoInitializeEx()` - Initialize COM
   - `CoCreateInstance()` - Create audio device enumerator

2. **Device Selection**
   - Supports both Render (loopback) and Capture (microphone) data flows
   - Uses `ERole` and `EDataFlow` enums for device selection
   - Logs: "Getting default audio device for |..."

3. **Audio Client Setup**
   - Initialize WASAPI audio client
   - Format negotiation: Sample Rate, Channels, Bits, Block Align
   - Logs: "Initializing audio client, format => , flags => "

4. **Capture Loop**
   - Separate threads for mic and loopback capture
   - Status tracking: `is_mic_capture_active`, `is_loopback_capture_active`
   - Error handling: "AudioCapture mic thread error:", "AudioCapture loopback thread error:"

5. **Resampling**
   - Uses internal resampler (`src\audio_capture\resampler.rs`)
   - Logs: "Initializing resampler. Input: Hz channels -> Output: Hz"
   - Format tag fallback: "Warning: Unexpected wFormatTag (), falling back to 16 bits per sample"

### Threading Model

- Uses Rust's `std::thread` for capture threads
- Uses `std::sync::mpmc` channels for inter-thread communication
- Uses napi-rs `ThreadsafeFunction` for JavaScript callbacks

## Windows API Usage

### WASAPI (Windows Audio Session API)
- Audio device enumeration
- Audio capture client
- Loopback capture (system audio)
- Microphone capture

### Media Foundation
| Import | Purpose |
|--------|---------|
| `MFStartup` | Initialize Media Foundation |
| `MFShutdown` | Shutdown Media Foundation |
| `MFCreateSample` | Create media sample |
| `MFCreateMemoryBuffer` | Create memory buffer |
| `MFCreateMediaType` | Create media type descriptor |

### COM
| Import | Purpose |
|--------|---------|
| `CoInitializeEx` | Initialize COM |
| `CoCreateInstance` | Create COM object |
| `CoTaskMemFree` | Free COM memory |

### Registry
| Import | Purpose |
|--------|---------|
| `RegOpenKeyExW` | Open registry key |
| `RegQueryValueExW` | Query registry value |
| `RegCloseKey` | Close registry key |

### Process Information
| Import | Purpose |
|--------|---------|
| `GetProcessImageFileNameW` | Get process executable path |
| `OpenProcess` | Open process handle |

## Error Handling

The module uses Rust's `Result` type extensively with napi-rs error codes:

| Error Code | Meaning |
|------------|---------|
| `InvalidArg` | Invalid argument |
| `ObjectExpected` | Object expected |
| `StringExpected` | String expected |
| `FunctionExpected` | Function expected |
| `NumberExpected` | Number expected |
| `BooleanExpected` | Boolean expected |
| `ArrayExpected` | Array expected |
| `GenericFailure` | Generic failure |
| `PendingException` | Pending exception |
| `Cancelled` | Operation cancelled |
| `EscapeCalledTwice` | Escape called twice |
| `HandleScopeMismatch` | Handle scope mismatch |
| `CallbackScopeMismatch` | Callback scope mismatch |
| `QueueFull` | Queue full |
| `Closing` | Closing |
| `BigintExpected` | BigInt expected |
| `DateExpected` | Date expected |
| `ArrayBufferExpected` | ArrayBuffer expected |
| `DetachableArraybufferExpected` | Detachable ArrayBuffer expected |
| `WouldDeadlock` | Would deadlock |
| `NoExternalBuffersAllowed` | No external buffers allowed |

## Build Information

- **Rust Toolchain:** `rustc/1159e78c4747b02ef996e55082b704c09b970588`
- **napi-rs Version:** 2.16.17
- **windows-registry Crate:** 0.5.1
- **Build Path:** `C:\Users\runneradmin\.cargo\registry\src\index.crates.io-1949cf8c6b5b557f\`
- **Build Machine:** GitHub Actions runner (`runneradmin`)

## Internal Module Structure

```
src/
├── audio_capture/
│   ├── mod.rs          # Main AudioCapture class
│   └── resampler.rs    # Audio resampling utilities
├── device_info/
│   └── mod.rs          # DeviceInfo class
└── mic_activity/
    ├── mod.rs          # MicActivityTracker class
    └── callbacks.rs    # Callback handlers
```

## Logging

The module has a global logging function that can be set via `setGlobalLogFunction()`:
- Warning when no callback: "Warning: No log callback set but asked to log."
- Log prefix: "windows-native-audio"

## Key Global Data Addresses

| Address | Description |
|---------|-------------|
| 0x180080028 | Global state flags |
| 0x180080050 | Initialization state |
| 0x180080080 | Module exports table |
| 0x180080598 | N-API environment pointer |
| 0x180080780 | Module initialized flag |
| 0x180080788 | Custom GC threadsafe function |

## Security Considerations

1. **Process Enumeration**: The module can enumerate running processes to identify audio sessions
2. **System Audio Capture**: Loopback capture allows recording all system audio
3. **Device Identification**: Uses hardware IDs for device fingerprinting

## TypeScript Interface (from actual codebase)

The native module is wrapped by TypeScript interfaces:

```typescript
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
        callback: AudioDataCallback
    ): void;
    crashAudioCapture(): void;
    getAudioCaptureStatus(): AudioCaptureStatus;
}

export interface NativeModule {
    AudioCapture: new () => NativeAudioCapture;
}
```

## Usage Pattern (TypeScript)

```typescript
import { initNativeModule, getNativeInstance } from './native-module';

// Initialize native module
initNativeModule('/path/to/granola.native.node');

// Get the native instance
const nativeCapture = getNativeInstance();

// Set up logging
nativeCapture.setGlobalLogFunction((level, logEvent, payload) => {
    console.log(`[${level}] ${logEvent}`, payload);
});

// Request permissions
nativeCapture.requestMicrophonePermission((granted) => {
    console.log('Microphone permission:', granted);
});

nativeCapture.requestSystemAudioPermission(true, (granted) => {
    console.log('System audio permission:', granted);
});

// Start audio capture
nativeCapture.startAudioCapture(
    true,   // useCoreAudio
    false,  // disableEchoCancellationOnHeadphones
    true,   // enableAutomaticGainCompensation
    16000,  // sampleRate
    (micBuffer, systemBuffer) => {
        // Handle audio buffers
        if (micBuffer) {
            console.log('Microphone buffer:', micBuffer.byteLength, 'bytes');
        }
        if (systemBuffer) {
            console.log('System audio buffer:', systemBuffer.byteLength, 'bytes');
        }
    }
);

// Get status
const status = nativeCapture.getAudioCaptureStatus();
console.log('Status:', status);

// Stop capture when done
nativeCapture.stopAudioCapture();
```

## Worker Thread Architecture

The audio capture runs in a dedicated worker thread:

1. **Main Process** - Electron main process manages the worker
2. **Audio Worker Thread** - `electron/audio_process/index.ts` runs as a worker
3. **Native Module** - `granola.native.node` handles actual audio capture

### Message Flow

```
Main Process <---> Worker Thread <---> Native Module (WASAPI)
     |                   |                    |
     |   IncomingMessage |                    |
     |------------------>|                    |
     |                   | startAudioCapture  |
     |                   |------------------->|
     |                   |                    |
     |                   |  AudioDataCallback |
     |                   |<-------------------|
     |  OutgoingMessage  |                    |
     |<------------------|                    |
```

### Worker Messages

**Incoming (to worker):**
- `stop-audio-capture`
- `request-microphone-permission`
- `request-system-audio-permission`
- `start-audio-capture`
- `crash-audio-capture`
- `get-audio-capture-status`

**Outgoing (from worker):**
- `initialized`
- `microphone-permission-response`
- `system-audio-permission-response`
- `audio-capture-status`
- `audio-capture-buffer`
- `audio-volume`
- `log-to-backend`

## Revision History

- **Analysis Date:** January 2026
- **Ghidra Version:** 11.x
- **Analysis Tool:** GhidraMCP
