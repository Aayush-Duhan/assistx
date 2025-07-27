import { makeObservable, observable, computed, runInAction, reaction } from 'mobx';
import { aiApiService } from './AiApiService';
import { ContextService } from './ContextService';
import { LiveInsights, LiveInsightsSummary, LiveInsightsAction, AudioTranscription } from '../types';

/**
 * Service for generating live insights from transcriptions using AI
 */
export class LiveInsightsService {
    // Current insights state
    insights: LiveInsights | null = null;
    isGenerating = false;
    error: string | null = null;
    
    // Dependencies
    private contextService: ContextService;
    private lastProcessedCount = 0;
    private updateTimeoutId: NodeJS.Timeout | null = null;
    private reactionDisposer: (() => void) | null = null;

    constructor(contextService: ContextService) {
        this.contextService = contextService;
        
        makeObservable(this, {
            insights: observable,
            isGenerating: observable,
            error: observable,
            hasInsights: computed,
        });

        // Start monitoring transcriptions for updates
        this.startMonitoring();
    }

    get hasInsights(): boolean {
        return this.insights !== null;
    }

    /**
     * Start monitoring transcriptions and generate insights when new ones arrive
     */
    private startMonitoring(): void {
        console.log('LiveInsightsService: Starting monitoring for transcriptions');
        
        // Use MobX reaction for more reliable monitoring
        this.reactionDisposer = reaction(
            () => this.contextService.fullContext.audioTranscriptions.length,
            (transcriptionCount) => {
                console.log(`LiveInsightsService: Transcription count changed to ${transcriptionCount}, lastProcessed: ${this.lastProcessedCount}`);
                
                // Only generate insights if we have enough new transcriptions
                if (transcriptionCount > this.lastProcessedCount && transcriptionCount >= 3) {
                    console.log('LiveInsightsService: Scheduling insight generation in 5 seconds');
                    
                    // Debounce updates - wait 5 seconds after last transcription
                    if (this.updateTimeoutId) {
                        clearTimeout(this.updateTimeoutId);
                    }
                    
                    this.updateTimeoutId = setTimeout(() => {
                        console.log('LiveInsightsService: Triggering insight generation');
                        this.generateInsights();
                    }, 5000);
                } else {
                    console.log(`LiveInsightsService: Not generating insights - transcriptionCount: ${transcriptionCount}, lastProcessed: ${this.lastProcessedCount}, threshold: 3`);
                }
            }
        );
    }

    /**
     * Generate insights from current transcriptions
     */
    async generateInsights(): Promise<void> {
        if (this.isGenerating) {
            console.log('LiveInsightsService: Already generating insights, skipping');
            return;
        }

        const transcriptions = this.contextService.fullContext.audioTranscriptions;
        if (transcriptions.length === 0) {
            console.log('LiveInsightsService: No transcriptions found, skipping');
            return;
        }

        console.log(`LiveInsightsService: Generating insights from ${transcriptions.length} transcriptions`);

        try {
            runInAction(() => {
                this.isGenerating = true;
                this.error = null;
            });

            const insights = await this.callAiForInsights(transcriptions);
            
            runInAction(() => {
                this.insights = insights;
                this.lastProcessedCount = transcriptions.length;
                this.isGenerating = false;
            });

            console.log('LiveInsightsService: Successfully generated insights');

        } catch (error) {
            console.error('LiveInsightsService: Error generating insights:', error);
            runInAction(() => {
                this.error = error instanceof Error ? error.message : 'Unknown error';
                this.isGenerating = false;
            });
        }
    }

    /**
     * Force regenerate insights regardless of debouncing
     */
    async forceRegenerateInsights(): Promise<void> {
        if (this.updateTimeoutId) {
            clearTimeout(this.updateTimeoutId);
            this.updateTimeoutId = null;
        }
        await this.generateInsights();
    }

    /**
     * Call AI service to generate insights from transcriptions
     */
    private async callAiForInsights(transcriptions: AudioTranscription[]): Promise<LiveInsights> {
        // Check if AI service is configured
        if (!aiApiService.isConfigured()) {
            throw new Error('AI service is not configured. Please check your API keys.');
        }

        const conversationText = transcriptions
            .map(t => t.contextAsText)
            .join('\n\n');

        console.log('LiveInsightsService: Conversation text to analyze:', conversationText);

        const prompt = `You are an AI assistant that analyzes live conversations and provides insights. Based on the following conversation transcript, provide:

1. A concise summary of key discussion points
2. 3-5 actionable questions that could help continue or deepen the conversation

Format your response as JSON with this exact structure:
{
  "summary": {
    "lines": [
      {"type": "heading", "text": "Summary"},
      {"type": "bullet", "text": "Key point 1", "indent": 0},
      {"type": "bullet", "text": "Key point 2", "indent": 0}
    ]
  },
  "actions": [
    {"id": "1", "text": "Can you elaborate on [specific topic]?", "useWebSearch": false},
    {"id": "2", "text": "What are the implications of [something discussed]?", "useWebSearch": false}
  ]
}

Conversation:
${conversationText}`;

        console.log('LiveInsightsService: Calling AI service for insights');

        const result = await aiApiService.streamResponse({
            messages: [
                {
                    role: 'system',
                    content: 'You are a helpful assistant that analyzes conversations and provides structured insights in JSON format.'
                },
                {
                    role: 'user',
                    content: prompt
                }
            ]
        });

        // Collect the full response
        let fullResponse = '';
        for await (const chunk of result.textStream) {
            fullResponse += chunk;
        }

        console.log('LiveInsightsService: AI response received:', fullResponse);

        // Parse the JSON response - handle markdown code blocks
        try {
            // Extract JSON from markdown code blocks if present
            let jsonContent = fullResponse.trim();
            
            // Check if response is wrapped in markdown code blocks
            if (jsonContent.startsWith('```json') && jsonContent.endsWith('```')) {
                // Remove the ```json and ``` markers
                jsonContent = jsonContent.slice(7, -3).trim();
            } else if (jsonContent.startsWith('```') && jsonContent.endsWith('```')) {
                // Handle generic code blocks
                jsonContent = jsonContent.slice(3, -3).trim();
            }
            
            console.log('LiveInsightsService: Extracted JSON content:', jsonContent);
            
            const parsed = JSON.parse(jsonContent);
            return {
                summary: parsed.summary,
                actions: parsed.actions,
                lastUpdated: new Date()
            };
        } catch (parseError) {
            console.error('LiveInsightsService: Failed to parse AI response:', fullResponse);
            throw new Error('Failed to parse AI insights response');
        }
    }

    /**
     * Clear current insights
     */
    clearInsights(): void {
        runInAction(() => {
            this.insights = null;
            this.lastProcessedCount = 0;
            this.error = null;
        });
    }

    /**
     * Dispose of the service and cleanup
     */
    dispose(): void {
        if (this.updateTimeoutId) {
            clearTimeout(this.updateTimeoutId);
            this.updateTimeoutId = null;
        }
        if (this.reactionDisposer) {
            this.reactionDisposer();
            this.reactionDisposer = null;
        }
    }
} 