import React, { useState, useEffect, ReactNode, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { observer } from 'mobx-react-lite';

// --- Custom Hooks & Stores ---
import { useGlobalServices } from '../../services/GlobalServicesContextProvider';

// --- UI Components ---
import { Portal } from '../Portal';
import { WindowTitle } from './WindowTitle';
import { WindowFooter } from './WindowFooter';
import { ScrollableContent } from './ScrollableContent';
import { Shortcut } from './Shortcut';
import { CopyButton } from './CopyButton';
import { Lightbulb } from 'lucide-react';

// --- Type Definitions ---
// Assuming a ZP class or type exists for a single transcription entry
interface TranscriptionEntry {
  source: 'mic' | 'system';
  text: string;
  // ... other properties like createdAt
}

// --- Main TranscriptionView Component ---

interface TranscriptionViewProps {
  onShowInsights?: () => void;
}

/**
 * Renders the live transcription feed from both microphone and system audio.
 */
export const TranscriptionView = observer(({ onShowInsights }: TranscriptionViewProps = {}) => {
  const { contextService, micAudioCaptureService, systemAudioCaptureService } = useGlobalServices();
  const { audioTranscriptions } = contextService.fullContext;
  const [isCopying, setIsCopying] = useState(false);

  const micBuffer = micAudioCaptureService.transcriptionService?.buffer;
  const systemBuffer = systemAudioCaptureService.transcriptionService?.buffer;

  const transcriptToCopy = useMemo(() => {
    return audioTranscriptions.map(t => t.text).join('\n');
  }, [audioTranscriptions]);

  const titleShortcuts = (
    <div className="flex items-center gap-2">
      {onShowInsights && (
        <Shortcut
          label={
            <div className="flex items-center gap-2">
              <span>Show Insights</span>
              <Lightbulb size={14} className="text-white/70" />
            </div>
          }
          accelerator="CommandOrControl+I"
          onTrigger={onShowInsights}
        />
      )}
             <div
         onMouseEnter={() => setIsCopying(true)}
         onMouseLeave={() => setIsCopying(false)}
       >
         <CopyButton
           content={transcriptToCopy}
           size={16}
         />
       </div>
    </div>
  );

  return (
    <motion.div
      initial={{ opacity: 0, x: 40 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: 40 }}
      transition={{ duration: 0.2, ease: 'easeOut' }}
    >
      <WindowTitle shortcuts={titleShortcuts}>
        <AnimatePresence mode="popLayout">
          <motion.p
            key={isCopying ? 'copy' : 'normal'}
            className="min-w-fit"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
          >
            {isCopying ? 'Copy Transcript' : 'Live Transcript'}
          </motion.p>
        </AnimatePresence>
      </WindowTitle>

             <ScrollableContent
         maxHeight={350}
         scrollDownAccelerator="CommandOrControl+Down"
         scrollUpAccelerator="CommandOrControl+Up"
         scrollToBottomKey={`${audioTranscriptions.length}-${micBuffer?.partialText}-${systemBuffer?.partialText}`}
         className="space-y-1.5"
       >
                 {audioTranscriptions.map((transcription, index) => (
           <TranscriptionItem key={index} transcription={transcription} />
         ))}
         {systemBuffer?.partialText && (
           <SystemTranscriptionItem isPartial>{systemBuffer.partialText}</SystemTranscriptionItem>
         )}
         {micBuffer?.partialText && (
           <MicTranscriptionItem isPartial>{micBuffer.partialText}</MicTranscriptionItem>
         )}
       </ScrollableContent>
     </motion.div>
   );
 });

 // --- Sub-components for clarity ---

 const TranscriptionItem = ({ transcription }: { transcription: TranscriptionEntry }) => {
   if (transcription.source === 'mic') {
     return <MicTranscriptionItem>{transcription.text}</MicTranscriptionItem>;
   }
   return <SystemTranscriptionItem>{transcription.text}</SystemTranscriptionItem>;
 };

 const MicTranscriptionItem = ({ children, isPartial = false }: { children: ReactNode; isPartial?: boolean }) => (
   <motion.div
     className="px-2.5 py-1.5 w-fit max-w-72 ml-auto rounded-lg bg-blue-400/60 text-white/90 text-xs shadow-xs"
     initial={!isPartial && { scale: 0.8, opacity: 0 }}
     animate={{ scale: 1, opacity: 1 }}
     transition={{ duration: 0.2, ease: 'easeOut' }}
   >
     {children}
   </motion.div>
 );

 const SystemTranscriptionItem = ({ children, isPartial = false }: { children: ReactNode; isPartial?: boolean }) => (
   <motion.div
     className="px-2.5 py-1.5 w-fit max-w-72 mr-auto rounded-lg bg-white/10 text-white/90 text-xs shadow-xs"
     initial={!isPartial && { scale: 0.8, opacity: 0 }}
     animate={{ scale: 1, opacity: 1 }}
     transition={{ duration: 0.2, ease: 'easeOut' }}
   >
     {children}
   </motion.div>
 );