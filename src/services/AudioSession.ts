import { makeObservable, observable, action } from 'mobx';

// Type definitions
interface AudioTranscription {
    createdAt: Date;
    source: 'mic' | 'system';
    text: string;
}

interface TranscriptEntry {
    createdAt: Date;
    role: string;
    text: string;
}

interface AudioSessionState {
    state: 'creating' | 'created' | 'error';
    abortController?: AbortController;
    creationPromise?: Promise<void>;
    sessionId?: string;
    keepaliveInterval?: NodeJS.Timeout;
}

const SESSION_KEEPALIVE_INTERVAL_MS = 30 * 1000; // 30 seconds

/**
 * Manages the lifecycle of a single AI backend session.
 * It creates the session, keeps it alive, and ends it.
 * 
 * Note: For open source version, this is simplified to work without proprietary API clients.
 */
export class AudioSession {
    hasAudio: boolean;
    resolveCreationPromise?: () => void;
    audioTranscriptions: AudioTranscription[] = []; // Used to store final transcriptions before ending the session.
    state: AudioSessionState = {
        state: 'creating',
        abortController: new AbortController(),
        creationPromise: new Promise(resolve => { this.resolveCreationPromise = resolve; })
    };

    constructor(hasAudio: boolean) {
        this.hasAudio = hasAudio;
        makeObservable(this, {
            state: observable,
            disposeWithAudioTranscriptions: action,
            setState: action,
        });
        this.createSession();
    }

    /**
     * Disposes of the session. If audio transcriptions are provided, they are sent
     * to the backend before the session is terminated.
     */
    dispose = (): void => {
        this.resolveCreationPromise?.();
        if (this.state.state === 'creating' && this.state.abortController) {
            this.state.abortController.abort();
        }
        if (this.state.state === 'created' && this.state.sessionId) {
            this.endSession(this.state.sessionId);
            if (this.state.keepaliveInterval) {
                clearInterval(this.state.keepaliveInterval);
            }
        }
    }
    
    disposeWithAudioTranscriptions = (transcriptions: AudioTranscription[]): void => {
        this.audioTranscriptions = transcriptions;
        this.dispose();
    }

    setState = (newState: AudioSessionState): void => {
        this.state = newState;
    }

    async createSession(): Promise<void> {
        if (this.state.state !== 'creating') return;
        const abortController = this.state.abortController;
        if (!abortController) return;

        try {
            // For open source version, we'll create a mock session
            // In a real implementation, this would integrate with your chosen AI provider
            const sessionId = `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
            
            if (abortController.signal.aborted) {
                await this.endSession(sessionId);
                return;
            }

            // Mock keepalive interval - in real implementation this would ping your AI service
            const keepaliveInterval = setInterval(() => {
                // For open source version, this is a no-op
                // In real implementation: send keepalive to your AI service
                console.debug('Session keepalive:', sessionId, this.hasAudio ? this.getTranscript() : 'no audio');
            }, SESSION_KEEPALIVE_INTERVAL_MS);

            this.setState({
                state: 'created',
                sessionId: sessionId,
                keepaliveInterval: keepaliveInterval
            });
        } catch (error) {
            if (abortController.signal.aborted) return;
            console.error("Error creating session", error);
            this.setState({ state: 'error' });
        }
        this.resolveCreationPromise?.();
    }

    async endSession(sessionId: string): Promise<void> {
        try {
            // For open source version, this is a no-op
            // In real implementation: properly close session with your AI service
            if (this.hasAudio) {
                console.debug('Ending audio session:', sessionId, this.getTranscript());
            } else {
                console.debug('Ending non-audio session:', sessionId);
            }
        } catch (error) {
            console.error("Error ending session", error);
        }
    }

    getTranscript(): TranscriptEntry[] {
        return this.audioTranscriptions.map(t => ({
            createdAt: t.createdAt,
            role: t.source === 'mic' ? 'Me' : 'Them',
            text: t.text
        }));
    }
} 