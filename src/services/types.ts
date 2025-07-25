export interface Display {
    id: number;
    label: string;
    bounds: { x: number; y: number; width: number; height: number };
    scaleFactor: number;
    primary: boolean;
    current: boolean; // Custom flag to indicate if it's the window's current display
}
export type AudioSource = 'mic' | 'system';

export interface AudioTranscription {
    createdAt: Date;
    source: AudioSource;
    text: string;
    contextAsText: string;
}

export interface AudioData {
    pcm16Base64: string;
}

export interface BufferState {
    partialText: string | null;
}

// Common interface for transcription services
export interface ITranscriptionService {
    state: any; // State type varies between implementations
    source: AudioSource;
    
    // Methods
    dispose(): void;
    commitTranscription(): Promise<void>;
    onTranscription(callback: (transcription: AudioTranscription) => void): () => void;
    
    // Properties
    readonly buffer: BufferState | null;
}

/**
 * A transcription class that implements the AudioTranscription interface
 * Used by Deepgram transcription service for real-time audio transcription
 */
export class Transcription implements AudioTranscription {
    createdAt = new Date();
    source: AudioSource;
    text: string;

    constructor({ source, text }: { source: AudioSource; text: string }) {
        this.source = source;
        this.text = text;
    }

    get contextAsText(): string {
        const speaker = this.source === 'mic' ? 'Me' : 'Them';
        return `[${speaker}]\nTranscription: ${this.text}`;
    }
}

// --- Live Insights Types ---

export interface SummaryLine {
    type: 'heading' | 'bullet';
    text: string;
    indent?: number;
}

export interface LiveInsightsSummary {
    lines: SummaryLine[];
}

export interface LiveInsightsAction {
    id: string;
    text: string;
    useWebSearch?: boolean;
}

export interface LiveInsights {
    summary: LiveInsightsSummary;
    actions: LiveInsightsAction[];
    lastUpdated: Date;
} 