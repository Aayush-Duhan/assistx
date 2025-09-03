import { makeObservable, observable, computed, action, autorun, reaction } from 'mobx';
import { AudioCaptureService } from './AudioCaptureService';
import { AudioDataSource } from '../types';
import { uuidv7 } from 'uuidv7';
import { AudioSession } from './AudioSession';

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

export class TranscriptionEntry {
    constructor(
        public readonly role: AudioDataSource,
        public readonly text: string,
        public readonly createdAt: Date,
        public readonly isEndOfParagraph: boolean = false
    ) {
        makeObservable(this);
    }
    get roledTranscript(): string {
        return `[${this.role === "mic" ? "Me" : "Them"}]\\nTranscription:${this.text}]`;
    }
}

export class FullContext {
    audioTranscriptions: TranscriptionEntry[] = [];
    constructor(initialTranscriptions: TranscriptionEntry[] = []) {
        this.audioTranscriptions = initialTranscriptions;
        makeObservable(this, {
            audioTranscriptions: observable,
            clearAudioTranscriptions: action,
            paragraphTranscripts: computed,
            audioContextAsText: computed,
        });
    }
    addAudioTranscription(e: TranscriptionEntry) {
        this.audioTranscriptions.push(e);
    }
    clearAudioTranscriptions() {
        this.audioTranscriptions.length = 0;
    }
    get paragraphTranscripts() {
        const paragraphs: TranscriptionEntry[] = [];
        let currentMicText = "";
        let currentSystemText = "";
        for (const { role, text, createdAt, isEndOfParagraph } of
            this.audioTranscriptions) {
            switch (role) {
                case "mic":
                    currentMicText = `${currentMicText} ${text}`.trim();
                    if (currentMicText.length > 100 || (isEndOfParagraph &&
                        currentMicText.length > 0)) {
                        paragraphs.push(new TranscriptionEntry("mic", currentMicText.trim(),
                            createdAt));
                        currentMicText = "";
                    }
                    break;
                case "system":
                    currentSystemText = `${currentSystemText} ${text}`.trim();
                    if (currentSystemText.length > 100 || (isEndOfParagraph &&
                        currentSystemText.length > 0)) {
                        paragraphs.push(new TranscriptionEntry("system",
                            currentSystemText.trim(), createdAt));
                        currentSystemText = "";
                    }
                    break;
            }
        }
        return {
            transcripts: paragraphs,
            remainingMicText: currentMicText.trim(),
            remainingSystemText: currentSystemText.trim(),
        };
    }
    get audioContextAsText(): string {
        if (!this.audioTranscriptions.length) return "";
        const { transcripts, remainingMicText, remainingSystemText } =
            this.paragraphTranscripts;
        let context = transcripts.length > 0 ? `${transcripts.map((t) =>
            t.roledTranscript).join("\\n\\n")}\\n\\n` : "";
        if (remainingMicText) {
            context += `[Me]\\nTranscription: ${remainingMicText}\\n\\n`;
        }
        if (remainingSystemText) {
            context += `[Them]\\nTranscription: ${remainingSystemText}\\n\\n`;
        }
        return `Audio:\\n\\n${context}`;
    }
}

export class LiveInsights {
    summary = LiveInsights.createInitialSummary();
    actions: any[] = [];
    fakeActions: any[] = [];
    constructor() {
        makeObservable(this, {
            summary: observable,
            actions: observable,
            fakeActions: observable,
            updateSummary: action,
            addAction: action,
            addFakeAction: action,
            clearSummaryAndActions: action,
        });
    }
    updateSummary(newSummary: any) {
        if (new Date(newSummary.inputTimestamp) > new Date(this.summary.inputTimestamp)) {
            this.summary = newSummary;
        }
    }
    addAction(newAction: any, maxActions: number) {
        if (this.actions.some((a) => a.text === newAction.text)) return;
        const sortByTimestamp = (a: any, b: any) => new Date(a.inputTimestamp).getTime() -
            new Date(b.inputTimestamp).getTime();
        const newActions = [...this.actions, newAction].sort(sortByTimestamp);
        this.actions = newActions.slice(-maxActions);
    }
    addFakeAction(action: any) {
        this.fakeActions.push({ ...action, id: uuidv7() });
    }
    clearSummaryAndActions() {
        this.summary = LiveInsights.createInitialSummary();
        this.actions = [];
        this.fakeActions = [];
    }
    static createInitialSummary() {
        return {
            inputTimestamp: new Date().toISOString(),
            inputTranscriptEntryCount: 0,
            processedTranscriptEntryCount: 0,
            lines: [
                { type: "heading", text: "Start of Summary" },
                { type: "bullet", indent: 0, text: "Started recording…" },
            ],
        };
    }
}

export class ContextService {
    micAudioCaptureService: AudioCaptureService;
    systemAudioCaptureService: AudioCaptureService;
    cleanUp: () => void;
    newAudioSessionOptions: any | null = null;
    fullContext = new FullContext();
    liveInsights = new LiveInsights();
    audioSession: AudioSession | null = null;
    constructor(services: {
        micAudioCaptureService: AudioCaptureService;
        systemAudioCaptureService: AudioCaptureService;
    }) {
        this.micAudioCaptureService = services.micAudioCaptureService;
        this.systemAudioCaptureService = services.systemAudioCaptureService;
        makeObservable(this, {
            newAudioSessionOptions: observable,
            audioSession: observable,
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
                    this.audioSession?.dispose();
                    action(() => {
                        this.audioSession = new AudioSession(
                            this,
                            true,
                            this.newAudioSessionOptions ?? undefined
                        );
                    })();
                } else {
                    this.audioSession?.dispose();
                    action(() => {
                        this.newAudioSessionOptions = null;
                        this.audioSession = null;
                    })();
                }
            },
            { fireImmediately: true }
        );
        const { refresh: refreshMic, dispose: disposeMic } = createIdleTimer(() => {
            this.fullContext.addAudioTranscription(new TranscriptionEntry("mic", "",
                new Date(), true));
        }, 2500);
        const disposeMicBufferWatcher = autorun(() => {
            if (this.micAudioCaptureService.transcriptionService?.buffer) {
                refreshMic();
            }
        });
        const { refresh: refreshSystem, dispose: disposeSystem } = createIdleTimer(() => {
            this.fullContext.addAudioTranscription(new TranscriptionEntry("system",
                "", new Date(), true));
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
                        entry.source,
                        entry.text,
                        entry.createdAt,
                        false
                    );
                    this.fullContext.audioTranscriptions.push(transcriptionEntry);
                });
            },
            { fireImmediately: true }
        );
        const disposeSystemTranscriptionWatcher = reaction(
            () => this.systemAudioCaptureService.transcriptionService,
            (service) => {
                service?.onTranscription((entry) => {
                    const transcriptionEntry = new TranscriptionEntry(
                        entry.source,
                        entry.text,
                        entry.createdAt,
                        false
                    );
                    this.fullContext.audioTranscriptions.push(transcriptionEntry);
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
        this.audioSession?.dispose();
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