import { makeObservable, observable, computed, action, autorun, reaction } from 'mobx';
import { AudioCaptureService } from './AudioCaptureService';
import { AudioDataSource } from '../types';

function createIdleTimer(callback: () => void, delay: number) {
    let timeoutId: NodeJS.Timeout;
    return {
        refresh: () => {
            clearTimeout(timeoutId);
            timeoutId = setTimeout(callback, delay);
        },
        dispose: () => {
            clearTimeout(timeoutId);
        },
    };
}

export type SerializedTranscriptEntry = { createdAt: Date; role: "mic" | "system"; text: string };

class EndOfParagraphMarker {
    constructor(
        readonly role: "mic" | "system",
        readonly createdAt: Date,
    ) { }
}

export class TranscriptionEntry {
    constructor(
        public readonly text: string,
        public readonly role: AudioDataSource,
        public readonly createdAt: Date,
    ) {
        makeObservable(this);
    }
    get roledTranscript() {
        const roleLabel = this.role === "mic" ? "Me" : "Them";
        return `[${roleLabel}]\nTranscription: ${this.text}`;
    }

    get serialized(): SerializedTranscriptEntry {
        return {
            createdAt: this.createdAt,
            role: this.role,
            text: this.text,
        };
    }
}

export class FullContext {
    constructor(
        private readonly audioTranscriptionsWithParagraphBreaks: (
            | TranscriptionEntry
            | EndOfParagraphMarker
        )[] = [],
    ) {
        makeObservable(this, {
            audioTranscriptions: computed.struct
        });
    }
    addAudioTranscription(transcription: TranscriptionEntry) {
        this.audioTranscriptionsWithParagraphBreaks.push(transcription);
    }
    clearAudioTranscriptions() {
        this.audioTranscriptionsWithParagraphBreaks.length = 0;
    }

    get audioTranscriptions() {
        return this.audioTranscriptionsWithParagraphBreaks.filter(
            (t) => t instanceof TranscriptionEntry,
        );
    }

    markEndOfParagraph(role: "mic" | "system") {
        this.audioTranscriptionsWithParagraphBreaks.push(new EndOfParagraphMarker(role, new Date()));
    }

    get paragraphTranscripts() {
        const transcripts: TranscriptionEntry[] = [];
        let micTextBuffer = "";
        let systemTextBuffer = "";
        for (const entry of this.audioTranscriptionsWithParagraphBreaks) {
            switch (entry.role) {
                case "mic":
                    if (entry instanceof TranscriptionEntry) {
                        micTextBuffer = `${micTextBuffer} ${entry.text}`.trim();
                    }
                    if (
                        micTextBuffer.length > 100 || // either we hit the paragraph length limit
                        (entry instanceof EndOfParagraphMarker && micTextBuffer.length > 0) // or we hit the end of paragraph sequence and have some text
                    ) {
                        transcripts.push(new TranscriptionEntry(micTextBuffer, "mic", entry.createdAt));
                        micTextBuffer = "";
                    }
                    break;
                case "system":
                    if (entry instanceof TranscriptionEntry) {
                        systemTextBuffer = `${systemTextBuffer} ${entry.text}`.trim();
                    }
                    if (
                        systemTextBuffer.length > 100 || // either we hit the paragraph length limit
                        (entry instanceof EndOfParagraphMarker && systemTextBuffer.length > 0) // or we hit the end of paragraph sequence and have some text
                    ) {
                        transcripts.push(new TranscriptionEntry(systemTextBuffer, "system", entry.createdAt));
                        systemTextBuffer = "";
                    }
                    break;
            }
        }
        return {
            transcripts,
            remainingMicText: micTextBuffer,
            remainingSystemText: systemTextBuffer,
        };
    }

    get audioContextAsText() {
        if (!this.audioTranscriptions.length) {
            return "";
        }
        return `Audio:\n\n${this.audioTranscriptions.map((t) => t.roledTranscript).join("\n")}`;
    }

    getNewAudioContextAsText(skipAudioContextBefore: Date | null) {
        const newTranscriptions = skipAudioContextBefore
            ? this.audioTranscriptions.filter((t) => t.createdAt > skipAudioContextBefore)
            : this.audioTranscriptions;
        return {
            newAudioContextAsText: new FullContext(newTranscriptions).audioContextAsText,
            includesAudioContextBefore: new Date(),
        };
    }
}

export class ContextService {
    micAudioCaptureService: AudioCaptureService;
    systemAudioCaptureService: AudioCaptureService;
    cleanUp: () => void;
    fullContext = new FullContext();
    /** Timestamp when audio session started, used for duration display */
    sessionStartedAt: Date | null = null;
    constructor(services: {
        micAudioCaptureService: AudioCaptureService;
        systemAudioCaptureService: AudioCaptureService;
    }) {
        this.micAudioCaptureService = services.micAudioCaptureService;
        this.systemAudioCaptureService = services.systemAudioCaptureService;
        makeObservable(this, {
            sessionStartedAt: observable,
            isTranscribing: computed,
            isInAudioSessionAndAudioIsPaused: computed,
            isInAudioSessionAndNotPaused: computed,
            isInAudioSession: computed,
            stopAudio: action,
            pauseAudio: action,
            restartAudio: action,
            resumeAudio: action,
        });
        const disposeIsInAudioSession = reaction(
            () => this.isInAudioSession,
            (inSession) => {
                if (inSession) {
                    action(() => {
                        this.sessionStartedAt = new Date();
                        this.fullContext.clearAudioTranscriptions();
                    })();
                } else {
                    action(() => {
                        this.sessionStartedAt = null;
                    })();
                }
            },
            { fireImmediately: true }
        );
        const { refresh: refreshMic, dispose: disposeMic } = createIdleTimer(() => {
            this.fullContext.markEndOfParagraph("mic");
        }, 2500);
        const disposeMicBufferWatcher = autorun(() => {
            if (this.micAudioCaptureService.transcriptionService?.buffer) {
                refreshMic();
            }
        });
        const { refresh: refreshSystem, dispose: disposeSystem } = createIdleTimer(() => {
            this.fullContext.markEndOfParagraph("system");
        }, 2500);
        const disposeSystemBufferWatcher = autorun(() => {
            if (this.systemAudioCaptureService.transcriptionService?.buffer) {
                refreshSystem();
            }
        });
        const disposeMicTranscriptionWatcher = reaction(
            () => this.micAudioCaptureService.transcriptionService,
            (service) => {
                service?.onTranscription((entry) => {
                    const transcriptionEntry = new TranscriptionEntry(
                        entry.text,
                        entry.source,
                        entry.createdAt,
                    );
                    this.fullContext.addAudioTranscription(transcriptionEntry);
                });
            },
            { fireImmediately: true }
        );
        const disposeSystemTranscriptionWatcher = reaction(
            () => this.systemAudioCaptureService.transcriptionService,
            (service) => {
                service?.onTranscription((entry) => {
                    const transcriptionEntry = new TranscriptionEntry(
                        entry.text,
                        entry.source,
                        entry.createdAt,
                    );
                    this.fullContext.addAudioTranscription(transcriptionEntry);
                });
            },
            { fireImmediately: true }
        );
        this.cleanUp = () => {
            disposeIsInAudioSession();
            disposeMicTranscriptionWatcher();
            disposeSystemTranscriptionWatcher();
            disposeMic();
            disposeMicBufferWatcher();
            disposeSystem();
            disposeSystemBufferWatcher();
        };
    }
    dispose() {
        this.cleanUp();
    }
    async commitTranscriptions() {
        await Promise.all([
            this.micAudioCaptureService.transcriptionService?.commitTranscription(),
            this.systemAudioCaptureService.transcriptionService?.commitTranscription(),
        ]);
    }
    get isTranscribing() {
        return this.getServices().every((service) => service.transcriptionService?.state.state === "running");
    }
    stopAudio = () => this.getServices().map((service) => service.stop());
    pauseAudio = () => this.getServices().map((service) => service.pause());
    restartAudio = () => this.getServices().map((service) => service.restart());
    resumeAudio = () => this.getServices().map((service) => service.resume());
    retryAudioSession = () => this.restartAudio();
    private getServices() {
        return [this.micAudioCaptureService, this.systemAudioCaptureService];
    }
    get isInAudioSessionAndAudioIsPaused() {
        return this.getServices().every((service) => service.state.state === "running" &&
            service.state.paused);
    }
    get isInAudioSessionAndNotPaused() {
        return this.isInAudioSession && !this.isInAudioSessionAndAudioIsPaused;
    }
    get isInAudioSession() {
        return this.getServices().every((service) => service.state.state !== "not-running");
    }
}