import React, { useState, useEffect, useCallback } from 'react';
import { observer } from 'mobx-react-lite';
import { motion, AnimatePresence } from 'framer-motion';
import { HelpCircle } from 'lucide-react';

// Hooks, Services, and Stores
import { useGlobalServices } from '../../services/GlobalServicesContextProvider';
import { useVimScrollUpShortcut, useVimScrollDownShortcut } from '../../hooks/useAiTriggers';
import { useGlobalShortcut } from '../../hooks/useGlobalShortcut';

// UI Components
import { UI } from '../ui';
import { Markdown } from '../ui/Markdown';
import { ScrollableArea } from '../ui/ScrollableArea';
import { RiseLoader } from 'react-spinners';
import { CopyButton, ResetButton } from '../ui/CopyButton';
import { ManualInputView } from './ManualInputView';

// Type definitions
interface AiResponse {
    id: string;
    state: {
        state: 'streaming' | 'finished' | 'error';
        text: string;
    };
    manualInput?: string;
}

interface AiConversation {
    responses: AiResponse[];
    latestResponse: AiResponse;
    state: {
        state: 'streaming' | 'finished' | 'error';
    };
}

interface ConversationViewProps {
    currentConversation: AiConversation;
    setBounceDirection: (direction: string | null) => void;
}

interface ResponseContentProps {
    response: AiResponse;
    toNextResponse: () => void;
    toPrevResponse: () => void;
}

interface ManualInputPromptProps {
    response: AiResponse;
}

// Constants
const ANIMATION_DURATION_MS = 250;

/**
 * A custom hook to manage the state and logic for navigating
 * between different responses within a single conversation.
 */
function useConversationNavigator(conversation: AiConversation) {
    const { aiResponsesService } = useGlobalServices();
    const isManualInputActive = aiResponsesService.isManualInputActive;

    const [responseIndex, setResponseIndex] = useState(0);
    const [transitionDirection, setTransitionDirection] = useState('to-next');
    const [bounceDirection, setBounceDirection] = useState<string | null>(null);

    // Filter out empty, non-manual "finished" responses to avoid showing blank screens.
    const filteredResponses = conversation.responses.filter(
        (res) => !(res.state.state === 'finished' && !res.manualInput && !res.state.text)
    );
    const responseCount = filteredResponses.length;

    const toNextResponse = useCallback(() => {
        if (isManualInputActive) return;
        if (responseIndex < responseCount - 1) {
            setResponseIndex(responseIndex + 1);
            setTransitionDirection('to-next');
        } else {
            // If at the end, trigger a "bounce" effect.
            setBounceDirection(bounceDirection ?? 'up');
        }
    }, [isManualInputActive, responseIndex, responseCount, bounceDirection]);

    const toPrevResponse = useCallback(() => {
        if (isManualInputActive) return;
        if (responseIndex > 0) {
            setResponseIndex(responseIndex - 1);
            setTransitionDirection('to-prev');
        } else {
            // If at the beginning, trigger a "bounce" effect.
            setBounceDirection(bounceDirection ?? 'down');
        }
    }, [isManualInputActive, responseIndex, bounceDirection]);

    // Effect to reset to the latest response when the conversation updates.
    useEffect(() => {
        if (responseCount > 0 || isManualInputActive) {
            setResponseIndex(responseCount - 1);
            setTransitionDirection('to-next');
        }
        setBounceDirection(null);
    }, [responseCount, isManualInputActive]);

    // Effect to clear the bounce animation state after it plays.
    useEffect(() => {
        if (bounceDirection) {
            const timer = setTimeout(() => setBounceDirection(null), ANIMATION_DURATION_MS);
            return () => clearTimeout(timer);
        }
    }, [bounceDirection]);

    return {
        curResponse: filteredResponses[responseIndex] ?? conversation.latestResponse,
        transitionDirection,
        bounceDirection,
        toNextResponse,
        toPrevResponse,
    };
}

/**
 * Renders the user's manual input as minimalistic text with a separator and copy button.
 */
const ManualInputPrompt = observer(({ response }: ManualInputPromptProps): React.ReactElement | null => {
    const { aiResponsesService } = useGlobalServices();
    
    if (!response.manualInput) return null;

    const handleReset = (): void => {
        aiResponsesService.clearCurrentConversation();
    };

    return React.createElement(
        'div',
        { 
            className: "relative p-4 pb-4 mb-4 border-b border-white/20",
        },
        // Action buttons (copy and reset)
        React.createElement(
            'div',
            { className: "absolute top-4 right-4 z-10 flex items-center gap-2" },
            React.createElement(ResetButton, { 
                onReset: handleReset,
                size: 14,
                className: "bg-black/30 hover:bg-black/50 text-white/70 hover:text-white rounded p-1 backdrop-blur-sm"
            }),
            React.createElement(CopyButton, { 
                content: response.manualInput,
                size: 14,
                className: "bg-black/30 hover:bg-black/50 text-white/70 hover:text-white rounded p-1 backdrop-blur-sm"
            })
        ),
        React.createElement(
            'div',
            { className: "flex items-start gap-3 pr-20" }, // Increased right padding for both buttons
            // Question icon
            React.createElement(HelpCircle, {
                size: 20,
                className: "text-blue-400 mt-0.5 flex-shrink-0"
            }),
            // Question text
            React.createElement(
                'div',
                { className: "text-white/90 text-base leading-relaxed" },
                response.manualInput
            )
        )
    );
});

/**
 * Renders the content of a single AI response in a scrollable area.
 */
const ResponseContent = observer(({ response, toNextResponse, toPrevResponse }: ResponseContentProps): React.ReactElement => {
    const scrollUpAccelerator = useVimScrollUpShortcut();
    const scrollDownAccelerator = useVimScrollDownShortcut();

    const content = response.state.state === 'error'
        ? React.createElement(Markdown, null, `*Error generating response — please try again.*`)
        : React.createElement(Markdown, null, response.state.text);

    const responseText = response.state.state === 'error' 
        ? 'Error generating response — please try again.' 
        : response.state.text;

    return React.createElement(
        'div',
        { className: "relative h-full" },
        // Copy button for the response
        React.createElement(
            'div',
            { className: "absolute top-2 right-2 z-10" },
            React.createElement(CopyButton, { 
                content: responseText,
                size: 16,
                className: "bg-black/30 hover:bg-black/50 text-white/70 hover:text-white rounded p-1.5 backdrop-blur-sm"
            })
        ),
        React.createElement(
            ScrollableArea,
            {
                maxHeight: 600,
                scrollDownAccelerator,
                scrollUpAccelerator,
                onScrollPastBottom: toNextResponse,
                onScrollPastTop: toPrevResponse,
                className: "pr-14 h-full custom-scrollbar", // Increased right padding to avoid copy button overlap
                children: content
            }
        )
    );
});

/**
 * The main view for displaying an active AI conversation.
 * It handles the animated transitions between different responses and loading states.
 */
export const ConversationView = observer(({ currentConversation, setBounceDirection }: ConversationViewProps): React.ReactElement => {
    const { aiResponsesService } = useGlobalServices();
    const { curResponse, transitionDirection, bounceDirection, toNextResponse, toPrevResponse } = useConversationNavigator(currentConversation);

    // Handle global shortcut for resetting chat (Ctrl+R)
    const handleResetChat = useCallback(() => {
        aiResponsesService.clearCurrentConversation();
    }, [aiResponsesService]);

    useGlobalShortcut('CommandOrControl+R', handleResetChat);

    // Propagate the bounce effect up to the parent window.
    useEffect(() => {
        setBounceDirection(bounceDirection);
    }, [bounceDirection, setBounceDirection]);

    const isStreaming = currentConversation.state.state === 'streaming';
    const showLoadingSpinner = isStreaming && !curResponse.state.text;

    return React.createElement(
        'div',
        { className: "flex flex-col h-full" },
        
        // User's question (if any)
        React.createElement(ManualInputPrompt, { response: curResponse }),

        // AI Response content
        React.createElement(
            'div',
            { className: "flex-1 min-h-0" }, // min-h-0 allows flex child to shrink
            React.createElement(
                AnimatePresence,
                { mode: "popLayout" },
                showLoadingSpinner ? React.createElement(
                    motion.div,
                    {
                        key: "loading",
                        initial: { opacity: 0 },
                        animate: { opacity: 1 },
                        exit: { opacity: 0 },
                        layout: true,
                        transition: { ease: "easeOut", duration: 0.15 },
                        className: "flex items-center justify-center h-full"
                    },
                    React.createElement(RiseLoader
                        , { color: 'white', size: 5 })
                ) : React.createElement(
                    motion.div,
                    {
                        key: curResponse.id,
                        initial: { opacity: 0, y: transitionDirection === 'to-next' ? '100%' : '-100%' },
                        animate: { opacity: 1, y: 0 },
                        exit: { opacity: 0 },
                        layout: true,
                        transition: { ease: "easeOut", duration: 0.15 },
                        className: "h-full"
                    },
                    React.createElement(ResponseContent, {
                        response: curResponse,
                        toNextResponse,
                        toPrevResponse
                    })
                )
            )
        ),

        // Footer or manual input view
        aiResponsesService.isManualInputActive ? React.createElement(ManualInputView, {
            className: "mt-2 border-t-1 border-white/30"
        }) : React.createElement(UI.WindowFooter)
    );
}); 