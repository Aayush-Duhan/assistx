import { makeAutoObservable } from 'mobx';
import { AiResponse } from './AiResponse';
import { AudioSession } from '../../services/AudioSession';
import { ContextService } from '../../services/ContextService';
import { FullContext } from '../../services/ContextService';
import { uuidv7 } from 'uuidv7';

export class AiConversation {
    public prevResponses: AiResponse[] = [];
    public latestResponse: AiResponse;
    public readonlyid = uuidv7();
    private nonAudioSession: AudioSession | null;
    public readonly session: AudioSession;

    constructor(
        private readonly contextService: ContextService,
        options: {
            fullContext: FullContext;
            screenshot: any | null;
            manualInput: string | null;
            displayInput: string | null;
            useWebSearch?: boolean;
            metadata?: Record<string, any>;
        }
    ) {
        if (contextService.audioSession) {
            this.nonAudioSession = null;
            this.session = contextService.audioSession;
        } else {
            this.nonAudioSession = new AudioSession(contextService, false);
            this.session = this.nonAudioSession;
        }


        // Create the very first response in the conversation.
        this.latestResponse = this.createResponseFromContext({
            fullContext: options.fullContext,
            newContext: options.fullContext,
            screenshot: options.screenshot,
            manualInput: options.manualInput,
            displayInput: options.displayInput,
            useWebSearch: options.useWebSearch,
            metadata: options.metadata,
        });

        makeAutoObservable(this, {
            // MobX annotations for observable properties and actions
            prevResponses: true,
            latestResponse: true,
            createNewResponse: true,
            state: true,
            responses: true,
          });
    }

    public dispose(): void {
        for (const response of this.prevResponses) {
            response.dispose();
        }
        this.latestResponse.dispose();
        this.nonAudioSession?.dispose();
    }

    public createNewResponse(options: {
        fullContext: FullContext;
        screenshot: any | null;
        manualInput: string | null;
        displayInput: string | null;
        useWebSearch?: boolean;
        metadata?: Record<string, any>;
    }) {
        if (this.latestResponse.state.state === 'finished') {
            this.prevResponses.push(this.latestResponse);
        } else {
            this.latestResponse.dispose();
        }

        const lastContextLength = this.prevResponses[this.prevResponses.length - 1]?.input.contextLengthUsed ?? 0;
        const newContext = new FullContext(options.fullContext.audioTranscriptions.slice(lastContextLength));

        this.latestResponse = this.createResponseFromContext({
            fullContext: options.fullContext,
            newContext,
            screenshot: options.screenshot,
            manualInput: options.manualInput,
            displayInput: options.displayInput,
            useWebSearch: options.useWebSearch,
            metadata: options.metadata,
        });
    };

    public get state() {
        return this.latestResponse.state;
    }

    public get responses(): AiResponse[] {
        return [...this.prevResponses, this.latestResponse];
    }

    private  createResponseFromContext(options: {
        fullContext: FullContext;
        newContext: FullContext;
        screenshot: any | null;
        manualInput: string | null;
        displayInput: string | null;
        useWebSearch?: boolean;
        metadata?: Record<string, any>;
    }): AiResponse {
        let messages: any[] = [];
        const lastResponse = this.prevResponses[this.prevResponses.length - 1];

        if (lastResponse?.state.state === 'finished') {
            messages.push(...lastResponse.input.messages);
            messages.push({ role: 'assistant', content: lastResponse.state.text });
        }
        const contentParts: string[] = [];
        let hasAudioContext = false;
        if (options.newContext.audioContextAsText) {
            contentParts.push(options.newContext.audioContextAsText);
            hasAudioContext = true;
        }
        if (options.manualInput) {
            contentParts.push(
                `User's message (you should **always** respond to this message (since there is a user message, you MUST NEVER say you're not sure what to do / you MUST NEVER enter passive mode); **only** if applicable, use the image/transcript/other context provided to help, if technical respond with technical depth (/math if mathematically deep), if not then deliver simple / brief answer):\\n\\n${options.manualInput}`
            );
        }

        const attachments = options.screenshot ? [options.screenshot] : [];
        messages.push({
            role: 'user',
            content: contentParts.join('\n\n'),
            experimental_attachments: attachments,
        });

        messages = this.pruneMessages(messages, hasAudioContext);
        const systemPromptVariant = this.contextService.isTranscribing ? "audio" : "screen";


        return new AiResponse(
            {
                messages,
                fullContext: options.fullContext,
                contextLengthUsed: options.fullContext.audioTranscriptions.length,
                manualInput: options.manualInput,
                displayInput: options.displayInput,
                systemPromptVariant,
                useWebSearch: options.useWebSearch,
                metadata: options.metadata,
            },
            this.session
        );
    }

    private pruneMessages(messages: any[], hasAudioContext: boolean): any[] {
        const newMessages = messages.map(msg => ({ ...msg }));
        let maxAttachments = 3;

        if (!hasAudioContext && maxAttachments === 0) {
            maxAttachments = 1;
        }

        let attachmentCount = 0;
        
        for (const msg of [...newMessages].reverse()) {
            attachmentCount += msg.experimental_attachments?.length ?? 0;
            if (attachmentCount > maxAttachments) {
                msg.experimental_attachments = undefined;
            }
        }

        return newMessages;
    }
} 