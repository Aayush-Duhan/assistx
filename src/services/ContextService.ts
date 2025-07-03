import { makeObservable, observable, computed, reaction, runInAction, autorun } from 'mobx';
import { AudioCaptureService } from './AudioCaptureService';
import { AudioSession } from './AudioSession';

// --- Constants ---
const MAX_TRANSCRIPTIONS_IN_CONTEXT = 1000;

// Type definitions
type AudioSource = 'mic' | 'system';

interface AudioTranscription {
    createdAt: Date;
    source: AudioSource;
    text: string;
    contextAsText: string;
}

interface ContextServiceDependencies {
    micAudioCaptureService: AudioCaptureService;
    systemAudioCaptureService: AudioCaptureService;
}

/**
 * Maps the audio source to a human-readable role for the AI prompt.
 */
function getRoleFromSource(source: AudioSource): string {
    switch (source) {
        case 'mic':
            return 'Me';
        case 'system':
            return 'Them';
    }
}

/**
 * Represents a single piece of transcribed audio.
 */
class AudioTranscriptionImpl implements AudioTranscription {
    createdAt = new Date();
    source: AudioSource;
    text: string;

    constructor({ source, text }: { source: AudioSource; text: string }) {
        this.source = source;
        this.text = text;
        makeObservable(this);
    }

    get contextAsText(): string {
        return `[${getRoleFromSource(this.source)}]\nTranscription: ${this.text}`;
    }
}

/**
 * Holds the complete, aggregated context, primarily the list of audio transcriptions.
 */
export class FullContext {
    audioTranscriptions: AudioTranscription[] = [];

    constructor(initialTranscriptions: AudioTranscription[] = []) {
        this.audioTranscriptions = initialTranscriptions;
        makeObservable(this);
    }

    clone(): FullContext {
        return new FullContext([...this.audioTranscriptions]);
    }

    diff(oldContext: FullContext): FullContext {
        const oldTranscriptionSet = new Set(oldContext.audioTranscriptions);
        const newTranscriptions = this.audioTranscriptions.filter(
            (transcription) => !oldTranscriptionSet.has(transcription)
        );
        return new FullContext(newTranscriptions);
    }

    addAudioTranscription(transcription: AudioTranscription, maxLength: number): void {
        while (this.audioTranscriptions.length >= maxLength) {
            this.audioTranscriptions.shift();
        }
        this.audioTranscriptions.push(transcription);
    }

    clearAudioTranscriptions(): void {
        this.audioTranscriptions.length = 0;
    }

    get audioContextAsText(): string {
        if (!this.audioTranscriptions.length) return "";
        return `Audio:\n\n${this.audioTranscriptions.map((t) => t.contextAsText).join('\n\n')}`;
    }
}

/**
 * The main service for managing application context.
 * It aggregates data from various sources (mic, system audio) and manages the AI session lifecycle.
 * 
 * Note: For open source version, API client dependencies have been removed.
 */
export class ContextService {
    micAudioCaptureService: AudioCaptureService;
    systemAudioCaptureService: AudioCaptureService;
    cleanUp: () => void;

    fullContext = new FullContext();
    audioSession: AudioSession | null = null;

    constructor(services: ContextServiceDependencies) {
        this.micAudioCaptureService = services.micAudioCaptureService;
        this.systemAudioCaptureService = services.systemAudioCaptureService;

        makeObservable(this, {
            fullContext: observable,
            audioSession: observable,
            isTranscribing: computed,
            isInAudioSession: computed,
        });

        // --- MobX Reactions ---

        // Reaction 1: Manage the AudioSession lifecycle based on whether we are in a session.
        const disposeAudioSessionReaction = reaction(
            () => this.isInAudioSession,
            (isInSession) => {
                this.audioSession?.disposeWithAudioTranscriptions(this.fullContext.audioTranscriptions);
                runInAction(() => {
                    if (isInSession) {
                        this.audioSession = new AudioSession(true);
                    } else {
                        this.audioSession = null;
                        this.fullContext.clearAudioTranscriptions();
                    }
                });
            }
        );

        // Reaction 2: Listen for new transcriptions from the microphone.
        const disposeMicTranscriptionListener = autorun(() => {
            const transcriptionService = this.micAudioCaptureService.state.state === 'running' 
                ? this.micAudioCaptureService.state.metadata?.transcriptionService 
                : null;
            
            if (transcriptionService) {
                transcriptionService.onTranscription((transcription: AudioTranscription) => {
                    this.fullContext.addAudioTranscription(transcription, MAX_TRANSCRIPTIONS_IN_CONTEXT);
                });
            }
        });

        // Reaction 3: Listen for new transcriptions from the system audio.
        const disposeSystemTranscriptionListener = autorun(() => {
            const transcriptionService = this.systemAudioCaptureService.state.state === 'running' 
                ? this.systemAudioCaptureService.state.metadata?.transcriptionService 
                : null;
            
            if (transcriptionService) {
                transcriptionService.onTranscription((transcription: AudioTranscription) => {
                    this.fullContext.addAudioTranscription(transcription, MAX_TRANSCRIPTIONS_IN_CONTEXT);
                });
            }
        });

        // Cleanup function to dispose of all reactions when the service is destroyed.
        this.cleanUp = () => {
            disposeAudioSessionReaction();
            disposeMicTranscriptionListener();
            disposeSystemTranscriptionListener();
        };
    }

    /**
     * Disposes of the service and all its resources.
     */
    dispose(): void {
        this.cleanUp();
        this.audioSession?.disposeWithAudioTranscriptions(this.fullContext.audioTranscriptions);
    }

    /**
     * Commits the current transcription buffers and returns a clone of the full context.
     * This is used to get a stable snapshot of the context to send to the AI.
     */
    async commitTranscriptionsAndGetFullContext(): Promise<FullContext> {
        const micTranscriptionService = this.micAudioCaptureService.state.state === 'running' 
            ? this.micAudioCaptureService.state.metadata?.transcriptionService 
            : null;
        
        const systemTranscriptionService = this.systemAudioCaptureService.state.state === 'running' 
            ? this.systemAudioCaptureService.state.metadata?.transcriptionService 
            : null;

        await Promise.all([
            micTranscriptionService?.commitTranscription(),
            systemTranscriptionService?.commitTranscription(),
        ]);
        
        return this.fullContext.clone();
    }

    /**
     * Computed property to check if both mic and system are actively transcribing.
     */
    get isTranscribing(): boolean {
        const micTranscriptionService = this.micAudioCaptureService.state.state === 'running' 
            ? this.micAudioCaptureService.state.metadata?.transcriptionService 
            : null;
        
        const systemTranscriptionService = this.systemAudioCaptureService.state.state === 'running' 
            ? this.systemAudioCaptureService.state.metadata?.transcriptionService 
            : null;

        const isMicTranscribing = micTranscriptionService?.state.state === "running";
        const isSystemTranscribing = systemTranscriptionService?.state.state === "running";
        return !!(isMicTranscribing && isSystemTranscribing);
    }

    /**
     * Computed property to check if either audio capture service is running.
     * This determines if we are in an "audio session".
     */
    get isInAudioSession(): boolean {
        const isMicCapturing = this.micAudioCaptureService.state.state !== "not-running";
        const isSystemCapturing = this.systemAudioCaptureService.state.state !== "not-running";
        return isMicCapturing && isSystemCapturing;
    }
} 