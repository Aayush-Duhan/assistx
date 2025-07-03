import { makeObservable, observable, action } from 'mobx';
import { FullContext } from '../../services/ContextService';
import { aiApiService, AiStreamResult } from '../../services/AiApiService';

// Type definitions
interface Message {
    role: 'system' | 'user' | 'assistant';
    content: string;
    experimental_attachments?: any[];
}

interface ResponseState {
    state: 'streaming' | 'finished' | 'error';
    text: string;
    abortController?: AbortController;
    timeToFirstTokenMs?: number;
    timeToFinishMs?: number;
}

interface AudioSession {
    state: {
        state: 'creating' | 'created' | 'error';
        sessionId?: string;
        creationPromise?: Promise<void>;
    };
}

// Use the actual FullContext class
type ContextData = FullContext;

/**
 * Manages a single, streaming response from the AI model.
 * It handles the API call, state transitions (streaming, finished, error),
 * and tracks performance metrics.
 */
export class AiResponse {
    createdAtMs = Date.now();
    provider = 'google'; // Default to Google Gemini
    model = 'gemini-2.5-flash'; // Default model
    id = crypto.randomUUID();
    state: ResponseState = {
        state: 'streaming',
        text: '',
        abortController: new AbortController(),
    };

    // --- Injected Dependencies ---
    messages: Message[];
    fullContext: ContextData;
    manualInput?: string;
    attachments: any[];
    session: AudioSession;

    constructor(messages: Message[], fullContext: ContextData, manualInput?: string, attachments: any[] = [], session?: AudioSession) {
        this.messages = messages;
        this.fullContext = fullContext;
        this.manualInput = manualInput;
        this.attachments = attachments;
        this.session = session || { state: { state: 'created' } };

        makeObservable(this, {
            state: observable,
            setState: action,
            setText: action,
        });

        this.streamResponse();
    }

    /**
     * Aborts the streaming request if it's in progress.
     */
    dispose(): void {
        if (this.state.state === 'streaming' && this.state.abortController) {
            this.state.abortController.abort("Dispose");
        }
    }

    /**
     * Updates the state of the AI response.
     * @param newState - The new state object.
     */
    setState = (newState: ResponseState): void => {
        // If we are transitioning away from the streaming state, abort the request.
        if (this.state.state === 'streaming' && this.state.abortController) {
            this.state.abortController.abort("State change");
        }
        this.state = newState;
    };

    /**
     * Appends text to the current response text while streaming.
     * @param newText - The chunk of text to append.
     */
    setText = (newText: string): void => {
        if (this.state.state === 'streaming') {
            this.state.text = newText;
        }
    };

    /**
     * The main async method that initiates and handles the streaming API call.
     * Now uses Vercel AI SDK for real AI streaming.
     */
    async streamResponse(): Promise<void> {
        if (this.state.state !== 'streaming') return;
        const { abortController } = this.state;

        try {
            // Ensure the backend session is ready before making the call.
            if (this.session.state.state === 'creating' && this.session.state.creationPromise) {
                await this.session.state.creationPromise;
            }
            if (this.session.state.state !== 'created') {
                throw new Error("Session not created");
            }

            // Check if AI service is configured
            if (!aiApiService.isConfigured()) {
                throw new Error("AI service not configured. Please set GOOGLE_GENERATIVE_AI_API_KEY in environment variables.");
            }

            // Stream response using the full message array (preserves conversation history)
            const streamResult: AiStreamResult = await aiApiService.streamResponse({
                messages: this.messages,
                abortSignal: abortController?.signal,
            });

            if (abortController?.signal.aborted) return;

            let timeToFirstTokenMs: number | undefined;
            let accumulatedText = '';

            // Process the text stream
            for await (const textChunk of streamResult.textStream) {
                if (abortController?.signal.aborted) return;

                accumulatedText += textChunk;
                this.setText(accumulatedText);

                // Record the time to the first token for performance monitoring.
                if (timeToFirstTokenMs == null) {
                    timeToFirstTokenMs = Date.now() - this.createdAtMs;
                }
            }

            // Wait for the stream to finish and get final metadata
            const finalResult = await streamResult.finishPromise;
            const timeToFinishMs = Date.now() - this.createdAtMs;

            this.setState({
                state: 'finished',
                text: accumulatedText,
                timeToFirstTokenMs: timeToFirstTokenMs ?? timeToFinishMs,
                timeToFinishMs,
            });

        } catch (error) {
            if (abortController?.signal.aborted) return;
            console.error("Error while streaming response:", error);
            this.setState({ 
                state: 'error',
                text: `Error: ${error instanceof Error ? error.message : 'Unknown error occurred'}`,
            });
        }
    }


}