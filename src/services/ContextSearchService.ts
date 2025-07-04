import { conversationHistoryStore, StoredConversation } from '../stores/conversationHistoryStore';

// Debug prefix for easy filtering of logs
const DEBUG_PREFIX = '🔍 [ContextSearchService]';

/**
 * Interface for search queries with various filters
 */
export interface SearchQuery {
    query: string;
    timeRange?: {
        start: Date;
        end: Date;
        relative?: string; // "yesterday", "last week", "2 days ago"
    };
    tags?: string[];
    maxResults?: number;
    minRelevanceScore?: number;
}

/**
 * Interface for search results with relevance scoring
 */
export interface SearchResult {
    conversation: StoredConversation;
    relevanceScore: number;
    matchedContent: string[];
    matchedFields: string[]; // Which fields matched (title, messages, tags)
    snippet: string; // Brief excerpt showing the match
}

/**
 * Interface for temporal analysis results
 */
export interface TemporalAnalysis {
    hasTemporalReference: boolean;
    timeRange?: { start: Date; end: Date };
    relativeDescription?: string;
    cleanedQuery: string; // Query with temporal words removed
}

/**
 * Service for searching and retrieving conversation history
 * Provides temporal, keyword, and semantic search capabilities
 */
export class ContextSearchService {
    constructor() {
        console.log(`${DEBUG_PREFIX} ContextSearchService initialized`);
    }

    /**
     * Main search method that handles all types of queries
     */
    async search(query: SearchQuery): Promise<SearchResult[]> {
        console.log(`${DEBUG_PREFIX} Searching for:`, query);

        try {
            // Step 1: Get base conversations (with time filtering if specified)
            let conversations = this.getConversationsInTimeRange(query.timeRange);
            console.log(`${DEBUG_PREFIX} Found ${conversations.length} conversations in time range`);

            // Step 2: Filter by tags if specified
            if (query.tags && query.tags.length > 0) {
                conversations = this.filterByTags(conversations, query.tags);
                console.log(`${DEBUG_PREFIX} After tag filtering: ${conversations.length} conversations`);
            }

            // Step 3: Perform text search and scoring
            const results = this.performTextSearch(conversations, query.query);
            console.log(`${DEBUG_PREFIX} Found ${results.length} text matches`);

            // Step 4: Apply relevance scoring and filtering
            const scoredResults = this.applyRelevanceScoring(results, query.query);
            
            // Step 5: Filter by minimum relevance score
            const filteredResults = query.minRelevanceScore 
                ? scoredResults.filter(r => r.relevanceScore >= query.minRelevanceScore!)
                : scoredResults;

            // Step 6: Sort by relevance and apply limit
            const finalResults = filteredResults
                .sort((a, b) => b.relevanceScore - a.relevanceScore)
                .slice(0, query.maxResults || 10);

            console.log(`${DEBUG_PREFIX} Returning ${finalResults.length} final results`);
            return finalResults;

        } catch (error) {
            console.error(`${DEBUG_PREFIX} Search error:`, error);
            return [];
        }
    }

    /**
     * Analyze query for temporal references and extract time ranges
     */
    analyzeTemporalReferences(query: string): TemporalAnalysis {
        console.log(`${DEBUG_PREFIX} Analyzing temporal references in: "${query}"`);
        
        const now = new Date();
        const lowercaseQuery = query.toLowerCase();
        
        // Common temporal patterns
        const temporalPatterns = [
            {
                pattern: /\b(yesterday|last night)\b/g,
                getDates: (_match?: RegExpMatchArray) => {
                    const yesterday = new Date(now);
                    yesterday.setDate(yesterday.getDate() - 1);
                    yesterday.setHours(0, 0, 0, 0);
                    const end = new Date(yesterday);
                    end.setHours(23, 59, 59, 999);
                    return { start: yesterday, end };
                },
                getDescription: (_match?: RegExpMatchArray) => 'yesterday'
            },
            {
                pattern: /\b(today|this morning|this afternoon|tonight)\b/g,
                getDates: (_match?: RegExpMatchArray) => {
                    const today = new Date(now);
                    today.setHours(0, 0, 0, 0);
                    const end = new Date(today);
                    end.setHours(23, 59, 59, 999);
                    return { start: today, end };
                },
                getDescription: (_match?: RegExpMatchArray) => 'today'
            },
            {
                pattern: /\b(\d+)\s+(days?|hours?)\s+ago\b/g,
                getDates: (match?: RegExpMatchArray) => {
                    if (!match) return null;
                    const amount = parseInt(match[1]);
                    const unit = match[2];
                    const start = new Date(now);
                    
                    if (unit.startsWith('day')) {
                        start.setDate(start.getDate() - amount);
                        start.setHours(0, 0, 0, 0);
                        const end = new Date(start);
                        end.setHours(23, 59, 59, 999);
                        return { start, end };
                    } else if (unit.startsWith('hour')) {
                        start.setHours(start.getHours() - amount);
                        return { start, end: new Date(now) };
                    }
                    return null;
                },
                getDescription: (match?: RegExpMatchArray) => match ? `${match[1]} ${match[2]} ago` : 'some time ago'
            },
            {
                pattern: /\b(last week|past week)\b/g,
                getDates: (_match?: RegExpMatchArray) => {
                    const start = new Date(now);
                    start.setDate(start.getDate() - 7);
                    start.setHours(0, 0, 0, 0);
                    return { start, end: now };
                },
                getDescription: (_match?: RegExpMatchArray) => 'last week'
            },
            {
                pattern: /\b(this week)\b/g,
                getDates: (_match?: RegExpMatchArray) => {
                    const start = new Date(now);
                    const dayOfWeek = start.getDay();
                    start.setDate(start.getDate() - dayOfWeek);
                    start.setHours(0, 0, 0, 0);
                    return { start, end: now };
                },
                getDescription: (_match?: RegExpMatchArray) => 'this week'
            }
        ];

        // Check each pattern
        for (const { pattern, getDates, getDescription } of temporalPatterns) {
            const matches = Array.from(lowercaseQuery.matchAll(pattern));
            if (matches.length > 0) {
                const match = matches[0];
                
                try {
                    const dateRange = getDates(match);
                    
                    if (dateRange) {
                        const cleanedQuery = query.replace(pattern, '').trim();
                        const desc = getDescription(match);
                        
                        console.log(`${DEBUG_PREFIX} Found temporal reference: ${desc}`);
                        return {
                            hasTemporalReference: true,
                            timeRange: dateRange,
                            relativeDescription: desc,
                            cleanedQuery
                        };
                    }
                } catch (error) {
                    console.warn(`${DEBUG_PREFIX} Error processing temporal pattern:`, error);
                    continue;
                }
            }
        }

        return {
            hasTemporalReference: false,
            cleanedQuery: query
        };
    }

    /**
     * Smart search that automatically handles temporal queries
     */
    async temporalSearch(query: string, maxResults: number = 10): Promise<SearchResult[]> {
        console.log(`${DEBUG_PREFIX} Performing temporal search: "${query}"`);
        
        const analysis = this.analyzeTemporalReferences(query);
        
        const searchQuery: SearchQuery = {
            query: analysis.cleanedQuery || query,
            timeRange: analysis.timeRange,
            maxResults
        };

        const results = await this.search(searchQuery);
        
        if (analysis.hasTemporalReference) {
            console.log(`${DEBUG_PREFIX} Temporal search (${analysis.relativeDescription}) found ${results.length} results`);
        }
        
        return results;
    }

    /**
     * Search by conversation tags
     */
    searchByTags(tags: string[], maxResults: number = 10): SearchResult[] {
        console.log(`${DEBUG_PREFIX} Searching by tags:`, tags);
        
        const conversations = conversationHistoryStore.getAllConversations();
        const matches: SearchResult[] = [];

        for (const conversation of conversations) {
            const matchingTags = conversation.tags.filter(tag => 
                tags.some(searchTag => tag.toLowerCase().includes(searchTag.toLowerCase()))
            );

            if (matchingTags.length > 0) {
                matches.push({
                    conversation,
                    relevanceScore: matchingTags.length / tags.length, // Percentage of tags matched
                    matchedContent: matchingTags,
                    matchedFields: ['tags'],
                    snippet: `Tags: ${matchingTags.join(', ')}`
                });
            }
        }

        const results = matches
            .sort((a, b) => b.relevanceScore - a.relevanceScore)
            .slice(0, maxResults);

        console.log(`${DEBUG_PREFIX} Tag search found ${results.length} results`);
        return results;
    }

    /**
     * Get recent conversations for context
     */
    getRecentContext(hours: number = 24, maxResults: number = 5): StoredConversation[] {
        console.log(`${DEBUG_PREFIX} Getting recent context from last ${hours} hours`);
        
        const cutoff = new Date();
        cutoff.setHours(cutoff.getHours() - hours);
        
        const recentConversations = conversationHistoryStore.getAllConversations()
            .filter(conv => new Date(conv.timestamp) >= cutoff)
            .slice(0, maxResults);

        console.log(`${DEBUG_PREFIX} Found ${recentConversations.length} recent conversations`);
        return recentConversations;
    }

    /**
     * Get conversations within a time range
     */
    private getConversationsInTimeRange(timeRange?: SearchQuery['timeRange']): StoredConversation[] {
        if (!timeRange) {
            return conversationHistoryStore.getAllConversations();
        }

        return conversationHistoryStore.getConversationsInRange(
            timeRange.start,
            timeRange.end
        );
    }

    /**
     * Filter conversations by tags
     */
    private filterByTags(conversations: StoredConversation[], tags: string[]): StoredConversation[] {
        return conversations.filter(conversation =>
            tags.some(tag => 
                conversation.tags.some(convTag => 
                    convTag.toLowerCase().includes(tag.toLowerCase())
                )
            )
        );
    }

    /**
     * Perform text search across conversation content
     */
    private performTextSearch(conversations: StoredConversation[], query: string): SearchResult[] {
        const results: SearchResult[] = [];
        const lowercaseQuery = query.toLowerCase();

        for (const conversation of conversations) {
            const matchedContent: string[] = [];
            const matchedFields: string[] = [];
            let bestSnippet = '';

            // Search in title
            if (conversation.title.toLowerCase().includes(lowercaseQuery)) {
                matchedContent.push(conversation.title);
                matchedFields.push('title');
                bestSnippet = conversation.title;
            }

            // Search in messages
            for (const message of conversation.messages) {
                if (message.content.toLowerCase().includes(lowercaseQuery)) {
                    matchedContent.push(message.content);
                    if (!matchedFields.includes('messages')) {
                        matchedFields.push('messages');
                    }
                    
                    // Create snippet around the match
                    if (!bestSnippet) {
                        const index = message.content.toLowerCase().indexOf(lowercaseQuery);
                        const start = Math.max(0, index - 50);
                        const end = Math.min(message.content.length, index + lowercaseQuery.length + 50);
                        bestSnippet = '...' + message.content.substring(start, end) + '...';
                    }
                }
            }

            // Search in tags
            const matchingTags = conversation.tags.filter(tag =>
                tag.toLowerCase().includes(lowercaseQuery)
            );
            if (matchingTags.length > 0) {
                matchedContent.push(...matchingTags);
                matchedFields.push('tags');
                if (!bestSnippet) {
                    bestSnippet = `Tags: ${matchingTags.join(', ')}`;
                }
            }

            // If we found matches, add to results
            if (matchedContent.length > 0) {
                results.push({
                    conversation,
                    relevanceScore: 0, // Will be calculated later
                    matchedContent,
                    matchedFields,
                    snippet: bestSnippet || conversation.title
                });
            }
        }

        return results;
    }

    /**
     * Apply relevance scoring to search results
     */
    private applyRelevanceScoring(results: SearchResult[], query: string): SearchResult[] {
        const queryWords = query.toLowerCase().split(/\s+/).filter(word => word.length > 2);

        return results.map(result => {
            let score = 0;
            const conversation = result.conversation;

            // Title matches are worth more
            if (result.matchedFields.includes('title')) {
                score += 3;
            }

            // Recent conversations get a boost
            const daysSinceCreation = (Date.now() - new Date(conversation.timestamp).getTime()) / (1000 * 60 * 60 * 24);
            const recencyBoost = Math.max(0, 1 - daysSinceCreation / 30); // Boost for conversations less than 30 days old
            score += recencyBoost;

            // More messages indicate more substantial conversations
            const messageCountBoost = Math.min(conversation.messages.length / 10, 1);
            score += messageCountBoost;

            // Tag matches
            if (result.matchedFields.includes('tags')) {
                score += 1;
            }

            // Word frequency scoring
            const allText = [
                conversation.title,
                ...conversation.messages.map(m => m.content),
                ...conversation.tags
            ].join(' ').toLowerCase();

            let wordMatchScore = 0;
            for (const word of queryWords) {
                const regex = new RegExp(word, 'gi');
                const matches = allText.match(regex);
                if (matches) {
                    wordMatchScore += matches.length * 0.1;
                }
            }
            score += wordMatchScore;

            return {
                ...result,
                relevanceScore: Math.round(score * 100) / 100 // Round to 2 decimal places
            };
        });
    }

    /**
     * Get search suggestions based on recent conversations and common patterns
     */
    getSearchSuggestions(): string[] {
        const recentConversations = this.getRecentContext(24 * 7, 20); // Last week
        const suggestions = new Set<string>();

        // Add common temporal queries
        suggestions.add('What did we discuss yesterday?');
        suggestions.add('Show me conversations from today');
        suggestions.add('What did I ask about 2 days ago?');

        // Add suggestions based on recent tags
        const recentTags = new Set<string>();
        recentConversations.forEach(conv => 
            conv.tags.forEach(tag => recentTags.add(tag))
        );

        Array.from(recentTags).slice(0, 5).forEach(tag => {
            suggestions.add(`Show me conversations about ${tag}`);
        });

        return Array.from(suggestions).slice(0, 8);
    }
}

// Create and export a singleton instance
export const contextSearchService = new ContextSearchService(); 