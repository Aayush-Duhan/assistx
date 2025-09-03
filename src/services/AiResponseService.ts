import { makeObservable, observable, computed, action } from 'mobx';
import { AiConversation } from '../components/ai/AiConversation';
import { captureScreenshot } from './ScreenshotService';
import { ContextService } from './ContextService';

interface TriggerAiState {
    abortController: AbortController;
    step: 'capturing-screenshot' | 'committing-transcriptions';
}

type TriggerAiOptions = {
    shouldCaptureScreenshot: boolean;
    manualInput?: string | null;
    displayInput?: string | null;
    useWebSearch?: boolean;
    metadata?: Record<string, any>;
};

export class AiResponsesService {
    triggerAiState: TriggerAiState | null = null;
    currentConversation: AiConversation | null = null;
    isManualInputActive = false;
    isAudioSessionWindowOpen = false;
    useWebSearch = false;
    constructor(private readonly contextService: ContextService) {
        makeObservable(this, {
            triggerAiState: observable,
            currentConversation: observable,
            isManualInputActive: observable,
            isAudioSessionWindowOpen: observable,
            useWebSearch: observable,
            isCapturingScreenshot: computed,
            isCommittingTranscriptions: computed,
            showMainAppAiContent: computed,
            clearCurrentConversation: action,
            setIsManualInputActive: action,
            setIsAudioSessionWindowOpen: action,
            setUseWebSearch: action,
            setTriggerAiState: action,
            createNewResponse: action,
        });
    }

    dispose(): void {
        this.triggerAiState?.abortController.abort();
        this.currentConversation?.dispose();
    }

    get isCapturingScreenshot(): boolean {
        return this.triggerAiState?.step === 'capturing-screenshot';
    }

    get isCommittingTranscriptions(): boolean {
        return this.triggerAiState?.step === 'committing-transcriptions';
    }

    get showMainAppAiContent(): boolean {
        return (
            this.isCapturingScreenshot ||
            this.isCommittingTranscriptions ||
            this.isManualInputActive ||
            !!this.currentConversation
        );
    }

    clearCurrentConversation = (): void => {
        this.setTriggerAiState(null);
        this.currentConversation?.dispose();
        this.currentConversation = null;
    };

    setIsManualInputActive = (isActive: boolean): void => {
        this.isManualInputActive = isActive;
    };

    setIsAudioSessionWindowOpen(isOpen: boolean) {
        this.isAudioSessionWindowOpen = isOpen;
    }

    setUseWebSearch(useWebSearch: boolean) {
        this.useWebSearch = useWebSearch;
    }

    public async triggerAi({
        shouldCaptureScreenshot,
        manualInput,
        displayInput,
        useWebSearch,
        metadata,
    }: TriggerAiOptions) {
        const abortController = new AbortController();
        try {
            this.setTriggerAiState({ abortController, step: 'capturing-screenshot' });

            const getScreenshot = shouldCaptureScreenshot ? captureScreenshot : async () => null;

            const [screenshot] = await Promise.all([
                getScreenshot().then(result => {
                    if (!abortController.signal.aborted) {
                        this.setTriggerAiState({ abortController, step: 'committing-transcriptions' });
                    }
                    return result;
                }),
                this.contextService.commitTranscriptions(),
            ]);

            if (abortController.signal.aborted) return;

            this.createNewResponse({
                fullContext: this.contextService.fullContext,
                screenshot,
                manualInput: manualInput ?? null,
                displayInput: displayInput ?? null,
                useWebSearch,
                metadata,
            });

        } catch (error) {
            console.error('"Error triggering AI response:', error);
        } finally {
            if (!abortController.signal.aborted) {
                this.setTriggerAiState(null);
            }
        }
    };

    setTriggerAiState(newState: TriggerAiState | null) {
        if (this.triggerAiState && this.triggerAiState.abortController !== newState?.abortController) {
            this.triggerAiState.abortController.abort();
        }
        this.triggerAiState = newState;
    };

    createNewResponse(options: {
        fullContext: any;
        screenshot: any | null;
        manualInput: string | null;
        displayInput: string | null;
        useWebSearch?: boolean;
        metadata?: Record<string, any>;
    }) {
        if (this.currentConversation) {
            this.currentConversation.createNewResponse(options);
        } else {
            this.currentConversation = new AiConversation(this.contextService, options);
        }
        this.isManualInputActive = false;
    }

} 