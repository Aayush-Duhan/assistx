import { makeObservable, observable, action } from 'mobx';
import { TranscriptionService } from './TranscriptionService';

// --- Constants and Helper Classes ---

const PCM_PROCESSOR_NAME = 'pcmProcessor';
const TARGET_SAMPLE_RATE = 16000;
const AUDIO_WORKLET_LOAD_DELAY_MS = 100; // A small delay to ensure the worklet is ready.

// A list of common names for system audio loopback devices on Windows.
const WINDOWS_SYSTEM_AUDIO_DEVICE_NAMES = [
    "System Audio", "Stereo Mix", "What U Hear", "Wave Out", 
    "CABLE Output", "VoiceMeeter", "BlackHole", "Soundflower", "WASAPI Loopback"
];

// Type definitions
type AudioSource = 'mic' | 'system';
type Platform = 'win32' | 'darwin' | 'linux';

interface AudioData {
    pcm16Base64: string;
}

type DataListener = (data: AudioData) => void;

interface AudioCaptureMetadata {
    transcriptionService?: TranscriptionService;
    source?: MediaStreamAudioSourceNode;
    cleanUpNativeMacRecorder?: () => void;
}

interface AudioCaptureState {
    state: 'not-running' | 'loading' | 'running' | 'error';
    abortController?: AbortController;
    stream?: MediaStream;
    metadata?: AudioCaptureMetadata;
    error?: 'permission' | 'unknown';
}

/**
 * Custom error class for when media permissions are denied by the user.
 */
class PermissionDeniedError extends Error {
    constructor() {
        super("Permission denied");
        this.name = 'PermissionDeniedError';
    }
}

/**
 * A simple base class for creating subscribable services.
 */
class Subscribable {
    private listeners = new Set<() => void>();

    subscribe(listener: () => void): () => void {
        this.listeners.add(listener);
        return () => this.listeners.delete(listener);
    }

    protected notify(): void {
        for (const listener of this.listeners) {
            listener();
        }
    }
}


/**
 * A singleton promise to ensure the AudioContext and AudioWorklet are only initialized once.
 */
let audioContextPromise: Promise<AudioContext> | null = null;

async function getSharedAudioContext(): Promise<AudioContext> {
    if (audioContextPromise) return audioContextPromise;

    const initializeContext = async (): Promise<AudioContext> => {
        const context = new AudioContext({ sampleRate: TARGET_SAMPLE_RATE });
        await context.audioWorklet.addModule('pcm-processor.js');
        return context;
    };

    audioContextPromise = initializeContext();
    return audioContextPromise;
}

/**
 * Converts an ArrayBuffer (like the one from a PCM Int16Array) to a Base64 string.
 */
function bufferToBase64(buffer: ArrayBuffer): string {
    let binary = '';
    const bytes = new Uint8Array(buffer);
    for (const byte of bytes) {
        binary += String.fromCharCode(byte);
    }
    return btoa(binary);
}

/**
 * Manages the capture of a single audio source (mic or system).
 */
export class AudioCaptureService extends Subscribable {
    state: AudioCaptureState = { state: 'not-running' };
    source: AudioSource;
    dataListeners = new Set<DataListener>();

    constructor(source: AudioSource) {
        super();
        this.source = source;
        makeObservable(this, {
            state: observable,
            restart: action,
            setState: action,
        });
    }

    onData(callback: DataListener): () => void {
        this.dataListeners.add(callback);
        return () => this.dataListeners.delete(callback);
    }

    dispose(): void { 
        this.stop(); 
    }

    start(): void { 
        this.startAsync(); 
    }

    stop(): void { 
        this.setState({ state: 'not-running' }); 
    }

    restart(): void { 
        this.stop(); 
        this.start(); 
    }

    setState(newState: AudioCaptureState): void {
        // Cleanup logic for previous states
        if (this.state.state === 'running') {
            this.state.abortController?.abort();
            if (this.state.metadata) {
                this.detachStream(this.state.metadata);
            }
            this.state.stream?.getTracks().forEach(track => track.stop());
        }
        if (this.state.state === 'loading') {
            this.state.abortController?.abort();
        }
        this.state = newState;
    }

    async startAsync(): Promise<void> {
        if (this.state.state === 'running' || this.state.state === 'loading') return;

        const loadingAbortController = new AbortController();
        this.setState({ state: 'loading', abortController: loadingAbortController });
        
        await new Promise(resolve => setTimeout(resolve, 0)); // Yield to event loop
        if (loadingAbortController.signal.aborted) return;

        const runningAbortController = new AbortController();
        let stream: MediaStream | undefined;
        try {
            stream = await this.getStream();
            await new Promise(resolve => setTimeout(resolve, AUDIO_WORKLET_LOAD_DELAY_MS));
            if (loadingAbortController.signal.aborted) throw new Error("Aborted");

            const metadata = await this.attachStream(stream, runningAbortController.signal);
            if (loadingAbortController.signal.aborted) {
                this.detachStream(metadata);
                throw new Error("Aborted");
            }
            this.setState({ 
                state: 'running', 
                stream, 
                metadata, 
                abortController: runningAbortController 
            });
        } catch (error) {
            runningAbortController.abort();
            if (stream) stream.getTracks().forEach(track => track.stop());
            if (loadingAbortController.signal.aborted) return;
            
            console.error(`Error starting media capture for source "${this.source}":`, error);
            this.setState({ 
                state: 'error', 
                error: error instanceof PermissionDeniedError ? 'permission' : 'unknown' 
            });
        }
    }

    async getStream(): Promise<MediaStream> {
        try {
            if (this.source === 'mic') {
                const defaultMic = await this.getDefaultMic();
                return await navigator.mediaDevices.getUserMedia({
                    audio: {
                        deviceId: { exact: defaultMic.deviceId },
                        echoCancellation: true,
                        noiseSuppression: true,
                        autoGainControl: true,
                    }
                });
            }

            const platform = await window.electron.ipcRenderer.invoke('get-platform') as Platform;

            if (platform === 'darwin') {
                // On macOS, system audio is captured natively by the main process.
                return new MediaStream(); // Return an empty stream, data comes via IPC.
            }

            if (platform === 'win32') {
                // On Windows, try to find a loopback device first.
                const systemDevice = await this.getWindowsSystemAudioDevice();
                if (systemDevice) {
                    return await navigator.mediaDevices.getUserMedia({
                        audio: { deviceId: { exact: systemDevice.deviceId } }
                    });
                }
                // As a fallback, use the screen capture API to get system audio.
                const displayMedia = await navigator.mediaDevices.getDisplayMedia({
                    video: {
                        width: { ideal: 1 },
                        height: { ideal: 1 },
                        frameRate: { ideal: 1 }
                    },
                    audio: {
                        displaySurface: "monitor",
                        suppressLocalAudioPlayback: true,
                        mediaSource: "screen",
                        echoCancellation: false,
                        noiseSuppression: false,
                        autoGainControl: false,
                    } as any // Type assertion for non-standard properties
                });
                if (!displayMedia.getAudioTracks().length) {
                    displayMedia.getTracks().forEach(t => t.stop());
                    throw new Error("No audio tracks captured via getDisplayMedia");
                }
                return displayMedia;
            }

            throw new Error(`System audio capture is not supported on this platform: ${platform}`);
        } catch (error) {
            if (error instanceof DOMException && error.name === 'NotAllowedError') {
                throw new PermissionDeniedError();
            }
            throw error;
        }
    }

    async attachStream(stream: MediaStream, signal: AbortSignal): Promise<AudioCaptureMetadata> {
        const transcriptionService = new TranscriptionService(this, this.source);

        const platform = await window.electron.ipcRenderer.invoke('get-platform') as Platform;

        if (platform === 'darwin' && this.source === 'system') {
            // For macOS system audio, listen to IPC events from the native recorder.
            const macRecorderHandler = (_event: any, { base64Data }: { base64Data: string }) => {
                if (signal.aborted) return;
                for (const listener of this.dataListeners) {
                    listener({ pcm16Base64: base64Data });
                }
            };
            
            if (window.electron.ipcRenderer) {
                window.electron.ipcRenderer.on('mac-native-recorder-data', macRecorderHandler);
            }
            
            const cleanUpNativeMacRecorder = () => {
                if (window.electron.ipcRenderer) {
                    window.electron.ipcRenderer.removeListener('mac-native-recorder-data', macRecorderHandler);
                }
            };
            return { transcriptionService, cleanUpNativeMacRecorder };
        }

        // For all other cases, use the Web Audio API.
        const audioContext = await getSharedAudioContext();
        const workletNode = new AudioWorkletNode(audioContext, PCM_PROCESSOR_NAME);
        workletNode.port.onmessage = (event) => {
            if (signal.aborted) return;
            const pcm16Array = event.data as Int16Array;
            const pcm16Base64 = bufferToBase64(pcm16Array.buffer);
            for (const listener of this.dataListeners) {
                listener({ pcm16Base64 });
            }
        };

        const sourceNode = audioContext.createMediaStreamSource(stream);
        sourceNode.connect(workletNode);

        return { transcriptionService, source: sourceNode };
    }

    detachStream(metadata: AudioCaptureMetadata): void {
        metadata.transcriptionService?.dispose();
        metadata.source?.disconnect();
        metadata.cleanUpNativeMacRecorder?.();
    }

    async getDefaultMic(): Promise<MediaDeviceInfo> {
        const devices = await navigator.mediaDevices.enumerateDevices();
        const defaultMic = devices.find(d => d.kind === 'audioinput' && d.deviceId === 'default');
        if (!defaultMic) throw new Error("No default audio input device found");
        return defaultMic;
    }

    async getWindowsSystemAudioDevice(): Promise<MediaDeviceInfo | null> {
        const devices = await navigator.mediaDevices.enumerateDevices();
        return devices.find(d => 
            d.kind === 'audioinput' && 
            WINDOWS_SYSTEM_AUDIO_DEVICE_NAMES.some(name => d.label.includes(name))
        ) ?? null;
    }
} 