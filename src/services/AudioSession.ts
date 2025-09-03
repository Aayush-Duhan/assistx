import { makeObservable, observable, action, reaction } from 'mobx';
import { ContextService } from './ContextService';

const SESSION_KEEPALIVE_INTERVAL_MS = 30 * 1000;
const MAX_SESSION_DURATION = 1000 * 60 * 360;

type SessionState =
    | {
        state: "creating"; abortController: AbortController; creationPromise:
        Promise<void>
    }
    | {
        state: "created";
        sessionId: string;
        instructionActionables: any[];
        createdAt: Date;
        keepaliveInterval: NodeJS.Timeout;
    }
    | { state: "error" };

interface AudioTranscription {
    createdAt: Date;
    source: 'mic' | 'system';
    text: string;
}

export class AudioSession {
    resolveCreationPromise?: () => void;
    cleanup?: () => void;
    audioTranscriptions: AudioTranscription[] = [];
    state: SessionState = {
        state: 'creating',
        abortController: new AbortController(),
        creationPromise: new Promise(resolve => { this.resolveCreationPromise = resolve; })
    };

    constructor(private readonly contextService: ContextService,
        private readonly hasAudio: boolean,
        options?: any) {
        makeObservable(this, {
            state: observable,
            setState: action,
        });
        this.createSession(options);
        if (hasAudio) {
            this.contextService.fullContext.clearAudioTranscriptions();
            const disposeTranscriptWatcher = reaction(
                () => this.contextService.fullContext.audioTranscriptions,
                (transcript) => {
                    this.keepalive({ transcript });
                },
                { fireImmediately: false }
            );
            const disposePauseWatcher = reaction(
                () => this.contextService.isInAudioSessionAndAudioIsPaused,
                (paused) => {
                    this.keepalive({ paused });
                },
                { fireImmediately: false }
            );
            this.cleanup = () => {
                disposeTranscriptWatcher();
                disposePauseWatcher();
            };
        }
    }

    dispose () {
        this.cleanup?.();   
        this.resolveCreationPromise?.();
        if (this.state.state === 'creating') {
            this.state.abortController.abort();
        }
        if (this.state.state === 'created') {
            this.endSession(this.state.sessionId);
            clearInterval(this.state.keepaliveInterval);
        }
    }

    setState(newState: SessionState) {
        this.state = newState;
    }

    private isPushingUpdate = false;

    private didSessionExceedMaxDuration(): boolean {
        if (this.state.state === "created") {
            if (Date.now() - this.state.createdAt.getTime() > MAX_SESSION_DURATION) {
                return true;
            }
        }
        return false;
    }

    private keepalive(data?: { transcript?: any[]; paused?: boolean }) {
        if (this.didSessionExceedMaxDuration()) {
            this.contextService.stopAudio();
            return;
        }
        if (this.state.state === "created") {
            if (this.isPushingUpdate) {
                console.log("Still pushing update, skipping this one");
                return;
            }
            this.isPushingUpdate = true;

            console.log("Session keepalive:", {
                sessionId: this.state.sessionId,
                paused: data?.paused,
                transcript: data?.transcript,
                timestamp: new Date().toISOString()
            });

            this.isPushingUpdate = false;
        }
    }

    private async createSession(options?: {
        additionalContext?: any;
        eventsCallbackUrl?: string;
        passthroughProperties?: any;
    }) {
        if (this.state.state !== "creating") return;
        const { abortController } = this.state;

        try {
            const sessionData = {
                sessionId: `local-session-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
                instructionActionables: []
            };

            console.log("Creating local session:", {
                sessionId: sessionData.sessionId,
                hasAudio: this.hasAudio,
                additionalContext: options?.additionalContext,
                timestamp: new Date().toISOString()
            });

            if (abortController.signal.aborted) {
                await this.endSession(sessionData.sessionId);
                return;
            }

            const keepaliveInterval = setInterval(() => {
                this.keepalive();
            }, SESSION_KEEPALIVE_INTERVAL_MS);

            this.setState({
                state: "created",
                sessionId: sessionData.sessionId,
                instructionActionables: sessionData.instructionActionables,
                createdAt: new Date(),
                keepaliveInterval,
            });
        } catch (error) {
            if (abortController.signal.aborted) return;
            console.error("Error creating session", error);
            this.setState({
                state: "error"
            });
        }
        this.resolveCreationPromise?.();
    }
    private async endSession(sessionId: string) {
        if (this.didSessionExceedMaxDuration()) return;

        try {
            console.log("Ending local session:", {
                sessionId,
                hasAudio: this.hasAudio,
                transcript: this.hasAudio ?
                    this.contextService.fullContext.audioTranscriptions : undefined,
                timestamp: new Date().toISOString()
            });

            if (this.hasAudio) {
                this.audioTranscriptions = this.contextService.fullContext.audioTranscriptions.map(t => ({
                    createdAt: t.createdAt || new Date(),
                    source: t.role || 'mic',
                    text: t.text
                }));
            }
        } catch (error) {
            console.error("Error ending session", error);
        }
    }
}