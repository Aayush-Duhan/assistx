import { makeObservable, observable, action } from 'mobx';

// Debug prefix for easy filtering of logs
const DEBUG_PREFIX = '🗂️ [ConversationHistoryStore]';

/**
 * Interface for a stored conversation with all necessary metadata
 */
export interface StoredConversation {
    id: string;
    timestamp: Date;
    title: string; // Auto-generated from first user message
    messages: Array<{
        role: 'system' | 'user' | 'assistant';
        content: string;
        experimental_attachments?: any[];
    }>;
    context: {
        audioTranscriptions?: Array<{
            createdAt: Date;
            source: 'mic' | 'system';
            text: string;
        }>;
        userContext?: string;
        screenshot?: any;
    };
    summary?: string; // AI-generated summary
    tags: string[];
    responseCount: number; // Number of AI responses in conversation
    lastActivity: Date; // When conversation was last updated
}

/**
 * Store to manage conversation history with temporal organization
 * Follows the same pattern as existing stores (settingsStore, userContextStore)
 */
export class ConversationHistoryStore {
    conversations: StoredConversation[] = [];
    private readonly maxConversations = 1000; // Prevent unlimited growth
    private readonly storageKey = 'assistx_conversation_history';

    constructor() {
        console.log(`${DEBUG_PREFIX} Initializing ConversationHistoryStore`);
        
        makeObservable(this, {
            conversations: observable,
            addConversation: action,
            updateConversation: action,
            deleteConversation: action,
            clearAllConversations: action,
        });
        
        // Load from localStorage on initialization
        this.loadFromStorage();
        
        console.log(`${DEBUG_PREFIX} Initialized with ${this.conversations.length} stored conversations`);
    }

    /**
     * Add a new conversation to the history
     */
    addConversation = (conversation: StoredConversation): void => {
        console.log(`${DEBUG_PREFIX} Adding conversation:`, {
            id: conversation.id,
            title: conversation.title,
            messageCount: conversation.messages.length,
            timestamp: conversation.timestamp
        });

        // Prevent duplicates
        const existingIndex = this.conversations.findIndex(c => c.id === conversation.id);
        if (existingIndex !== -1) {
            console.log(`${DEBUG_PREFIX} Conversation ${conversation.id} already exists, updating instead`);
            this.conversations[existingIndex] = conversation;
        } else {
            // Add to beginning (most recent first)
            this.conversations.unshift(conversation);
            
            // Enforce max conversations limit
            if (this.conversations.length > this.maxConversations) {
                const removed = this.conversations.splice(this.maxConversations);
                console.log(`${DEBUG_PREFIX} Removed ${removed.length} old conversations to stay under limit`);
            }
        }

        this.saveToStorage();
        console.log(`${DEBUG_PREFIX} Conversation added successfully. Total: ${this.conversations.length}`);
    };

    /**
     * Update an existing conversation
     */
    updateConversation = (conversationId: string, updates: Partial<StoredConversation>): void => {
        console.log(`${DEBUG_PREFIX} Updating conversation ${conversationId}:`, updates);
        
        const index = this.conversations.findIndex(c => c.id === conversationId);
        if (index !== -1) {
            this.conversations[index] = { 
                ...this.conversations[index], 
                ...updates,
                lastActivity: new Date()
            };
            this.saveToStorage();
            console.log(`${DEBUG_PREFIX} Conversation ${conversationId} updated successfully`);
        } else {
            console.warn(`${DEBUG_PREFIX} Conversation ${conversationId} not found for update`);
        }
    };

    /**
     * Delete a conversation by ID
     */
    deleteConversation = (conversationId: string): void => {
        console.log(`${DEBUG_PREFIX} Deleting conversation ${conversationId}`);
        
        const initialLength = this.conversations.length;
        this.conversations = this.conversations.filter(c => c.id !== conversationId);
        
        if (this.conversations.length < initialLength) {
            this.saveToStorage();
            console.log(`${DEBUG_PREFIX} Conversation ${conversationId} deleted successfully`);
        } else {
            console.warn(`${DEBUG_PREFIX} Conversation ${conversationId} not found for deletion`);
        }
    };

    /**
     * Get all conversations, sorted by timestamp (most recent first)
     */
    getAllConversations(): StoredConversation[] {
        const sorted = [...this.conversations].sort((a, b) => 
            new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
        );
        console.log(`${DEBUG_PREFIX} Retrieved ${sorted.length} conversations`);
        return sorted;
    }

    /**
     * Get conversations for a specific date range
     */
    getConversationsInRange(startDate: Date, endDate: Date): StoredConversation[] {
        const filtered = this.conversations.filter(conversation => {
            const convDate = new Date(conversation.timestamp);
            return convDate >= startDate && convDate <= endDate;
        });
        
        console.log(`${DEBUG_PREFIX} Found ${filtered.length} conversations between ${startDate.toISOString()} and ${endDate.toISOString()}`);
        return filtered.sort((a, b) => 
            new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
        );
    }

    /**
     * Get conversations from a specific date
     */
    getConversationsForDate(date: Date): StoredConversation[] {
        const startOfDay = new Date(date);
        startOfDay.setHours(0, 0, 0, 0);
        
        const endOfDay = new Date(date);
        endOfDay.setHours(23, 59, 59, 999);
        
        return this.getConversationsInRange(startOfDay, endOfDay);
    }

    /**
     * Search conversations by text content
     */
    searchConversations(query: string, maxResults: number = 10): StoredConversation[] {
        console.log(`${DEBUG_PREFIX} Searching conversations for: "${query}"`);
        
        const lowercaseQuery = query.toLowerCase();
        const results = this.conversations
            .filter(conversation => {
                // Search in title, messages, and tags
                const titleMatch = conversation.title.toLowerCase().includes(lowercaseQuery);
                const messageMatch = conversation.messages.some(msg => 
                    msg.content.toLowerCase().includes(lowercaseQuery)
                );
                const tagMatch = conversation.tags.some(tag => 
                    tag.toLowerCase().includes(lowercaseQuery)
                );
                
                return titleMatch || messageMatch || tagMatch;
            })
            .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
            .slice(0, maxResults);
        
        console.log(`${DEBUG_PREFIX} Search found ${results.length} matching conversations`);
        return results;
    }

    /**
     * Clear all conversation history
     */
    clearAllConversations = (): void => {
        console.log(`${DEBUG_PREFIX} Clearing all conversations (${this.conversations.length} total)`);
        this.conversations = [];
        this.saveToStorage();
        console.log(`${DEBUG_PREFIX} All conversations cleared`);
    };

    /**
     * Get storage statistics
     */
    getStorageStats(): {
        totalConversations: number;
        totalMessages: number;
        oldestConversation?: Date;
        newestConversation?: Date;
        estimatedSizeKB: number;
    } {
        const totalMessages = this.conversations.reduce((sum, conv) => sum + conv.messages.length, 0);
        const timestamps = this.conversations.map(c => new Date(c.timestamp));
        const estimatedSizeKB = Math.round(JSON.stringify(this.conversations).length / 1024);
        
        const stats = {
            totalConversations: this.conversations.length,
            totalMessages,
            oldestConversation: timestamps.length > 0 ? new Date(Math.min(...timestamps.map(d => d.getTime()))) : undefined,
            newestConversation: timestamps.length > 0 ? new Date(Math.max(...timestamps.map(d => d.getTime()))) : undefined,
            estimatedSizeKB
        };
        
        console.log(`${DEBUG_PREFIX} Storage stats:`, stats);
        return stats;
    }

    /**
     * Save conversations to localStorage
     */
    private saveToStorage(): void {
        try {
            const dataToSave = {
                conversations: this.conversations,
                savedAt: new Date().toISOString(),
                version: '1.0'
            };
            
            localStorage.setItem(this.storageKey, JSON.stringify(dataToSave));
            console.log(`${DEBUG_PREFIX} Saved ${this.conversations.length} conversations to localStorage`);
        } catch (error) {
            console.error(`${DEBUG_PREFIX} Failed to save conversations to localStorage:`, error);
            
            // If storage is full, try to free space by removing oldest conversations
            if (error instanceof Error && error.name === 'QuotaExceededError') {
                console.log(`${DEBUG_PREFIX} Storage quota exceeded, removing oldest conversations`);
                const originalLength = this.conversations.length;
                this.conversations = this.conversations.slice(0, Math.floor(originalLength * 0.8));
                
                try {
                    localStorage.setItem(this.storageKey, JSON.stringify({
                        conversations: this.conversations,
                        savedAt: new Date().toISOString(),
                        version: '1.0'
                    }));
                    console.log(`${DEBUG_PREFIX} Successfully saved after removing ${originalLength - this.conversations.length} old conversations`);
                } catch (retryError) {
                    console.error(`${DEBUG_PREFIX} Failed to save even after cleanup:`, retryError);
                }
            }
        }
    }

    /**
     * Load conversations from localStorage
     */
    private loadFromStorage(): void {
        try {
            const stored = localStorage.getItem(this.storageKey);
            if (stored) {
                const data = JSON.parse(stored);
                
                // Handle different data formats for backward compatibility
                if (Array.isArray(data)) {
                    // Old format: direct array
                    this.conversations = data;
                    console.log(`${DEBUG_PREFIX} Loaded ${data.length} conversations from old format`);
                } else if (data.conversations && Array.isArray(data.conversations)) {
                    // New format: object with metadata
                    this.conversations = data.conversations;
                    console.log(`${DEBUG_PREFIX} Loaded ${data.conversations.length} conversations from storage (saved: ${data.savedAt})`);
                } else {
                    console.warn(`${DEBUG_PREFIX} Invalid stored data format, starting with empty conversations`);
                    this.conversations = [];
                }
                
                // Convert timestamp strings back to Date objects
                this.conversations = this.conversations.map(conv => ({
                    ...conv,
                    timestamp: new Date(conv.timestamp),
                    lastActivity: conv.lastActivity ? new Date(conv.lastActivity) : new Date(conv.timestamp),
                    context: {
                        ...conv.context,
                        audioTranscriptions: conv.context.audioTranscriptions?.map(t => ({
                            ...t,
                            createdAt: new Date(t.createdAt)
                        })) || []
                    }
                }));
                
                console.log(`${DEBUG_PREFIX} Processed ${this.conversations.length} conversations with date conversion`);
            } else {
                console.log(`${DEBUG_PREFIX} No stored conversations found, starting fresh`);
            }
        } catch (error) {
            console.error(`${DEBUG_PREFIX} Failed to load conversations from localStorage:`, error);
            this.conversations = [];
        }
    }
}

// Create and export a singleton instance
export const conversationHistoryStore = new ConversationHistoryStore(); 