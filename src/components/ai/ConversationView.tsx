import React, { useState, useEffect, useCallback } from 'react';
import { observer } from 'mobx-react-lite';
import { motion, AnimatePresence } from 'framer-motion';
import { useGlobalServices } from '../../services/GlobalServicesContextProvider';
import { useVimScrollUpShortcut, useVimScrollDownShortcut } from '../../hooks/useAiTriggers';
import { useGlobalShortcut } from '../../hooks/useGlobalShortcut';
import { WindowFooter } from '../ui/WindowFooter';
import { Markdown } from './Markdown';
import { ScrollableContent } from '../ui/ScrollableContent';
import { PulseLoader } from 'react-spinners';
import { CopyButton, ResetButton } from '../ui/CopyButton';
import { ManualInputView } from './ManualInputView';
import { AIResponseHeader } from './AiResponseHeader';
import { isClearingAtom, isCopyingAtom } from '@/state/atoms';
import { useAtomValue } from 'jotai';
import { APP_NAME } from '@/lib/constants';
import { AiResponse } from './AiResponse';
import { useHotkeys } from 'react-hotkeys-hook';


interface AiConversation {
    responses: AiResponse[];
    latestResponse: AiResponse;
    state: {
        state: 'streaming' | 'finished' | 'error';
    };
}

interface ResponseContentProps {
    response: AiResponse;
    toNextResponse: () => void;
    toPrevResponse: () => void;
}

interface ManualInputPromptProps {
    response: AiResponse;
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

const ManualInputPrompt = observer(({ response }: ManualInputPromptProps): React.ReactElement | null => {
    const { aiResponsesService } = useGlobalServices();

    if (!response.input.manualInput) return null;

    const handleReset = (): void => {
        aiResponsesService.clearCurrentConversation();
    };

    return (
        <div className="relative p-4 pb-4 mb-4 border-b border-white/20">
          <div className="absolute top-4 right-4 z-10 flex items-center gap-2">
            <ResetButton
              onReset={handleReset}
              size={14}
              className="bg-black/30 hover:bg-black/50 text-white/70 hover:text-white rounded p-1 backdrop-blur-sm"
            />
            <CopyButton
              content={response.input.manualInput}
              size="md"
              className="bg-black/30 hover:bg-black/50 text-white/70 hover:text-white rounded p-1 backdrop-blur-sm"
            />
          </div>
      
          <div className="flex items-start pr-20">
            <div className="text-white/90 text-base leading-relaxed">
              {response.input.manualInput}
            </div>
          </div>
        </div>
      );      
});

const ResponseContent = observer(({ response, toNextResponse, toPrevResponse }: ResponseContentProps): React.ReactElement => {
    const scrollUpAccelerator = useVimScrollUpShortcut();
    const scrollDownAccelerator = useVimScrollDownShortcut();

    const content = response.state.state === 'error'
        ? React.createElement(Markdown, null, `*Error generating response — please try again.*`)
        : React.createElement(Markdown, null, response.state.text);

    const responseText = response.state.state === 'error'
        ? 'Error generating response — please try again.'
        : response.state.text;

        return (
            <div className="relative h-full">
              <div className="absolute top-2 right-2 z-10">
                <CopyButton
                  content={responseText}
                  size="md"
                  className="bg-black/30 hover:bg-black/50 text-white/70 hover:text-white rounded p-1.5 backdrop-blur-sm"
                />
              </div>
          
              <ScrollableContent
                maxHeight={600}
                scrollDownAccelerator={scrollDownAccelerator}
                scrollUpAccelerator={scrollUpAccelerator}
                onScrollPastBottom={toNextResponse}
                onScrollPastTop={toPrevResponse}
                className="pr-14 h-full custom-scrollbar"
              >
                {content}
              </ScrollableContent>
            </div>
          );
          
});

export const ConversationView = observer(({ setBounceDirection, currentConversation }: { setBounceDirection: (dir: 'up' | 'down' | null) => void; currentConversation: AiConversation }) => {
    const { aiResponsesService } = useGlobalServices();
    const { curResponse, transitionDirection, bounceDirection, toNextResponse, toPrevResponse } = useConversationNavigator(currentConversation);
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

    const getTitle = () => {
        if (isCopyingConversation) return { content: 'Copy AI Response', key: 'copy-conversation' };
        if (isClearing) return { content: 'Clear Response', key: 'clear' };
        if (curResponse.state.state === 'streaming') { return { content: 'Thinking...', key: 'streaming' }; }
        if (curResponse.state.state === 'error') return { content: 'Error', key: 'error' };
        return { content: APP_NAME, key: 'response' };
    };

    const { content: titleContent, key: titleKey } = getTitle();
    const isStreamingWithoutText = curResponse.state.state === 'streaming' && !curResponse.state.text;

    return (
        <><AIResponseHeader
            title={titleContent}
            titleKey={titleKey}
            showPulseAnimation={curResponse.state.state === 'streaming' && !isCopyingConversation && !isClearing}
            curResponse={curResponse}
        />
            <AnimatePresence mode="popLayout">
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
            </AnimatePresence>
            {aiResponsesService.isManualInputActive ? (
                <ManualInputView className="mt-2 border-t-1 border-white/30" />
            ) : (
                <>
                    <WindowFooter shortcuts={<ManualInputPrompt response={curResponse} />} />
                </>
            )}
        </>
    );
});

const StreamingLoader = ({ toNextResponse, toPrevResponse }: { toNextResponse: () => void; toPrevResponse: () => void }) => {
    const scrollDownAccelerator = "CommandOrControl+Down";
    const scrollUpAccelerator = "CommandOrControl+Up";
  
    useHotkeys(scrollDownAccelerator, () => {
      toNextResponse();
    });
    useHotkeys(scrollUpAccelerator, () => {
      toPrevResponse();
    });
  
    return <PulseLoader size={6} color="white" className="px-4 opacity-90" />;
  };