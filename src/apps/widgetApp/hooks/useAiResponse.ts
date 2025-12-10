import { useGlobalServices } from '@/services/GlobalServicesContextProvider';
import type { AiConversation, TriggerAiState, TriggerAiOptions } from '@/services/AiResponseService';

/**
 * Hook to access AI response state from AiResponsesService.
 * Provides similar interface to the legacy useHud() for conversation state.
 */
export function useAiResponse() {
    const { aiResponsesService, contextService } = useGlobalServices();

    return {
        // Conversation state (observable)
        conversation: aiResponsesService.conversation,
        triggerAiState: aiResponsesService.triggerAiState,

        // Actions
        triggerAi: (options: TriggerAiOptions) => aiResponsesService.triggerAi(options),
        clearConversation: aiResponsesService.clearConversation,

        // UI state
        clicked: aiResponsesService.clicked,
        setClickedAskAi: aiResponsesService.setClickedAskAi,
        setClickedClear: aiResponsesService.setClickedClear,
        setClickedHide: aiResponsesService.setClickedHide,
        isManualInputActive: aiResponsesService.isManualInputActive,
        setIsManualInputActive: aiResponsesService.setIsManualInputActive,
        useWebSearch: aiResponsesService.useWebSearch,
        setUseWebSearch: aiResponsesService.setUseWebSearch,
        ignoreCurrentConversation: aiResponsesService.ignoreCurrentConversation,
        revealCurrentConversation: aiResponsesService.revealCurrentConversation,

        // Context service access for audio state
        contextService,
        isInAudioSession: contextService.isInAudioSession,
    };
}

// Re-export types for convenience
export type { AiConversation, TriggerAiState, TriggerAiOptions };
