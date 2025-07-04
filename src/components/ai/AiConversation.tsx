import { makeObservable, observable, computed, action } from 'mobx';
import { AiResponse } from './AiResponse';
import { AudioSession } from '../../services/AudioSession';
import { AI_SYSTEM_PROMPT, AI_SCREENSHOT_SYSTEM_PROMPT, replaceContextPlaceholder } from '../../utils/prompts';
import { userContextStore } from '../../stores/userContextStore';
import { FullContext } from '../../services/ContextService';
import { conversationHistoryStore, StoredConversation } from '../../stores/conversationHistoryStore';
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
    // Infinite context properties
    private createdAt: Date = new Date();
    private initialContext: ContextData;
    private initialScreenshot?: any;
    private initialManualInput?: string;
    private hasBeenSaved: boolean = false;
    
    // Debug prefix for logging
    private readonly DEBUG_PREFIX = '💬 [AiConversation]';
    constructor(contextService: ContextService, fullContext: ContextData, screenshot?: any, manualInput?: string, useSearchGrounding?: boolean) {
        this.contextService = contextService;
        // Store initial conversation data for history saving
        this.initialContext = fullContext;
        this.initialScreenshot = screenshot;
        this.initialManualInput = manualInput;
        
        console.log(`${this.DEBUG_PREFIX} Created conversation ${this.id} at ${this.createdAt.toISOString()}`);

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
     * Generates a conversation title from the first user message
     */
    private generateConversationTitle(): string {
        // Try to get title from manual input first
        if (this.initialManualInput) {
            const cleanInput = this.initialManualInput.trim();
            if (cleanInput.length > 0) {
                // Take first 50 characters and clean up
                return cleanInput.length > 50 
                    ? cleanInput.substring(0, 47) + '...' 
                    : cleanInput;
            }
        }

        // Try to get title from first user message in responses
        const firstUserMessage = this.responses
            .flatMap(response => response.messages)
            .find(msg => msg.role === 'user');
            
        if (firstUserMessage?.content) {
            const cleanContent = firstUserMessage.content
                .replace(/User's message.*?:\n\n/g, '') // Remove "User's message" wrapper
                .replace(/Audio:\n\n.*$/s, '') // Remove audio context
                .trim();
                
            if (cleanContent.length > 0) {
                return cleanContent.length > 50 
                    ? cleanContent.substring(0, 47) + '...' 
                    : cleanContent;
            }
        }

        // Try to extract from audio context
        if (this.initialContext.audioTranscriptions?.length > 0) {
            const firstTranscription = this.initialContext.audioTranscriptions[0].text.trim();
            if (firstTranscription.length > 0) {
                return firstTranscription.length > 50 
                    ? firstTranscription.substring(0, 47) + '...' 
                    : firstTranscription;
            }
        }

        // Fallback to timestamp-based title
        return `Conversation ${this.createdAt.toLocaleTimeString()}`;
    }

    /**
     * Extracts relevant tags from the conversation content
     */
    private extractConversationTags(): string[] {
        const tags: Set<string> = new Set();
        
        // Add context-based tags
        if (this.initialContext.audioTranscriptions?.length > 0) {
            tags.add('audio');
        }
        if (this.initialScreenshot) {
            tags.add('screenshot');
        }
        if (this.initialManualInput) {
            tags.add('manual');
        }
        
        // Add content-based tags by looking for common keywords
        const allText = this.responses
            .flatMap(response => response.messages)
            .map(msg => msg.content.toLowerCase())
            .join(' ');
            
        const keywordTags: { [key: string]: string[] } = {
            'coding': ['code', 'programming', 'function', 'variable', 'javascript', 'typescript', 'react', 'python'],
            'help': ['help', 'assistance', 'support', 'problem', 'issue', 'error'],
            'api': ['api', 'endpoint', 'request', 'response', 'http', 'rest'],
            'ui': ['component', 'interface', 'design', 'layout', 'css', 'html'],
            'config': ['configuration', 'setup', 'install', 'configure', 'settings']
        };
        
        for (const [tag, keywords] of Object.entries(keywordTags)) {
            if (keywords.some(keyword => allText.includes(keyword))) {
                tags.add(tag);
            }
        }
        
        return Array.from(tags);
    }

    /**
     * Builds all messages from the conversation including responses
     */
    private buildAllMessages(): StoredConversation['messages'] {
        const messages: StoredConversation['messages'] = [];
        
        for (const response of this.responses) {
            // Add all messages from this response
            messages.push(...response.messages);
            
            // Add the assistant's response if it's finished
            if (response.state.state === 'finished' && response.state.text) {
                messages.push({
                    role: 'assistant',
                    content: response.state.text
                });
            }
        }
        
        return messages;
    }

    /**
     * Checks if the conversation is worth saving
     */
    private shouldSaveConversation(): boolean {
        // Don't save if already saved
        if (this.hasBeenSaved) {
            console.log(`${this.DEBUG_PREFIX} Conversation ${this.id} already saved, skipping`);
            return false;
        }

        // Don't save if no meaningful responses
        const finishedResponses = this.responses.filter(r => r.state.state === 'finished');
        if (finishedResponses.length === 0) {
            console.log(`${this.DEBUG_PREFIX} Conversation ${this.id} has no finished responses, skipping save`);
            return false;
        }

        // Don't save if responses are too short (likely errors or empty responses)
        const hasSubstantialContent = finishedResponses.some(r => 
            r.state.text && r.state.text.trim().length > 10
        );
        
        if (!hasSubstantialContent) {
            console.log(`${this.DEBUG_PREFIX} Conversation ${this.id} has no substantial content, skipping save`);
            return false;
        }

        return true;
    }

    /**
     * Saves the conversation to history store
     */
    saveToHistory(): void {
        console.log(`${this.DEBUG_PREFIX} Attempting to save conversation ${this.id} to history`);
        
        if (!this.shouldSaveConversation()) {
            return;
        }

        try {
            const storedConversation: StoredConversation = {
                id: this.id,
                timestamp: this.createdAt,
                title: this.generateConversationTitle(),
                messages: this.buildAllMessages(),
                context: {
                    audioTranscriptions: this.initialContext.audioTranscriptions?.map(t => ({
                        createdAt: t.createdAt,
                        source: t.source,
                        text: t.text
                    })),
                    userContext: userContextStore.getUserContext(),
                    screenshot: this.initialScreenshot
                },
                summary: undefined, // Will be generated later in temporal service
                tags: this.extractConversationTags(),
                responseCount: this.responses.filter(r => r.state.state === 'finished').length,
                lastActivity: new Date()
            };

            conversationHistoryStore.addConversation(storedConversation);
            this.hasBeenSaved = true;
            
            console.log(`${this.DEBUG_PREFIX} Successfully saved conversation "${storedConversation.title}" to history`);
        } catch (error) {
            console.error(`${this.DEBUG_PREFIX} Failed to save conversation to history:`, error);
        }
    }

    /**
     * Cleans up all active responses and sessions.
     */
    dispose(): void {
        console.log(`${this.DEBUG_PREFIX} Disposing conversation ${this.id}`);
        
        // Save to history before disposing
        this.saveToHistory();
        for (const response of this.prevResponses) {
            response.dispose();
        }
        this.latestResponse.dispose();
        this.nonAudioSession?.dispose();
        console.log(`${this.DEBUG_PREFIX} Conversation ${this.id} disposed`);
    }

    /**
     * Creates a new response turn in the conversation.
     * It archives the previous response and initiates a new one.
     */
    createNewResponse = (fullContext: ContextData, screenshot?: any, manualInput?: string, useSearchGrounding?: boolean): void => {
        // If the last response finished, move it to the history. Otherwise, discard it.
        if (this.latestResponse.state.state === 'finished') {
            this.prevResponses.push(this.latestResponse);
            // Try to save after each finished response
            this.saveToHistory();
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