import { makeObservable, observable, computed, action } from 'mobx';
import { AiResponse } from './AiResponse';
import { AudioSession } from '../../services/AudioSession';
import { AI_SYSTEM_PROMPT, AI_SCREENSHOT_SYSTEM_PROMPT, replaceContextPlaceholder } from '../../utils/prompts';
import { userContextStore } from '../../stores/userContextStore';
import { FullContext } from '../../services/ContextService';
// Type definitions
interface Message {
    role: 'system' | 'user' | 'assistant';
    content: string;
    experimental_attachments?: any[];
}

// Use the actual FullContext class instead of a separate interface
type ContextData = FullContext;

interface ContextService {
    audioSession?: AudioSession | null;
    isTranscribing: boolean;
}

/**
 * Represents a single conversation with the AI, which can have multiple
 * request/response turns. It manages the message history and context.
 */
export class AiConversation {
    prevResponses: AiResponse[] = [];
    latestResponse: AiResponse;
    id = crypto.randomUUID();
    nonAudioSession: AudioSession | null; // A session specifically for non-audio interactions
    session: AudioSession; // The primary session (could be audio or non-audio)
    contextService: ContextService;

    constructor(contextService: ContextService, fullContext: ContextData, screenshot?: any, manualInput?: string, useSearchGrounding?: boolean) {
        this.contextService = contextService;

        // If the main context service has an active audio session, use it.
        // Otherwise, create a new, temporary non-audio session for this conversation.
        if (contextService.audioSession) {
            this.nonAudioSession = null;
            this.session = contextService.audioSession;
        } else {
            this.nonAudioSession = new AudioSession(false); // `false` for no audio
            this.session = this.nonAudioSession;
        }

        // Create the very first response in the conversation.
        this.latestResponse = this.createResponseFromContext({
            fullContext,
            newContext: fullContext,
            screenshot,
            manualInput,
            useSearchGrounding,
        });

        makeObservable(this, {
            prevResponses: observable,
            latestResponse: observable,
            createNewResponse: action,
            state: computed,
            responses: computed,
        });
    }
    /**
     * Cleans up all active responses and sessions.
     */
    dispose(): void {
        for (const response of this.prevResponses) {
            response.dispose();
        }
        this.latestResponse.dispose();
        this.nonAudioSession?.dispose();
    }

    /**
     * Creates a new response turn in the conversation.
     * It archives the previous response and initiates a new one.
     */
    createNewResponse = (fullContext: ContextData, screenshot?: any, manualInput?: string, useSearchGrounding?: boolean): void => {
        // If the last response finished, move it to the history. Otherwise, discard it.
        if (this.latestResponse.state.state === 'finished') {
            this.prevResponses.push(this.latestResponse);
        } else {
            this.latestResponse.dispose();
        }

        const prevContext = this.prevResponses[this.prevResponses.length - 1]?.fullContext;
        const newContext = prevContext ? fullContext.diff(prevContext) : fullContext;

        this.latestResponse = this.createResponseFromContext({
            fullContext,
            newContext,
            screenshot,
            manualInput,
            useSearchGrounding,
        });
    };

    /**
     * The state of the most recent (latest) response.
     */
    get state() {
        return this.latestResponse.state;
    }

    /**
     * A combined list of all previous responses and the current one.
     */
    get responses(): AiResponse[] {
        return [...this.prevResponses, this.latestResponse];
    }

    /**
     * Constructs the message history and context to be sent to the AI model.
     */
    createResponseFromContext({ fullContext, newContext, screenshot, manualInput, useSearchGrounding }: {
        fullContext: ContextData;
        newContext: ContextData;
        screenshot?: any;
        manualInput?: string;
        useSearchGrounding?: boolean;
    }): AiResponse {
        let messages: Message[] = [];
        const lastResponse = this.prevResponses[this.prevResponses.length - 1];

        // If there's a previous turn, build on top of it by including the last
        // user message and the assistant's response.
        if (lastResponse?.state.state === 'finished') {
            messages.push(...lastResponse.messages);
            messages.push({ role: 'assistant', content: lastResponse.state.text });
        } else {
            // Otherwise, this is the first turn, so start with the system prompt.
            const basePrompt = this.contextService.isTranscribing
                ? AI_SYSTEM_PROMPT.trim()
                : AI_SCREENSHOT_SYSTEM_PROMPT.trim();
            
            // Replace the user context placeholder with actual user context
            const userContext = userContextStore.getUserContext() || "No additional context provided.";
            const systemPrompt = replaceContextPlaceholder(basePrompt, userContext);
            
            messages.push({ role: 'system', content: systemPrompt });
        }

        // Assemble the user's message from the new context.
        const userContentParts: string[] = [];
        if (newContext.audioContextAsText) {
            userContentParts.push(newContext.audioContextAsText);
        }
        if (manualInput) {
            userContentParts.push(`User's message (which you should always respond to):\n\n${manualInput}`);
        }

        const attachments = screenshot ? [screenshot] : [];
        messages.push({
            role: 'user',
            content: userContentParts.join('\n\n'),
            experimental_attachments: attachments,
        });

        // Prune messages to respect token limits or other constraints.
        messages = this.pruneMessages(messages, !!newContext.audioContextAsText);

        return new AiResponse(messages, fullContext, manualInput, attachments, this.session, useSearchGrounding || false);
    }

    /**
     * Prunes messages, primarily by removing older attachments if the attachment
     * limit is exceeded. Since we're going open source, we'll use a simple default limit.
     */
    pruneMessages(messages: Message[], hasAudioContext: boolean): Message[] {
        const newMessages = messages.map(msg => ({ ...msg }));
        let maxAttachments = 3; // Simple default limit for open source version

        // If there's no audio context, we need at least one screenshot.
        if (!hasAudioContext && maxAttachments === 0) {
            maxAttachments = 1;
        }

        let attachmentCount = 0;
        // Iterate backwards, removing attachments from older messages first.
        for (const msg of [...newMessages].reverse()) {
            attachmentCount += msg.experimental_attachments?.length ?? 0;
            if (attachmentCount > maxAttachments) {
                msg.experimental_attachments = undefined;
            }
        }

        return newMessages;
    }
} 