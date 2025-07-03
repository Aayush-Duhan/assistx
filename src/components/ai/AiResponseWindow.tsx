import * as React from 'react';
import { useState } from 'react';
import { observer } from 'mobx-react-lite';
import { motion, AnimatePresence } from 'framer-motion';

// Hooks, Services, and Stores
import { useGlobalServices } from '../../services/GlobalServicesContextProvider';

// UI Components
import { MovableWindow } from '../windows/MovableWindow';
import { UI } from '../ui';
import { ConversationView } from './ConversationView';
import { ManualInputView } from './ManualInputView';

interface LoadingStateProps {
    title: string;
    showPulseAnimation?: boolean;
    onStop?: () => void;
}

/**
 * Displays the loading state with a title and optional pulse animation.
 */
const LoadingState = observer(({ title, showPulseAnimation = true, onStop }: LoadingStateProps): React.ReactElement => {
    return (
        <UI.WindowTitle>
            <div className="flex items-center justify-between w-full">
                <div className={showPulseAnimation ? "flex items-center gap-2 animate-[pulse_1.5s_ease-in-out_infinite]" : "flex items-center gap-2"}>
                    <div className="size-3.5 bg-white rounded-full -mt-[1px]" />
                    <AnimatePresence mode="popLayout">
                        <motion.p
                            key={title}
                            className="min-w-fit"
                            initial={{ opacity: 0, x: 20 }}
                            animate={{ opacity: 1, x: 0 }}
                            exit={{ opacity: 0, x: -20 }}
                        >
                            {title}
                        </motion.p>
                    </AnimatePresence>
                </div>
                {onStop && (
                    <motion.button
                        onClick={onStop}
                        className="text-red-400 hover:text-red-300 hover:bg-red-500/10 rounded p-1 transition-colors"
                        initial={{ opacity: 0, scale: 0.8 }}
                        animate={{ opacity: 1, scale: 1 }}
                        whileHover={{ scale: 1.1 }}
                        whileTap={{ scale: 0.9 }}
                    >
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <rect x="6" y="6" width="12" height="12" rx="2"></rect>
                        </svg>
                    </motion.button>
                )}
            </div>
        </UI.WindowTitle>
    );
});

/**
 * The main component that renders the AI response window.
 * It acts as a router to display the correct view based on the AI service state.
 */
export const AiResponseWindow = observer((): React.ReactElement => {
    const { aiResponsesService } = useGlobalServices();
    const { currentConversation } = aiResponsesService;
    const [bounceDirection, setBounceDirection] = useState<'up' | 'down' | null>(null);

    const isManualInputOnly = aiResponsesService.isManualInputActive && !currentConversation;

    // Create a wrapper function to match the expected type for ConversationView
    const handleSetBounceDirection = (direction: string | null) => {
        setBounceDirection(direction as 'up' | 'down' | null);
    };

    // Function to stop the current AI operation
    const handleStopAnalysis = () => {
        if (aiResponsesService.triggerAiState?.abortController) {
            aiResponsesService.triggerAiState.abortController.abort();
        }
        aiResponsesService.clearCurrentConversation();
    };

    return (
        <MovableWindow
            width={700}
            show={aiResponsesService.showMainAppAiContent}
            bounceDirection={bounceDirection}
            opaque={!isManualInputOnly}
            contentClassName="relative"
        >
            {aiResponsesService.isCapturingScreenshot ? (
                <LoadingState title="Analyzing screen..." onStop={handleStopAnalysis} />
            ) : aiResponsesService.isCommittingTranscriptions ? (
                <LoadingState title="Transcribing..." onStop={handleStopAnalysis} />
            ) : currentConversation ? (
                <ConversationView
                    currentConversation={currentConversation}
                    setBounceDirection={handleSetBounceDirection}
                />
            ) : aiResponsesService.isManualInputActive ? (
                <ManualInputView />
            ) : null}
        </MovableWindow>
    );
}); 