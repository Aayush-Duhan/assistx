import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { observer } from 'mobx-react-lite';

import { useGlobalServices } from '../../services/GlobalServicesContextProvider';
import { WindowTitle } from './WindowTitle';
import { ScrollableContent } from './ScrollableContent';
import { Shortcut } from './Shortcut';
import { CopyButton } from './CopyButton';
import { Lightbulb } from 'lucide-react';
import { useAtomValue, useSetAtom } from 'jotai';
import { isCopyingAtom } from '../../state/atoms';
import { APP_NAME } from '@/lib/constants';
import { WindowMessage } from './WindowMessage';
import { PulseLoader } from 'react-spinners';
import { TranscriptionEntry } from '@/services/ContextService';

interface TranscriptionViewProps {
  setMode: (mode: 'live-insights' | 'transcription') => void;
}

export const TranscriptionView = observer(({ setMode }: TranscriptionViewProps) => {
  const { contextService } = useGlobalServices();
  const { fullContext } = contextService;
  const { paragraphTranscripts } = fullContext;
  const [isInitialRender, setIsInitialRender] = useState(true);
  const setIsCopying = useSetAtom(isCopyingAtom);
  const isCopying = useAtomValue(isCopyingAtom);
  useEffect(() => {
    setIsInitialRender(false);
  }, []);

  const micBuffer = contextService.micAudioCaptureService.transcriptionService?.buffer;
  const systemBuffer = contextService.systemAudioCaptureService.transcriptionService?.buffer;

  const hasContent =
    paragraphTranscripts.transcripts.length > 0 ||
    paragraphTranscripts.remainingMicText.length > 0 ||
    paragraphTranscripts.remainingSystemText.length > 0 ||
    !!micBuffer?.partialText ||
    !!systemBuffer?.partialText;

  const titleShortcuts = (
    <div className="flex items-center gap-4">
      <Shortcut
        label={
          <div className="flex items-center gap-2">
            <Lightbulb size={14} className="text-white/70" />
            <span>Show Insights</span>
          </div>
        }
        onTrigger={() => setMode('live-insights')}
      />
      <CopyButton
        content={contextService.fullContext.audioTranscriptions.map(t => t.text).join('\n')}
        size="lg"
        onMouseOver={() => setIsCopying(true)}
        onMouseOut={() => setIsCopying(false)}
      />
    </div>
  );
  const currentMicText = `${paragraphTranscripts.remainingMicText} ${micBuffer?.partialText ?? ''}`.trim();
  const currentSystemText = `${paragraphTranscripts.remainingSystemText} ${systemBuffer?.partialText ?? ''}`.trim();

  return (
    <>
      <WindowTitle shortcuts={titleShortcuts}>
        <AnimatePresence mode="popLayout">
          <motion.p
            key={isCopying ? 'copy' : 'normal'}
            className="min-w-fit"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            transition={{ duration: 0.2, ease: 'easeOut' }}
          >
            {isCopying ? 'Copy Transcript' : `${APP_NAME} is Listening`}
          </motion.p>
        </AnimatePresence>
      </WindowTitle>

      <ScrollableContent
        maxHeight={400}
        enableSnapToBottom={true}
        className="space-y-1.5"
      >
        {!hasContent && (
          <WindowMessage className="my-1 opacity-80">
            Start speaking to see real-time transcriptions…
          </WindowMessage>
        )}
        {paragraphTranscripts.transcripts.map((transcription, index) => (
          <TranscriptionBubble key={index} transcription={transcription} skipAnimate={isInitialRender} />
        ))}
        {currentSystemText.length > 0 && (
          <SystemBubble skipAnimate={isInitialRender}>
            <span className="flex items-center gap-2">
              <PulseLoader size={4.5} color="white" className="opacity-90" />
              <span>{currentSystemText}</span>
            </span>
          </SystemBubble>
        )}
        {currentMicText.length > 0 && (
          <MicBubble skipAnimate={isInitialRender}>
            <span className="flex items-center gap-2">
              <span>{currentMicText}</span>
              <PulseLoader size={4.5} color="white" className="opacity-90" />
            </span>
          </MicBubble>
        )}
      </ScrollableContent>
    </>
  );
});

const TranscriptionBubble = observer(({ transcription, skipAnimate }: { transcription: TranscriptionEntry; skipAnimate: boolean }) => {
  switch (transcription.role) {
    case 'mic':
      return <MicBubble skipAnimate={skipAnimate}>{transcription.text}</MicBubble>;
    case 'system':
      return <SystemBubble skipAnimate={skipAnimate}>{transcription.text}</SystemBubble>;
    default:
      return null;
  }
});

export const MicBubble = ({ skipAnimate, children }: { skipAnimate?: boolean; children: React.ReactNode }) => (
  <motion.div
    className="px-2.5 py-1.5 w-fit max-w-72 ml-auto rounded-lg bg-blue-400/60 saturate-150 text-white/90 text-xs shadow-xs"
    style={{ backgroundColor: 'var(--accent-color)' }}
    initial={skipAnimate ? false : { scale: 0.8, opacity: 0 }}
    animate={{ scale: 1, opacity: 1 }}
    transition={{ duration: 0.2, ease: 'easeOut' }}
  >
    {children}
  </motion.div>
);

export const SystemBubble = ({ skipAnimate, children }: { skipAnimate?: boolean; children: React.ReactNode }) => (
  <motion.div
    className="px-2.5 py-1.5 w-fit max-w-72 mr-auto rounded-lg bg-white/10 text-white/90 text-xs shadow-xs"
    initial={skipAnimate ? false : { scale: 0.8, opacity: 0 }}
    animate={{ scale: 1, opacity: 1 }}
    transition={{ duration: 0.2, ease: 'easeOut' }}
  >
    {children}
  </motion.div>
);