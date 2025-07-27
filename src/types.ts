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

export enum FeatureFlag {
    VIM_MODE_KEY_BINDINGS = 'vim_mode_key_bindings',
    DEV_INSPECT_APP = 'dev_inspect_app',
    TRIGGER_AI_MODEL_PRIORITIES = 'trigger_ai_model_priorities',
    MAX_ATTACHMENT_COUNT = 'max_attachment_count',
    USAGE_LIMIT_VARIANT = 'usage_limit_variant',
    USE_ASSEMBLY_AI_TRANSCRIPTION = 'use_assembly_ai_transcription',
    USE_SELF_HOSTED_DEEPGRAM_TRANSCRIPTION = 'use_self_hosted_deepgram_transcription',
    DEEPGRAM_LANGUAGE = 'deepgram_language',
    NATIVE_MAC_RECORDER_V2 = 'native_mac_recorder_v2',
    ONLY_COMMAND_ENTER = 'only_command_enter',
    LIVE_INSIGHTS_ACTIONS_MODEL = 'live_insights_actions_model',
  }
  