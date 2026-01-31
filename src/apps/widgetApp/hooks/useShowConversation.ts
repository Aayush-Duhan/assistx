import { useAiResponse } from "./useAiResponse";

export function useShowConversation() {
  const { conversation, triggerAiState, ignoreCurrentConversation } = useAiResponse();

  const hasConversationContent =
    conversation.responses.length > 0 || conversation.pendingResponse !== null || !!triggerAiState;

  return hasConversationContent && !ignoreCurrentConversation;
}
