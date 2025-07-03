import { makeObservable, observable, computed, action } from 'mobx';
import { AiConversation } from '../components/ai/AiConversation';
import { captureScreenshot, ScreenshotData } from './ScreenshotService';

// Type definitions
interface TriggerAiState {
    abortController: AbortController;
    step: 'capturing-screenshot' | 'committing-transcriptions';
}

interface FullContext {
    audioTranscriptions: Array<{
        createdAt: Date;
        source: 'mic' | 'system';
        text: string;
    }>;
    audioContextAsText: string;
}

interface ContextService {
    commitTranscriptionsAndGetFullContext(): Promise<FullContext>;
}

/**
 * AiResponsesService is the main controller for triggering and managing AI conversations.
 * It handles the multi-step process of gathering context (screenshot, audio)
 * and then creating or updating an `AiConversation`.
 */
export class AiResponsesService {
    triggerAiState: TriggerAiState | null = null;
    currentConversation: AiConversation | null = null;
    isManualInputActive: boolean = false;

    // --- Injected Dependencies ---
    contextService: ContextService;

    constructor(contextService: ContextService) {
        this.contextService = contextService;

        // Make this class's properties observable with MobX for reactive UI updates.
        makeObservable(this, {
            triggerAiState: observable,
            currentConversation: observable,
            isManualInputActive: observable,
            isCapturingScreenshot: computed,
            isCommittingTranscriptions: computed,
            showMainAppAiContent: computed,
            clearCurrentConversation: action,
            setIsManualInputActive: action,
            setTriggerAiState: action,
            createNewResponse: action,
        });
    }

    /**
     * Cleans up any ongoing processes when the service is no longer needed.
     */
    dispose(): void {
        this.triggerAiState?.abortController.abort();
        this.currentConversation?.dispose();
    }

    // --- Computed Properties for UI State ---

    /**
     * @returns True if the app is currently capturing a screenshot.
     */
    get isCapturingScreenshot(): boolean {
        return this.triggerAiState?.step === 'capturing-screenshot';
    }

    /**
     * @returns True if the app is finalizing audio transcriptions.
     */
    get isCommittingTranscriptions(): boolean {
        return this.triggerAiState?.step === 'committing-transcriptions';
    }

    /**
     * Determines if any AI-related UI should be visible.
     */
    get showMainAppAiContent(): boolean {
        return (
            this.isCapturingScreenshot ||
            this.isCommittingTranscriptions ||
            this.isManualInputActive ||
            !!this.currentConversation
        );
    }

    // --- Actions to Modify State ---

    /**
     * Resets the entire conversation, clearing all history and UI.
     */
    clearCurrentConversation = (): void => {
        this.setTriggerAiState(null);
        this.currentConversation?.dispose();
        this.currentConversation = null;
        this.isManualInputActive = false;
    };

    /**
     * Toggles the visibility of the manual text input field.
     */
    setIsManualInputActive = (isActive: boolean): void => {
        this.isManualInputActive = isActive;
    };

    /**
     * The main entry point to trigger an AI response. This function orchestrates
     * the context-gathering and response-creation process.
     *
     * @param shouldTakeScreenshot - Whether to capture the screen as part of the context.
     * @param manualInput - Any explicit text input from the user.
     */
    triggerAi = async (shouldTakeScreenshot: boolean, manualInput: string | null): Promise<void> => {
        const abortController = new AbortController();
        try {
            // Step 1: Set the UI state to "capturing screenshot" to show a loading indicator.
            this.setTriggerAiState({ abortController, step: 'capturing-screenshot' });

            const getScreenshotPromise = shouldTakeScreenshot ? captureScreenshot : async (): Promise<ScreenshotData | null> => null;

            // Step 2: Concurrently capture the screenshot and commit the latest audio transcriptions.
            // This is the most time-consuming part, so we do it in parallel.
            const [screenshot, fullContext] = await Promise.all([
                getScreenshotPromise().then(result => {
                    // Once the screenshot is done, update the UI state to "committing transcriptions".
                    if (!abortController.signal.aborted) {
                        this.setTriggerAiState({ abortController, step: 'committing-transcriptions' });
                    }
                    return result;
                }),
                this.contextService.commitTranscriptionsAndGetFullContext(),
            ]);

            if (abortController.signal.aborted) return;

            // Step 3: With all context gathered, create a new response.
            this.createNewResponse(fullContext, screenshot, manualInput ?? null);

        } catch (error) {
            console.error('Error in triggerAi:', error);
        } finally {
            // Step 4: Clean up the trigger state once the process is finished or aborted.
            if (!abortController.signal.aborted) {
                this.setTriggerAiState(null);
            }
        }
    };

    /**
     * Internal action to update the trigger state and handle aborting previous triggers.
     */
    setTriggerAiState = (newState: TriggerAiState | null): void => {
        // If there's an existing trigger process, abort it before starting a new one.
        if (this.triggerAiState && this.triggerAiState.abortController !== newState?.abortController) {
            this.triggerAiState.abortController.abort();
        }
        this.triggerAiState = newState;
    };

    /**
     * Creates a new response within the current conversation or starts a new conversation.
     * @param fullContext - The complete context from the ContextService.
     * @param screenshot - The captured screenshot data, if any.
     * @param manualInput - The user's text input, if any.
     */
    createNewResponse = (fullContext: FullContext, screenshot: ScreenshotData | null, manualInput: string | null): void => {
        if (this.currentConversation) {
            // If a conversation is already active, add a new request/response turn to it.
            this.currentConversation.createNewResponse(fullContext, screenshot, manualInput);
        } else {
            // Otherwise, start a new conversation.
            this.currentConversation = new AiConversation(
                this.contextService,
                fullContext,
                screenshot,
                manualInput
            );
        }
        // Hide the manual input field after submission.
        this.isManualInputActive = false;
    };
} 