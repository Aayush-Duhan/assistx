import { ConversationHistoryStore, StoredConversation, conversationHistoryStore } from './conversationHistoryStore';

/**
 * Simple test utility for ConversationHistoryStore
 * Run this in the browser console to verify store functionality
 */
export class ConversationHistoryStoreTest {
    private store: ConversationHistoryStore;
    private testDataPrefix = 'TEST_';

    constructor() {
        this.store = conversationHistoryStore; // Use the global singleton instead
        console.log('🧪 [ConversationHistoryStoreTest] Test instance created using global store');
    }

    /**
     * Create a sample conversation for testing
     */
    private createSampleConversation(id: string, title: string, timestamp?: Date): StoredConversation {
        return {
            id: `${this.testDataPrefix}${id}`,
            timestamp: timestamp || new Date(),
            title,
            messages: [
                {
                    role: 'system',
                    content: 'You are a helpful AI assistant.',
                },
                {
                    role: 'user',
                    content: `Test message for ${title}`,
                },
                {
                    role: 'assistant',
                    content: `This is a test response for ${title}. Testing the conversation storage system.`,
                }
            ],
            context: {
                userContext: 'Test user context',
                audioTranscriptions: [
                    {
                        createdAt: new Date(),
                        source: 'mic' as const,
                        text: 'Test transcription text'
                    }
                ]
            },
            tags: ['test', 'demo'],
            responseCount: 1,
            lastActivity: new Date(),
            summary: `Summary for ${title}`
        };
    }

    /**
     * Run all tests
     */
    async runAllTests(): Promise<void> {
        console.log('🧪 [ConversationHistoryStoreTest] Starting all tests...');
        
        try {
            // Clear any existing test data
            this.cleanupTestData();
            
            // Run individual tests
            await this.testBasicOperations();
            await this.testSearchFunctionality();
            await this.testDateRangeOperations();
            await this.testStorageStats();
            
            console.log('✅ [ConversationHistoryStoreTest] All tests passed!');
        } catch (error) {
            console.error('❌ [ConversationHistoryStoreTest] Test failed:', error);
        } finally {
            // Cleanup test data
            this.cleanupTestData();
        }
    }

    /**
     * Test basic CRUD operations
     */
    private async testBasicOperations(): Promise<void> {
        console.log('🧪 Testing basic operations...');
        
        const initialCount = this.store.getAllConversations().length;
        
        // Test adding conversation
        const conv1 = this.createSampleConversation('001', 'Test Conversation 1');
        this.store.addConversation(conv1);
        
        const afterAdd = this.store.getAllConversations();
        console.assert(afterAdd.length === initialCount + 1, 'Conversation should be added');
        
        // Test updating conversation
        this.store.updateConversation(conv1.id, { title: 'Updated Test Conversation 1' });
        const updatedConv = afterAdd.find(c => c.id === conv1.id);
        console.assert(updatedConv?.title === 'Updated Test Conversation 1', 'Conversation should be updated');
        
        // Test deleting conversation
        this.store.deleteConversation(conv1.id);
        const afterDelete = this.store.getAllConversations();
        console.assert(afterDelete.length === initialCount, 'Conversation should be deleted');
        
        console.log('✅ Basic operations test passed');
    }

    /**
     * Test search functionality
     */
    private async testSearchFunctionality(): Promise<void> {
        console.log('🧪 Testing search functionality...');
        
        // Add test conversations
        const conv1 = this.createSampleConversation('search1', 'JavaScript Tutorial');
        const conv2 = this.createSampleConversation('search2', 'Python Basics');
        
        this.store.addConversation(conv1);
        this.store.addConversation(conv2);
        
        // Test search
        const jsResults = this.store.searchConversations('JavaScript');
        console.assert(jsResults.length >= 1, 'Should find JavaScript conversation');
        console.assert(jsResults[0].title.includes('JavaScript'), 'Should match JavaScript title');
        
        const pythonResults = this.store.searchConversations('Python');
        console.assert(pythonResults.length >= 1, 'Should find Python conversation');
        
        console.log('✅ Search functionality test passed');
    }

    /**
     * Test date range operations
     */
    private async testDateRangeOperations(): Promise<void> {
        console.log('🧪 Testing date range operations...');
        
        const today = new Date();
        const yesterday = new Date(today.getTime() - 24 * 60 * 60 * 1000);
        const tomorrow = new Date(today.getTime() + 24 * 60 * 60 * 1000);
        
        // Add conversations with different dates
        const todayConv = this.createSampleConversation('date1', 'Today Conversation', today);
        const yesterdayConv = this.createSampleConversation('date2', 'Yesterday Conversation', yesterday);
        
        this.store.addConversation(todayConv);
        this.store.addConversation(yesterdayConv);
        
        // Test date range filtering
        const todayResults = this.store.getConversationsForDate(today);
        console.assert(todayResults.some(c => c.id === todayConv.id), 'Should find today conversation');
        
        const yesterdayResults = this.store.getConversationsForDate(yesterday);
        console.assert(yesterdayResults.some(c => c.id === yesterdayConv.id), 'Should find yesterday conversation');
        
        const rangeResults = this.store.getConversationsInRange(yesterday, tomorrow);
        console.assert(rangeResults.length >= 2, 'Should find conversations in range');
        
        console.log('✅ Date range operations test passed');
    }

    /**
     * Test storage statistics
     */
    private async testStorageStats(): Promise<void> {
        console.log('🧪 Testing storage statistics...');
        
        const stats = this.store.getStorageStats();
        console.assert(typeof stats.totalConversations === 'number', 'Should have total conversations count');
        console.assert(typeof stats.totalMessages === 'number', 'Should have total messages count');
        console.assert(typeof stats.estimatedSizeKB === 'number', 'Should have estimated size');
        
        console.log('📊 Storage stats:', stats);
        console.log('✅ Storage statistics test passed');
    }

    /**
     * Clean up test data
     */
    private cleanupTestData(): void {
        console.log('🧹 Cleaning up test data...');
        
        const allConversations = this.store.getAllConversations();
        const testConversations = allConversations.filter(c => c.id.startsWith(this.testDataPrefix));
        
        testConversations.forEach(conv => {
            this.store.deleteConversation(conv.id);
        });
        
        console.log(`🧹 Cleaned up ${testConversations.length} test conversations`);
    }

    /**
     * Add some realistic demo data for development
     */
    addDemoData(): void {
        console.log('🎭 Adding demo data...');
        
        const demoConversations = [
            {
                title: 'React Hooks Questions',
                messages: [
                    { role: 'user' as const, content: 'How do I use useEffect with dependencies?' },
                    { role: 'assistant' as const, content: 'useEffect with dependencies allows you to control when the effect runs...' }
                ]
            },
            {
                title: 'API Integration Help',
                messages: [
                    { role: 'user' as const, content: 'I need help integrating a REST API' },
                    { role: 'assistant' as const, content: 'Here are the best practices for REST API integration...' }
                ]
            },
            {
                title: 'TypeScript Configuration',
                messages: [
                    { role: 'user' as const, content: 'How do I configure TypeScript for my project?' },
                    { role: 'assistant' as const, content: 'Let me help you set up TypeScript with the proper configuration...' }
                ]
            }
        ];
        
        demoConversations.forEach((demo, index) => {
            const conversation = this.createSampleConversation(
                `demo_${index}`,
                demo.title,
                new Date(Date.now() - index * 60 * 60 * 1000) // Spread over hours
            );
            conversation.messages = [
                { role: 'system', content: 'You are a helpful AI assistant.' },
                ...demo.messages
            ];
            this.store.addConversation(conversation);
        });
        
        console.log('🎭 Demo data added successfully');
    }
}

// Export test instance for easy access in browser console
export const conversationHistoryStoreTest = new ConversationHistoryStoreTest();

// Add to window for easy console access in development
if (typeof window !== 'undefined' && process.env.NODE_ENV === 'development') {
    (window as any).conversationHistoryStoreTest = conversationHistoryStoreTest;
    console.log('🧪 ConversationHistoryStoreTest available globally as window.conversationHistoryStoreTest');
} 