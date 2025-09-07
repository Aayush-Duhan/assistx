import { makeObservable, observable, action } from 'mobx';
import { FullContext } from '../../services/ContextService';
import { aiApiService, AiStreamResult } from '../../services/AiApiService';
import { gmailService } from '../../services/GmailService';

export type AIResponseState = { state: "streaming"; text: string; abortController: AbortController }
    | { state: "finished"; text: string; timeToFirstTokenMs: number; timeToFinishMs: number }
    | { state: "error"; reason?: string };


export type AIResponseInput = {
    messages: any[];
    fullContext: FullContext;
    contextLengthUsed: number;
    manualInput: string | null;
    displayInput: string | null;
    systemPromptVariant: "audio" | "screen";
    useWebSearch?: boolean;
    useReasoning?: boolean;
    metadata: any;
};


interface AudioSession {
    state: {
        state: 'creating' | 'created' | 'error';
        sessionId?: string;
        creationPromise?: Promise<void>;
    };
}

export class AiResponse {
    createdAtMs = Date.now();
    provider = 'google';
    model = 'gemini-2.5-flash';
    id = crypto.randomUUID();
    state: AIResponseState = {
        state: 'streaming',
        text: '',
        abortController: new AbortController(),
    };

    constructor(
        public readonly input: AIResponseInput,
        private readonly session: AudioSession,
    ) {
        makeObservable(this, {
            state: observable,
            setState: action,
            setText: action,
        });

        this.streamResponse();
    }

    dispose() {
        if (this.state.state === 'streaming') {
            this.state.abortController.abort("Dispose");
        }
    }

    setState(newState: AIResponseState) {
        if (this.state.state === 'streaming') {
            this.state.abortController.abort("State change");
        }
        this.state = newState;
    };

    setText(newText: string) {
        if (this.state.state === 'streaming') {
            this.state.text = newText;
        }
    };

    async streamResponse() {
        if (this.state.state !== 'streaming') return;
        const { abortController } = this.state;
        let openedDraft = false;

        try {
            if (this.session.state.state === 'creating') {
                await this.session.state.creationPromise;
            }
            if (this.session.state.state !== 'created') {
                throw new Error("Session not created");
            }

            if (!aiApiService.isConfigured()) {
                throw new Error("AI service not configured. Please set GOOGLE_GENERATIVE_AI_API_KEY in environment variables.");
            }

            const streamResult: AiStreamResult = await aiApiService.streamResponse({
                messages: this.input.messages,
                abortSignal: abortController?.signal,
                useSearchGrounding: this.input.useWebSearch,
                toolCallbacks: {
                    openDraftEmail: async ({ to, subject, body }) => {
                        // Open draft modal via metadata handler if provided
                        const handler = (this.input.metadata && this.input.metadata.openDraftEmail) as undefined | ((d: { to: string; subject: string; body: string }) => void);
                        if (handler) {
                            openedDraft = true;
                            handler({ to, subject, body });
                            return;
                        }
                        // Fallback: if Gmail is ready, send directly only if user explicitly asked to send without review
                        const userText = (this.input.manualInput || '').toLowerCase();
                        const shouldSendDirect = userText.includes('send email') && userText.includes('without review');
                        if (shouldSendDirect && gmailService.isReady) {
                            openedDraft = true;
                            await gmailService.sendEmail({ to, subject, body });
                            return;
                        }
                        // If nothing else, still surface a draft modal request with empty values
                        const fallback = (this.input.metadata && this.input.metadata.openDraftEmail) as undefined | ((d: { to: string; subject: string; body: string }) => void);
                        openedDraft = true;
                        fallback?.({ to, subject, body });
                        return;
                    }
                }
            });

            if (abortController.signal.aborted) return;

            let timeToFirstTokenMs: number | undefined;
            let accumulatedText = '';

            for await (const textChunk of streamResult.textStream) {
                if (abortController?.signal.aborted) return;

                accumulatedText += textChunk;
                this.setText(accumulatedText);

                if (timeToFirstTokenMs == null) {
                    timeToFirstTokenMs = Date.now() - this.createdAtMs;
                }
            }

            await streamResult.finishPromise;
            const timeToFinishMs = Date.now() - this.createdAtMs;

            this.setState({
                state: 'finished',
                text: accumulatedText,
                timeToFirstTokenMs: timeToFirstTokenMs ?? timeToFinishMs,
                timeToFinishMs,
            });

            // Fallback: if user asked for email draft but the model didn't call the tool, open an empty draft modal
            try {
                if (!openedDraft && this.input?.metadata?.requestedEmailDraft) {
                    const handler = (this.input.metadata && this.input.metadata.openDraftEmail) as undefined | ((d?: { to: string; subject: string; body: string }) => void);
                    handler?.();
                }
            } catch {}

        } catch (error) {
            if (abortController.signal.aborted) return;
            console.error("Error while streaming response:", error);

            // Determine error reason based on error type
            let reason = 'unknown';
            if (error instanceof TypeError && error.message.includes('fetch')) {
                reason = 'network';
            } else if (error instanceof Error && error.message.includes('network')) {
                reason = 'network';
            }

            this.setState({
                state: 'error',
                reason,
            });
        }
    }
}