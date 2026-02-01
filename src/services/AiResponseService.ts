import { makeObservable, observable, computed, action, runInAction } from "mobx";
import { captureScreenshotWithRetry } from "./ScreenshotService";
import { ContextService } from "./ContextService";
import { aiApiService } from "./AiApiService";
import { uuidv7 } from "uuidv7";

// Types adopted from hud.tsx pattern
export type ConversationResponse = {
  id: string;
  text: string;
  input: {
    messages: any[];
    displayInput: string | null;
    assistedWith: string | null;
  };
  response: any[];
};

export type PendingResponse =
  | {
      state: "streaming";
      id: string;
      text: string;
      hasScreenshot: boolean;
      screenshot: string | null;
      reasoningSteps: { text: string }[];
      displayInput: string | null;
      assistedWith: string | null;
    }
  | {
      state: "error";
      reason: "network" | "unknown";
      userFacingMessage?: string;
      displayInput: string | null;
    };

export type AiConversation = {
  responses: ConversationResponse[];
  pendingResponse: PendingResponse | null;
};

export interface TriggerAiState {
  displayInput: string | null;
  hasScreenshot: boolean;
  screenshot: string | null;
  assistedWith: string | null;
}

export type TriggerAiOptions = {
  shouldCaptureScreenshot: boolean;
  manualInput?: string | null;
  displayInput?: string | null;
  useWebSearch?: boolean;
  metadata?: Record<string, any>;
};

/** Tracks which actions were triggered via UI clicks (for showing shortcut notifications) */
export interface ClickedState {
  askAi: boolean;
  clear: boolean;
  hide: boolean;
}

export class AiResponsesService {
  triggerAiState: TriggerAiState | null = null;
  conversation: AiConversation = {
    responses: [],
    pendingResponse: null,
  };
  isManualInputActive = false;
  isAudioSessionWindowOpen = false;
  useWebSearch = false;
  /** When true, the conversation is visually hidden but not cleared */
  ignoreCurrentConversation = false;

  /** Tracks which actions were triggered via UI clicks (for showing shortcut notifications) */
  clicked: ClickedState = {
    askAi: false,
    clear: false,
    hide: false,
  };

  private abortController: AbortController | null = null;

  constructor(private readonly contextService: ContextService) {
    makeObservable(this, {
      triggerAiState: observable,
      conversation: observable,
      isManualInputActive: observable,
      isAudioSessionWindowOpen: observable,
      useWebSearch: observable,
      ignoreCurrentConversation: observable,
      clicked: observable,
      isCapturingScreenshot: computed,
      showMainAppAiContent: computed,
      clearConversation: action,
      revealCurrentConversation: action,
      setClickedAskAi: action,
      setClickedClear: action,
      setClickedHide: action,
      setIsManualInputActive: action,
      setIsAudioSessionWindowOpen: action,
      setUseWebSearch: action,
      setTriggerAiState: action,
      updateConversation: action,
    });
  }

  dispose(): void {
    this.abortController?.abort();
  }

  get isCapturingScreenshot(): boolean {
    return this.triggerAiState !== null;
  }

  get showMainAppAiContent(): boolean {
    return (
      this.isCapturingScreenshot ||
      this.isManualInputActive ||
      this.conversation.responses.length > 0 ||
      this.conversation.pendingResponse !== null
    );
  }

  /**
   * Clears (or visually hides) the current conversation.
   */
  clearConversation = (options?: { onlyClearVisually?: boolean }): void => {
    if (options?.onlyClearVisually) {
      this.ignoreCurrentConversation = true;
    } else {
      this.abortController?.abort();
      this.triggerAiState = null;
      this.conversation = { responses: [], pendingResponse: null };
      this.ignoreCurrentConversation = false;
    }
  };

  /** Reveals a visually hidden conversation */
  revealCurrentConversation = (): void => {
    this.ignoreCurrentConversation = false;
  };

  /** Set clicked state for askAi action */
  setClickedAskAi = (value: boolean): void => {
    this.clicked = { ...this.clicked, askAi: value };
  };

  /** Set clicked state for clear action */
  setClickedClear = (value: boolean): void => {
    this.clicked = { ...this.clicked, clear: value };
  };

  /** Set clicked state for hide action */
  setClickedHide = (value: boolean): void => {
    this.clicked = { ...this.clicked, hide: value };
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

  setTriggerAiState(newState: TriggerAiState | null) {
    this.triggerAiState = newState;
  }

  updateConversation(updater: (conv: AiConversation) => void) {
    updater(this.conversation);
  }

  public async triggerAi({
    shouldCaptureScreenshot,
    manualInput,
    displayInput,
    useWebSearch,
  }: TriggerAiOptions) {
    // Abort any previous request
    this.abortController?.abort();
    const controller = new AbortController();
    this.abortController = controller;

    try {
      // Set trigger state for UI feedback
      runInAction(() => {
        this.setTriggerAiState({
          displayInput: displayInput ?? null,
          hasScreenshot: shouldCaptureScreenshot,
          screenshot: null,
          assistedWith: null,
        });
      });

      // Capture screenshot if needed
      const screenshot = shouldCaptureScreenshot ? await captureScreenshotWithRetry() : null;

      if (controller.signal.aborted) return;

      // Commit any pending transcriptions
      await this.contextService.commitTranscriptions();

      if (controller.signal.aborted) return;

      // Create the pending response
      const responseId = uuidv7();
      runInAction(() => {
        this.conversation.pendingResponse = {
          state: "streaming",
          id: responseId,
          text: "",
          hasScreenshot: !!screenshot,
          screenshot: screenshot?.url ?? null,
          reasoningSteps: [],
          displayInput: displayInput ?? null,
          assistedWith: null,
        };
        this.triggerAiState = null;
      });

      // Build messages for AI
      const messages = this.buildMessages(manualInput, screenshot);

      // Stream the response
      await this.streamResponse(controller, messages, displayInput ?? null, useWebSearch);
    } catch (error) {
      if (controller.signal.aborted) return;

      console.error("Error triggering AI response:", error);

      runInAction(() => {
        const isNetworkError =
          error instanceof Error &&
          (error.message.includes("fetch") || error.message.includes("network"));

        this.conversation.pendingResponse = {
          state: "error",
          reason: isNetworkError ? "network" : "unknown",
          userFacingMessage: error instanceof Error ? error.message : "Unknown error",
          displayInput: displayInput ?? null,
        };
      });
    } finally {
      if (!controller.signal.aborted) {
        runInAction(() => {
          this.triggerAiState = null;
        });
      }
    }
  }

  private buildMessages(manualInput: string | null | undefined, screenshot: any | null): any[] {
    // Get existing conversation history
    const historyMessages = this.conversation.responses.flatMap((response) => [
      ...response.input.messages,
      { role: "assistant", content: response.text },
    ]);

    // Build user message content parts
    const contentParts: any[] = [];

    // Add audio context if available
    const audioContext = this.contextService.fullContext.audioContextAsText;
    if (audioContext) {
      contentParts.push({ type: "text", text: audioContext });
    }

    // Add manual input
    if (manualInput) {
      contentParts.push({ type: "text", text: manualInput });
    }

    // Add screenshot if available
    if (screenshot) {
      contentParts.push({
        type: "image",
        image: screenshot.url,
      });
    }

    // If no content, add a default prompt
    if (contentParts.length === 0) {
      contentParts.push({ type: "text", text: "Please assist me." });
    }

    const userMessage = {
      role: "user",
      content: contentParts,
    };

    return [...historyMessages, userMessage];
  }

  private async streamResponse(
    controller: AbortController,
    messages: any[],
    displayInput: string | null,
    useWebSearch?: boolean,
  ): Promise<void> {
    try {
      const { textStream, finishPromise } = await aiApiService.streamResponse({
        messages,
        abortSignal: controller.signal,
        useSearchGrounding: useWebSearch,
      });

      let fullText = "";

      // Stream text deltas
      for await (const delta of textStream) {
        if (controller.signal.aborted) return;

        fullText += delta;

        runInAction(() => {
          if (this.conversation.pendingResponse?.state === "streaming") {
            this.conversation.pendingResponse.text = fullText;
          }
        });
      }

      // Wait for finish
      const result = await finishPromise;

      if (controller.signal.aborted) return;

      // Move pending to completed
      runInAction(() => {
        const pending = this.conversation.pendingResponse;
        if (pending?.state === "streaming") {
          const newResponse: ConversationResponse = {
            id: pending.id,
            text: fullText,
            input: {
              messages,
              displayInput,
              assistedWith: null,
            },
            response: [{ role: "assistant", content: result.text }],
          };

          this.conversation.responses.push(newResponse);
          this.conversation.pendingResponse = null;
        }
      });
    } catch (error) {
      if (controller.signal.aborted) return;

      console.error("Streaming error:", error);

      runInAction(() => {
        const isNetworkError =
          error instanceof Error &&
          (error.message.includes("fetch") || error.message.includes("network"));

        this.conversation.pendingResponse = {
          state: "error",
          reason: isNetworkError ? "network" : "unknown",
          userFacingMessage: error instanceof Error ? error.message : "Streaming failed",
          displayInput,
        };
      });
    }
  }
}
