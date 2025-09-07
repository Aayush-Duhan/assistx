import React, { useState, useEffect, useCallback, Fragment } from 'react';
import { observer } from 'mobx-react-lite';
import { motion } from 'framer-motion';
import { useGlobalServices } from '../../services/GlobalServicesContextProvider';
import { useGlobalShortcut } from '../../hooks/useGlobalShortcut';
import { WindowFooter } from '../ui/WindowFooter';
import { ScrollableContent } from '../ui/ScrollableContent';

import { ManualInputView } from './ManualInputView';
import { AIResponseHeader } from './AiResponseHeader';
import { isClearingAtom, isCopyingAtom } from '@/state/atoms';
import { useAtomValue } from 'jotai';
import { AiResponse } from './AiResponse';
import { HeadlessButton } from '../ui/HeadlessButton';
import { Tooltip } from '../ui/Tooltip';
import { Check, Copy } from 'lucide-react';
import { PulseLoader } from 'react-spinners';
import { Markdown } from './Markdown';


interface AiConversation {
    responses: AiResponse[];
    latestResponse: AiResponse;
    state: {
        state: 'streaming' | 'finished' | 'error';
    };
}

const ANIMATION_DURATION_MS = 250;

function useConversationNavigator(conversation: AiConversation) {
    const { aiResponsesService } = useGlobalServices();
    const isManualInputActive = aiResponsesService.isManualInputActive;

    const [responseIndex, setResponseIndex] = useState(0);
    const [transitionDirection, setTransitionDirection] = useState('to-next');
    const [bounceDirection, setBounceDirection] = useState<string | null>(null);

    const filteredResponses = conversation.responses.filter(
        (res) => !(res.state.state === 'finished' && !res.input.manualInput && !res.state.text)
    );
    const responseCount = filteredResponses.length;

    const toNextResponse = useCallback(() => {
        if (isManualInputActive) return;
        if (responseIndex < responseCount - 1) {
            setResponseIndex(responseIndex + 1);
            setTransitionDirection('to-next');
        } else {
            setBounceDirection(bounceDirection ?? 'up');
        }
    }, [isManualInputActive, responseIndex, responseCount, bounceDirection]);

    const toPrevResponse = useCallback(() => {
        if (isManualInputActive) return;
        if (responseIndex > 0) {
            setResponseIndex(responseIndex - 1);
            setTransitionDirection('to-prev');
        } else {
            setBounceDirection(bounceDirection ?? 'down');
        }
    }, [isManualInputActive, responseIndex, bounceDirection]);

    useEffect(() => {
        if (responseCount > 0 || isManualInputActive) {
            setResponseIndex(responseCount - 1);
            setTransitionDirection('to-next');
        }
        setBounceDirection(null);
    }, [responseCount, isManualInputActive]);

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

export const ConversationView = observer(({ setBounceDirection, currentConversation }: { setBounceDirection: (dir: 'up' | 'down' | null) => void; currentConversation: AiConversation }) => {
    const { aiResponsesService } = useGlobalServices();
    const { curResponse, bounceDirection } = useConversationNavigator(currentConversation);
    const isClearing = useAtomValue(isClearingAtom);
    const isCopyingConversation = useAtomValue(isCopyingAtom);
    const handleResetChat = useCallback(() => {
        aiResponsesService.clearCurrentConversation();
    }, [aiResponsesService]);

    useGlobalShortcut('CommandOrControl+R', handleResetChat);

    // Propagate the bounce effect up to the parent window
    useEffect(() => {
        setBounceDirection(bounceDirection as 'up' | 'down' | null);
    }, [bounceDirection, setBounceDirection]);
    const allResponses = currentConversation?.responses ?? [];
    const { content: titleContent, key: titleKey } = useConversationTitle(currentConversation);
    const isFinished = !!currentConversation && currentConversation.state.state !== "streaming";

    const handleTellMeMoreClick = () => {
        aiResponsesService.triggerAi({
            shouldCaptureScreenshot: false,
            displayInput: "Tell me more",
            manualInput: currentConversation?.latestResponse?.input?.manualInput
                ? `Tell me more about this: ${currentConversation.latestResponse.input.manualInput}`
                : undefined,
            metadata: { doSmartMode: true },
        });
    }
    return (
        <>
            <AIResponseHeader
                title={titleContent}
                titleKey={titleKey}
                showPulseAnimation={curResponse.state.state === 'streaming' && !isCopyingConversation && !isClearing}
            />
            {curResponse &&
                <ScrollableContent
                    maxHeight={400}
                    enableSnapToBottom={true}
                    snapToBottomKey={allResponses.length}
                    scrollDownAccelerator={"CommandOrControl+Down"}
                    scrollUpAccelerator={"CommandOrControl+Up"}
                    className="px-5 space-y-2 -mt-6"
                    showBottomActions={isFinished}
                    bottomActions={
                        <div className="flex items-center gap-2">
                            <TellMeMoreButton onClick={handleTellMeMoreClick}>
                                Tell me more
                            </TellMeMoreButton>

                            {/* Response actions component */}
                            <CopyResponseButton response={currentConversation.latestResponse} />
                        </div>
                    }
                >
                    {allResponses.map((response) => (
                        <Fragment key={response.id}>
                            {/* User message */}
                            <UserMessage response={response} />

                            {/* AI response with pro upgrade option */}
                            <AiResponseMessage
                                response={response}
                            />
                        </Fragment>
                    ))}
                </ScrollableContent>
            }
            {/* <AnimatePresence mode="popLayout">
                {isStreamingWithoutText ? (
                    <motion.div
                        key="streaming-loader"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        layout
                        transition={{ ease: 'easeOut', duration: 0.15 }}
                    >
                        <StreamingLoader toNextResponse={toNextResponse} toPrevResponse={toPrevResponse} />
                    </motion.div>
                ) : (
                    <motion.div
                        key={curResponse.id}
                        initial={{ opacity: 0, y: transitionDirection === 'to-next' ? '100%' : '-100%' }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0 }}
                        transition={{ ease: 'easeOut', duration: 0.15 }}
                    >
                        <ResponseContent
                            response={curResponse}
                            toNextResponse={toNextResponse}
                            toPrevResponse={toPrevResponse}
                        />
                    </motion.div>
                )}
            </AnimatePresence> */}
            {aiResponsesService.isManualInputActive ? (
                <ManualInputView className="mt-2 border-t-1 border-white/30" />
            ) : (
                <WindowFooter />
            )}
        </>
    );
});

const AiResponseMessage = observer(({ response }: { response: AiResponse }) => {
    const { state } = response;

    // Handle error state with different messages based on error type
    if (state.state === 'error') {
        return (
            <motion.div
                className="w-fit max-w-96 ml-auto px-3 py-2 rounded-2xl bg-red-400/60 text-white text-[13px] whitespace-pre-wrap break-words"
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ type: "spring", stiffness: 500, damping: 30 }}
            >
                <Markdown hideCopyButton>
                    {state.reason === "network"
                        ? "Connection failed. If the problem persists, please check your internet connection or VPN."
                        : "Response generation failed. Please try again momentarily. If the problem persists, please contact support."
                    }
                </Markdown>
            </motion.div>
        );
    }

    // Handle streaming state
    if (state.state === 'streaming' && !state.text) {
        return (
            <>
                <PulseLoader size={6} color="white" className="opacity-90" />
            </>
        );
    }

    // Handle finished state
    return (
        <>
            <div>
                <Markdown onBulletClick={() => { }}>
                    {state.text}
                </Markdown>
                <div className='h-10'></div>
            </div>
        </>
    );
});

function useConversationTitle(
    conversation: AiConversation | null
): {
    content: string;
    key: string;
    pulse?: boolean;
} {
    const { aiResponsesService } = useGlobalServices();
    if (aiResponsesService.isCapturingScreenshot) {
        return {
            content: "Analyzing screen...",
            key: "analyzing"
        };
    }
    if (aiResponsesService.isCommittingTranscriptions) {
        return {
            content: "Transcribing...",
            key: "transcribing"
        };
    }
    if (conversation?.state.state === "error") {
        return {
            content: "Error",
            key: "error"
        };
    }
    let streamingTitle = "Thinking...";
    let finishedTitle = "AI Response";

    if (conversation?.state.state === "streaming") {
        return {
            content: streamingTitle,
            key: "streaming",
            pulse: true
        };
    }

    return {
        content: finishedTitle,
        key: "finished"
    };
}

function UserMessage({ response }: { response: AiResponse }) {
    // Get the display text, with fallback for empty inputs
    const displayText = response.input.displayInput || "💡 Give me assistance";

    return (
        <motion.div
            className="w-fit max-w-96 ml-auto px-3 py-1 rounded-2xl bg-sky-400/60 text-white text-[13px] whitespace-pre-wrap break-words"
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ type: "spring", stiffness: 500, damping: 30 }}
        >
            {displayText}
        </motion.div>
    );
}

function TellMeMoreButton({ onClick, children }: { onClick: () => void; children: React.ReactNode }) {
    return (
        <HeadlessButton
            className="text-[11px] text-white/90 block px-3 h-8 rounded-lg bg-black/45 hover:bg-black/30 active:bg-black/20 transition"
            onClick={onClick}
        >
            {children}
        </HeadlessButton>
    );
}

function CopyResponseButton({ response }: { response: AiResponse }) {
    const [showSuccessIndicator, setShowSuccessIndicator] = useState(false);
    useEffect(() => {
        if (showSuccessIndicator) {
            const timeoutId = setTimeout(() => {
                setShowSuccessIndicator(false);
            }, 2000);

            // Cleanup timeout on unmount or when showSuccessIndicator changes
            return () => clearTimeout(timeoutId);
        }
    }, [showSuccessIndicator]);
    if (response.state.state === "error") {
        return null;
    }
    const responseText = response.state.text;
    const handleCopyToClipboard = () => {
        navigator.clipboard.writeText(responseText);
        setShowSuccessIndicator(true);
    };
    return (
        <Tooltip tooltipContent="Copy Conversation" position="right">
            <HeadlessButton
                onClick={handleCopyToClipboard}
            >
                {showSuccessIndicator ? (
                    <Check size={14} />
                ) : (
                    <Copy size={14} />
                )}
            </HeadlessButton>
        </Tooltip>
    );
}