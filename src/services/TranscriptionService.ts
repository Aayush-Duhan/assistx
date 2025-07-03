import { makeObservable, observable, computed, action, runInAction, autorun } from 'mobx';
import type { AudioCaptureService } from './AudioCaptureService';

// --- Constants ---
const COMMIT_TRANSCRIPTION_TIMEOUT_MS = 5000;
const COMMIT_PENDING_SPEECH_DELAY_MS = 500;

// Type definitions
type AudioSource = 'mic' | 'system';

interface AudioTranscription {
    createdAt: Date;
    source: AudioSource;
    text: string;
    contextAsText: string;
}

interface TranscriptionMetadata {
    audioBuffers: Map<string, 'speaking' | 'transcribing'>;
    latestTranscription: AudioTranscription | null;
}

type TranscriptionServiceState =
    | { state: 'loading'; socket: WebSocket | null; abortController: AbortController }
    | { state: 'running'; socket: WebSocket; metadata: TranscriptionMetadata; abortController: AbortController }
    | { state: 'error'; error: 'network' | 'unknown' };

interface WebSocketMessage {
    type: string;
    item_id?: string;
    transcript?: string;
    error?: {
        code: string;
        message: string;
    };
}

interface AudioData {
    pcm16Base64: string;
}

/**
 * A helper class to track the state of a "commit" operation.
 * It waits until all specified audio buffers have been fully transcribed by the API.
 */
class TranscriptionCommit {
    metadata: TranscriptionMetadata;
    itemIds: string[];

    constructor(metadata: TranscriptionMetadata, itemIds: string[]) {
        this.metadata = metadata;
        this.itemIds = itemIds;
        makeObservable(this, {
            allTranscribed: computed,
            anyIsSpeaking: computed,
        });
    }

    /**
     * @returns True if all tracked audio buffers have been transcribed.
     */
    get allTranscribed(): boolean {
        return !this.itemIds.some(itemId => this.metadata.audioBuffers.has(itemId));
    }

    /**
     * @returns True if any of the tracked audio buffers are still in the 'speaking' state.
     */
    get anyIsSpeaking(): boolean {
        return this.itemIds.some(itemId => this.metadata.audioBuffers.get(itemId) === 'speaking');
    }

    /**
     * Waits for all tracked audio buffers to be transcribed, with a timeout.
     */
    async waitForAllTranscribed(abortController: AbortController, timeoutMs: number): Promise<void> {
        let resolvePromise = () => {};
        const promise = new Promise<void>(resolve => {
            resolvePromise = resolve;
        });

        const disposeAutorun = autorun(() => {
            if (this.allTranscribed) {
                resolvePromise();
            }
        });

        const timeout = setTimeout(() => {
            resolvePromise();
        }, timeoutMs);

        abortController.signal.addEventListener('abort', resolvePromise);

        await promise;

        disposeAutorun();
        clearTimeout(timeout);
        abortController.signal.removeEventListener('abort', resolvePromise);
    }
}

/**
 * Manages a real-time transcription session for a single audio source (mic or system).
 * 
 * Note: For open source version, this is adapted to work without proprietary API clients.
 * You'll need to integrate with your chosen transcription service (OpenAI, Azure, etc.)
 */
export class TranscriptionService {
    source: AudioSource;
    cleanUpOnChunk: () => void;
    committingTranscriptionCount: number = 0;
    isStale: boolean = false;
    state: TranscriptionServiceState = {
        state: 'loading',
        socket: null,
        abortController: new AbortController(),
    };

    constructor(audioCaptureService: AudioCaptureService, source: AudioSource) {
        this.source = source;

        makeObservable(this, {
            committingTranscriptionCount: observable,
            isStale: observable,
            state: observable,
            latestTranscription: computed,
            canBeSwitched: computed,
            handleMessage: action,
            setState: action,
        });

        // Subscribe to the raw audio data stream from the capture service.
        this.cleanUpOnChunk = audioCaptureService.onData(data => {
            this.handleAudioCaptureData(data);
        });

        this.initializeSocket();
    }

    /**
     * Cleans up all resources used by this service instance.
     */
    dispose(): void {
        this.abortLoadingOrRunning();
        this.cleanUpOnChunk();
    }

    /**
     * Computed property to get the latest completed transcription.
     */
    get latestTranscription(): AudioTranscription | null {
        return this.state.state === 'running' ? this.state.metadata.latestTranscription : null;
    }

    /**
     * Computed property to determine if this service instance can be safely
     * swapped out for a new one. This is part of the service refresh mechanism.
     */
    get canBeSwitched(): boolean {
        if (this.committingTranscriptionCount > 0) return false;
        const hasPendingBuffers = this.state.state === 'running' && this.state.metadata.audioBuffers.size > 0;
        return !hasPendingBuffers || this.isStale;
    }

    /**
     * Signals to the API that the current audio buffers should be finalized
     * into a complete transcription.
     */
    async commitTranscription(): Promise<void> {
        if (this.state.state !== 'running') return;

        runInAction(() => { this.committingTranscriptionCount++; });
        try {
            const commitTracker = new TranscriptionCommit(
                this.state.metadata, 
                [...this.state.metadata.audioBuffers.keys()]
            );

            if (commitTracker.allTranscribed) return;

            // If speech is still being detected, wait a moment before committing
            // to allow the speaker to finish their sentence.
            if (commitTracker.anyIsSpeaking) {
                await new Promise(resolve => setTimeout(resolve, COMMIT_PENDING_SPEECH_DELAY_MS));
                if (this.state.abortController.signal.aborted) return;
                this.state.socket.send(JSON.stringify({ type: 'input_audio_buffer.commit' }));
            }

            // Wait for the API to confirm all buffers are transcribed.
            await commitTracker.waitForAllTranscribed(
                this.state.abortController, 
                COMMIT_TRANSCRIPTION_TIMEOUT_MS
            );
        } finally {
            runInAction(() => { this.committingTranscriptionCount--; });
        }
    }

    /**
     * Commits the current transcription and then marks this service instance as stale,
     * signaling that it should be replaced.
     */
    commitTranscriptionAndMarkAsStale(): void {
        this.commitTranscription().then(() => {
            runInAction(() => { this.isStale = true; });
        });
    }

    /**
     * Updates the internal state of the service.
     */
    setState = (newState: TranscriptionServiceState): void => {
        this.state = newState;
    }

    /**
     * Aborts the current operation (loading or running) and closes the WebSocket.
     */
    abortLoadingOrRunning(): void {
        if (this.state.state === 'loading' || this.state.state === 'running') {
            this.state.abortController.abort();
            this.state.socket?.close();
        }
    }

    /**
     * Initializes the WebSocket connection to the transcription API.
     * 
     * Note: For open source version, this is a mock implementation.
     * You'll need to replace this with your chosen transcription service.
     */
    async initializeSocket(): Promise<void> {
        if (this.state.state !== 'loading') return;
        const { abortController } = this.state;

        try {
            // For open source version, we'll create a mock WebSocket connection
            // In a real implementation, you would:
            // 1. Get authentication credentials for your transcription service
            // 2. Connect to the appropriate WebSocket endpoint
            // 3. Handle the specific message format of your chosen service

            console.warn('TranscriptionService: Using mock implementation for open source version');
            console.warn('Please integrate with your chosen transcription service (OpenAI, Azure, etc.)');

            // Mock WebSocket for demonstration
            const mockSocket = {
                send: (data: string) => {
                    console.debug('Mock transcription send:', data);
                },
                close: () => {
                    console.debug('Mock transcription socket closed');
                },
                onopen: null as (() => void) | null,
                onclose: null as (() => void) | null,
                onerror: null as ((error: any) => void) | null,
                onmessage: null as ((event: { data: string }) => void) | null,
            } as any;

            // Simulate successful connection
            setTimeout(() => {
                if (abortController.signal.aborted) return;
                this.setState({
                    state: 'running',
                    socket: mockSocket as WebSocket,
                    abortController: abortController,
                    metadata: {
                        audioBuffers: new Map(),
                        latestTranscription: null
                    }
                });
            }, 100);

        } catch (error) {
            if (abortController.signal.aborted) return;
            this.abortLoadingOrRunning();
            console.error("Failed to initialize transcription socket:", error);
            const isNetworkError = error instanceof Error && error.message.includes("Failed to fetch");
            this.setState({ 
                state: 'error', 
                error: isNetworkError ? 'network' : 'unknown' 
            });
        }
    }

    /**
     * Handles incoming messages from the WebSocket.
     */
    handleMessage = (message: WebSocketMessage): void => {
        if (this.state.state !== 'running') return;

        const { type } = message;

        // Ignore empty commit errors, which can happen if there's no speech.
        if (type === 'error' && message.error?.code === 'input_audio_buffer_commit_empty') {
            return;
        }

        if (type === 'error') {
            console.warn("Transcription error:", message.error);
            return;
        }

        // Track the lifecycle of an audio buffer.
        if (type === 'input_audio_buffer.speech_started' && message.item_id) {
            this.state.metadata.audioBuffers.set(message.item_id, 'speaking');
            return;
        }
        if (type === 'input_audio_buffer.committed' && message.item_id) {
            this.state.metadata.audioBuffers.set(message.item_id, 'transcribing');
            return;
        }

        // Handle the final transcription result.
        if (type === 'conversation.item.input_audio_transcription.completed' && message.item_id) {
            this.state.metadata.audioBuffers.delete(message.item_id);
            const transcript = message.transcript?.trim() || '';
            if (transcript.length > 0) {
                const transcription: AudioTranscription = {
                    createdAt: new Date(),
                    source: this.source,
                    text: transcript,
                    contextAsText: `[${this.source === 'mic' ? 'Me' : 'Them'}]\nTranscription: ${transcript}`
                };
                this.state.metadata.latestTranscription = transcription;
            }
            return;
        }
    };

    /**
     * Sends captured audio data to the WebSocket.
     */
    handleAudioCaptureData(data: AudioData): void {
        if (this.state.state === 'running') {
            this.state.socket.send(JSON.stringify({
                type: "input_audio_buffer.append",
                audio: data.pcm16Base64
            }));
        }
    }

    /**
     * Subscribe to transcription events.
     * This is used by other services to listen for new transcriptions.
     */
    onTranscription(callback: (transcription: AudioTranscription) => void): () => void {
        // For now, this is a simple implementation
        // In a real implementation, you might want to use a more sophisticated event system
        const interval = setInterval(() => {
            if (this.latestTranscription) {
                callback(this.latestTranscription);
            }
        }, 100);

        return () => clearInterval(interval);
    }
} 