import { makeObservable, observable, computed, reaction, runInAction, autorun } from 'mobx';
import { AudioCaptureService } from './AudioCaptureService';
import { AudioSession } from './AudioSession';
import { AudioSource, AudioTranscription, Transcription } from './types';

// --- Constants ---
const MAX_TRANSCRIPTIONS_IN_CONTEXT = 1000;

// Type definitions
interface ContextServiceDependencies {
    micAudioCaptureService: AudioCaptureService;
    systemAudioCaptureService: AudioCaptureService;
}

/**
 * Full context including screenshots and transcriptions for AI processing
 */
export class FullContext {
    screenshots: string[] = [];
    audioTranscriptions: AudioTranscription[] = [];

    constructor({ screenshots = [], audioTranscriptions = [] }: {
        screenshots?: string[];
        audioTranscriptions?: AudioTranscription[];
    } = {}) {
        this.screenshots = screenshots;
        this.audioTranscriptions = audioTranscriptions;
        
        makeObservable(this, {
            audioTranscriptions: observable,
            screenshots: observable,
        });
    }

    /**
     * Adds a new audio transcription to the context.
     */
    addAudioTranscription(transcription: AudioTranscription): void {
        // Add the new transcription
        this.audioTranscriptions.push(transcription);

        // Keep only the most recent transcriptions to prevent memory bloat
        if (this.audioTranscriptions.length > MAX_TRANSCRIPTIONS_IN_CONTEXT) {
            this.audioTranscriptions.splice(0, this.audioTranscriptions.length - MAX_TRANSCRIPTIONS_IN_CONTEXT);
        }
    }

    /**
     * Creates a deep clone of this context for use in AI requests.
     */
    clone(): FullContext {
        const cloned = new FullContext();
        cloned.screenshots = [...this.screenshots];
        cloned.audioTranscriptions = [...this.audioTranscriptions];
        return cloned;
    }

    /**
     * Clears all audio transcriptions from the context.
     */
    clearTranscriptions(): void {
        this.audioTranscriptions.splice(0, this.audioTranscriptions.length);
    }

    /**
     * Returns the difference between this context and a previous one.
     * For now, we return the full context as we don't implement diffing logic.
     */
    diff(prevContext: FullContext): FullContext {
        // Simple implementation: return new transcriptions since the previous context
        const newTranscriptions = this.audioTranscriptions.slice(prevContext.audioTranscriptions.length);
        return new FullContext({
            screenshots: this.screenshots,
            audioTranscriptions: newTranscriptions
        });
    }

    /**
     * Converts the entire context to a text representation for the AI.
     */
    asText(): string {
        const sections: string[] = [];

        // Add transcriptions as a conversation log
        if (this.audioTranscriptions.length > 0) {
            sections.push("=== Conversation Log ===");
            const conversationText = this.audioTranscriptions
                .map(t => t.contextAsText)
                .join('\n\n');
            sections.push(conversationText);
        }

        return sections.join('\n\n');
    }

    /**
     * Get text representation of audio context for compatibility
     */
    get audioContextAsText(): string {
        return this.asText();
    }
}

/**
 * Manages the global context that is sent to the AI for generating responses.
 * This includes audio transcriptions and other contextual information.
 */
export class ContextService {
    fullContext = new FullContext();
    cleanUp: () => void = () => {};
    micAudioCaptureService: AudioCaptureService;
    systemAudioCaptureService: AudioCaptureService;
    
    // Track subscription cleanup functions
    private micTranscriptionCleanup: (() => void) | null = null;
    private systemTranscriptionCleanup: (() => void) | null = null;

    constructor(services: ContextServiceDependencies) {
        this.micAudioCaptureService = services.micAudioCaptureService;
        this.systemAudioCaptureService = services.systemAudioCaptureService;

        makeObservable(this, {
            fullContext: observable,
            isTranscribing: computed,
        });

        // Reaction 1: Listen for changes in audio session states to trigger context updates.
        const disposeAudioSessionReaction = reaction(
            () => this.isInAudioSession,
            (isInSession, wasInSession) => {
                if (wasInSession && !isInSession) {
                    // Audio session ended - save context to session
                    console.log('Audio session ended, saving context...');
                }
            }
        );

        // Reaction 2: Listen for new transcriptions from the microphone.
        const disposeMicTranscriptionListener = autorun(() => {
            const transcriptionService = this.micAudioCaptureService.state.state === 'running'
                ? this.micAudioCaptureService.state.metadata?.transcriptionService
                : null;

            // Clean up previous subscription
            if (this.micTranscriptionCleanup) {
                this.micTranscriptionCleanup();
                this.micTranscriptionCleanup = null;
            }

            // Subscribe to new transcription service if available
            if (transcriptionService) {
                console.log('ContextService: Subscribing to mic transcriptions');
                this.micTranscriptionCleanup = transcriptionService.onTranscription((transcription: AudioTranscription) => {
                    console.log('ContextService: Received mic transcription:', transcription.text);
                    this.fullContext.addAudioTranscription(transcription);
                });
            }
        });

        // Reaction 3: Listen for new transcriptions from the system audio.
        const disposeSystemTranscriptionListener = autorun(() => {
            const transcriptionService = this.systemAudioCaptureService.state.state === 'running'
                ? this.systemAudioCaptureService.state.metadata?.transcriptionService
                : null;

            // Clean up previous subscription
            if (this.systemTranscriptionCleanup) {
                this.systemTranscriptionCleanup();
                this.systemTranscriptionCleanup = null;
            }

            // Subscribe to new transcription service if available
            if (transcriptionService) {
                console.log('ContextService: Subscribing to system transcriptions');
                this.systemTranscriptionCleanup = transcriptionService.onTranscription((transcription: AudioTranscription) => {
                    console.log('ContextService: Received system transcription:', transcription.text);
                    this.fullContext.addAudioTranscription(transcription);
                });
            }
        });

        // Cleanup function to dispose of all reactions when the service is destroyed.
        this.cleanUp = () => {
            disposeAudioSessionReaction();
            disposeMicTranscriptionListener();
            disposeSystemTranscriptionListener();
            
            // Clean up transcription subscriptions
            if (this.micTranscriptionCleanup) {
                this.micTranscriptionCleanup();
                this.micTranscriptionCleanup = null;
            }
            if (this.systemTranscriptionCleanup) {
                this.systemTranscriptionCleanup();
                this.systemTranscriptionCleanup = null;
            }
        };
    }

    /**
     * Disposes of the context service and cleans up all subscriptions.
     */
    dispose(): void {
        this.cleanUp();
    }

    /**
     * Clears all transcriptions from the context.
     * This resets the context to a fresh state.
     */
    clearTranscriptions(): void {
        this.fullContext.clearTranscriptions();
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