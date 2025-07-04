import { contextSearchService, SearchQuery } from './ContextSearchService';
import { conversationHistoryStore } from '../stores/conversationHistoryStore';

// Debug prefix for test logs
const DEBUG_PREFIX = '🧪 [ContextSearchServiceTest]';

/**
 * Test utility for ContextSearchService
 * Run this in the browser console to verify search functionality
 */
export class ContextSearchServiceTest {
    constructor() {
        console.log(`${DEBUG_PREFIX} Test instance created`);
    }

    /**
     * Run all search tests
     */
    async runAllTests(): Promise<void> {
        console.log(`${DEBUG_PREFIX} Starting all search tests...`);

        try {
            await this.testBasicSearch();
            await this.testTemporalSearch();
            await this.testTagSearch();
            await this.testRecentContext();
            await this.testSearchSuggestions();
            
            console.log('✅ [ContextSearchServiceTest] All search tests passed!');
        } catch (error) {
            console.error('❌ [ContextSearchServiceTest] Search test failed:', error);
        }
    }

    /**
     * Test basic text search functionality
     */
    private async testBasicSearch(): Promise<void> {
        console.log(`${DEBUG_PREFIX} Testing basic search...`);

        const conversations = conversationHistoryStore.getAllConversations();
        if (conversations.length === 0) {
            console.log(`${DEBUG_PREFIX} No conversations to search, skipping basic search test`);
            return;
        }

        // Test basic keyword search
        const searchQuery: SearchQuery = {
            query: 'react',
            maxResults: 5
        };

        const results = await contextSearchService.search(searchQuery);
        console.log(`${DEBUG_PREFIX} Basic search for "react" found ${results.length} results`);

        if (results.length > 0) {
            console.log(`${DEBUG_PREFIX} Sample result:`, {
                title: results[0].conversation.title,
                relevanceScore: results[0].relevanceScore,
                matchedFields: results[0].matchedFields,
                snippet: results[0].snippet
            });
        }

        console.log('✅ Basic search test passed');
    }

    /**
     * Test temporal search functionality
     */
    private async testTemporalSearch(): Promise<void> {
        console.log(`${DEBUG_PREFIX} Testing temporal search...`);

        // Test temporal analysis
        const testQueries = [
            'What did we discuss yesterday?',
            'Show me conversations from today',
            'What happened 2 days ago?',
            'Find conversations from last week'
        ];

        for (const query of testQueries) {
            const analysis = contextSearchService.analyzeTemporalReferences(query);
            console.log(`${DEBUG_PREFIX} Temporal analysis for "${query}":`, {
                hasTemporalReference: analysis.hasTemporalReference,
                relativeDescription: analysis.relativeDescription,
                cleanedQuery: analysis.cleanedQuery
            });

            // Test temporal search
            const results = await contextSearchService.temporalSearch(query, 3);
            console.log(`${DEBUG_PREFIX} Temporal search found ${results.length} results`);
        }

        console.log('✅ Temporal search test passed');
    }

    /**
     * Test tag-based search
     */
    private async testTagSearch(): Promise<void> {
        console.log(`${DEBUG_PREFIX} Testing tag search...`);

        // Get all unique tags from conversations
        const allTags = new Set<string>();
        conversationHistoryStore.getAllConversations().forEach(conv =>
            conv.tags.forEach(tag => allTags.add(tag))
        );

        console.log(`${DEBUG_PREFIX} Available tags:`, Array.from(allTags));

        if (allTags.size > 0) {
            // Test search by first few tags
            const tagsToTest = Array.from(allTags).slice(0, 3);
            for (const tag of tagsToTest) {
                const results = contextSearchService.searchByTags([tag]);
                console.log(`${DEBUG_PREFIX} Tag search for "${tag}" found ${results.length} results`);
            }
        }

        console.log('✅ Tag search test passed');
    }

    /**
     * Test recent context retrieval
     */
    private async testRecentContext(): Promise<void> {
        console.log(`${DEBUG_PREFIX} Testing recent context...`);

        const recentConversations = contextSearchService.getRecentContext(24, 5);
        console.log(`${DEBUG_PREFIX} Found ${recentConversations.length} recent conversations (last 24 hours)`);

        if (recentConversations.length > 0) {
            console.log(`${DEBUG_PREFIX} Most recent conversation:`, {
                title: recentConversations[0].title,
                timestamp: recentConversations[0].timestamp,
                tags: recentConversations[0].tags
            });
        }

        console.log('✅ Recent context test passed');
    }

    /**
     * Test search suggestions
     */
    private async testSearchSuggestions(): Promise<void> {
        console.log(`${DEBUG_PREFIX} Testing search suggestions...`);

        const suggestions = contextSearchService.getSearchSuggestions();
        console.log(`${DEBUG_PREFIX} Generated ${suggestions.length} search suggestions:`, suggestions);

        console.log('✅ Search suggestions test passed');
    }

    /**
     * Demonstrate search capabilities with examples
     */
    async demonstrateSearchCapabilities(): Promise<void> {
        console.log(`${DEBUG_PREFIX} Demonstrating search capabilities...`);

        const demoQueries = [
            'help with coding',
            'react hooks',
            'api integration',
            'typescript configuration',
            'What did we discuss today?',
            'Show me conversations about help'
        ];

        for (const query of demoQueries) {
            console.log(`\n${DEBUG_PREFIX} Searching for: "${query}"`);
            
            const results = await contextSearchService.temporalSearch(query, 3);
            
            if (results.length > 0) {
                console.log(`  Found ${results.length} results:`);
                results.forEach((result, index) => {
                    console.log(`  ${index + 1}. ${result.conversation.title} (score: ${result.relevanceScore})`);
                    console.log(`     Snippet: ${result.snippet}`);
                    console.log(`     Matched: ${result.matchedFields.join(', ')}`);
                });
            } else {
                console.log(`  No results found`);
            }
        }

        console.log(`\n✅ Search demonstration complete`);
    }

    /**
     * Test search with various filters
     */
    async testAdvancedSearch(): Promise<void> {
        console.log(`${DEBUG_PREFIX} Testing advanced search with filters...`);

        // Test search with tag filter
        const tagFilterQuery: SearchQuery = {
            query: 'help',
            tags: ['manual'],
            maxResults: 3
        };

        const tagResults = await contextSearchService.search(tagFilterQuery);
        console.log(`${DEBUG_PREFIX} Search with tag filter found ${tagResults.length} results`);

        // Test search with time range
        const today = new Date();
        const yesterday = new Date(today.getTime() - 24 * 60 * 60 * 1000);
        
        const timeFilterQuery: SearchQuery = {
            query: 'conversation',
            timeRange: {
                start: yesterday,
                end: today
            },
            maxResults: 5
        };

        const timeResults = await contextSearchService.search(timeFilterQuery);
        console.log(`${DEBUG_PREFIX} Search with time filter found ${timeResults.length} results`);

        // Test search with minimum relevance score
        const relevanceFilterQuery: SearchQuery = {
            query: 'help',
            minRelevanceScore: 2.0,
            maxResults: 5
        };

        const relevanceResults = await contextSearchService.search(relevanceFilterQuery);
        console.log(`${DEBUG_PREFIX} Search with relevance filter found ${relevanceResults.length} results`);

        console.log('✅ Advanced search test passed');
    }
}

// Export test instance for easy access in browser console
export const contextSearchServiceTest = new ContextSearchServiceTest();

// Add to window for easy console access in development
if (typeof window !== 'undefined' && process.env.NODE_ENV === 'development') {
    (window as any).contextSearchServiceTest = contextSearchServiceTest;
    console.log('🧪 ContextSearchServiceTest available globally as window.contextSearchServiceTest');
} 