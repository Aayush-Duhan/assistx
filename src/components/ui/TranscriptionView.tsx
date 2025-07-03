import React, { useState, useEffect, ReactNode } from 'react';
import { motion } from 'framer-motion';

// --- Custom Hooks & Stores ---
import { useGlobalServices } from '../../services/GlobalServicesContextProvider';

// --- UI Components ---
import { Portal } from '../Portal';
import { WindowTitle } from './WindowTitle';
import { WindowFooter } from './WindowFooter';
import { ScrollableContent } from './ScrollableContent';
import { PulseLoader } from 'react-spinners';

// --- Type Definitions ---
// Assuming a ZP class or type exists for a single transcription entry
interface TranscriptionEntry {
  source: 'mic' | 'system';
  text: string;
  // ... other properties like createdAt
}

// --- Main TranscriptionView Component ---

/**
 * Displays a live, auto-scrolling feed of the conversation transcription
 * from both the microphone and system audio.
 */
export const TranscriptionView = React.memo(function TranscriptionView() {
  const { contextService, micAudioCaptureService, systemAudioCaptureService } = useGlobalServices();
  const { audioTranscriptions } = contextService.fullContext;
  const [isInitialRender, setIsInitialRender] = useState(true);

  // Mark the initial render as complete after the first paint.
  useEffect(() => {
    setIsInitialRender(false);
  }, []);

  const micBuffer = micAudioCaptureService.transcriptionService?.buffer;
  const systemBuffer = systemAudioCaptureService.transcriptionService?.buffer;

  // A key that changes whenever the content changes, forcing the scrollable
  // view to scroll to the bottom.
  const scrollToBottomKey = `${audioTranscriptions.length}-${getBufferContentKey(micBuffer)}-${getBufferContentKey(systemBuffer)}`;

  return (
    <Portal.Movable width={300} captureMouseEvents>
      <WindowTitle>
        <TranscriptionTitle />
      </WindowTitle>
      <TranscriptionContent
        transcriptions={audioTranscriptions}
        micBuffer={micBuffer}
        systemBuffer={systemBuffer}
        scrollToBottomKey={scrollToBottomKey}
        skipAnimate={isInitialRender}
      />
      <WindowFooter />
    </Portal.Movable>
  );
});

// --- Child Components ---

/**
 * Displays the title of the transcription window, indicating the current status.
 */
const TranscriptionTitle = React.memo(function TranscriptionTitle() {
  const { micAudioCaptureService, systemAudioCaptureService } = useGlobalServices();
  const [appName, setAppName] = useState('Yolo');
  
  const isPaused =
    micAudioCaptureService.state.state === 'running' &&
    systemAudioCaptureService.state.state === 'running' &&
    micAudioCaptureService.state.paused &&
    systemAudioCaptureService.state.paused;

  useEffect(() => {
    window.electron.ipcRenderer.invoke('get-app-name').then(setAppName).catch(() => {
      setAppName('Yolo');
    });
  }, []);

  return (
    <>{appName} is {isPaused ? 'paused' : 'listening…'}</>
  );
});

/**
 * Renders the main scrollable list of transcription entries.
 */
const TranscriptionContent = React.memo(function TranscriptionContent({
  transcriptions,
  micBuffer,
  systemBuffer,
  scrollToBottomKey,
  skipAnimate,
}: {
  transcriptions: TranscriptionEntry[];
  micBuffer: { partialText: string | null } | null;
  systemBuffer: { partialText: string | null } | null;
  scrollToBottomKey: string;
  skipAnimate: boolean;
}) {
  return (
    <ScrollableContent
      maxHeight={350}
      scrollDownAccelerator="CommandOrControl+Down"
      scrollUpAccelerator="CommandOrControl+Up"
      scrollToBottomKey={scrollToBottomKey}
      className="space-y-1.5"
    >
      {transcriptions.map((transcription, index) => (
        <TranscriptionBubble key={index} transcription={transcription} skipAnimate={skipAnimate} />
      ))}
      {/* Render partial text from system audio if available */}
      {!!systemBuffer?.partialText && (
        <SystemBubble skipAnimate={skipAnimate}>{systemBuffer.partialText}</SystemBubble>
      )}
      {/* Render a loading indicator for system audio if it's buffering */}
      {!!systemBuffer && (
        <SystemBubble skipAnimate={skipAnimate}>
          <PulseLoader size={4.5} color="white" className="opacity-90 mx-1.5" />
        </SystemBubble>
      )}
      {/* Render partial text from mic audio if available */}
      {!!micBuffer?.partialText && (
        <MicBubble skipAnimate={skipAnimate}>{micBuffer.partialText}</MicBubble>
      )}
      {/* Render a loading indicator for mic audio if it's buffering */}
      {!!micBuffer && (
        <MicBubble skipAnimate={skipAnimate}>
          <PulseLoader size={4.5} color="white" className="opacity-90 mx-1.5" />
        </MicBubble>
      )}
    </ScrollableContent>
  );
});

/**
 * A component that renders a single transcription entry bubble, styled
 * differently based on the audio source (mic vs. system).
 */
const TranscriptionBubble = React.memo(function TranscriptionBubble({
  transcription,
  skipAnimate,
}: {
  transcription: TranscriptionEntry;
  skipAnimate: boolean;
}) {
  switch (transcription.source) {
    case 'mic':
      return <MicBubble skipAnimate={skipAnimate}>{transcription.text}</MicBubble>;
    case 'system':
      return <SystemBubble skipAnimate={skipAnimate}>{transcription.text}</SystemBubble>;
    default:
      return null;
  }
});

/**
 * A styled bubble for transcriptions coming from the user's microphone.
 */
function MicBubble({ skipAnimate, children }: { skipAnimate: boolean; children: ReactNode }) {
  return (
    <motion.div
      className="px-2.5 py-1.5 w-fit max-w-56 ml-auto rounded-lg bg-blue-400/60 saturate-150 text-white/90 text-xs shadow-xs"
      initial={skipAnimate ? false : { scale: 0.8, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      transition={{ duration: 0.2, ease: 'easeOut' }}
    >
      {children}
    </motion.div>
  );
}

/**
 * A styled bubble for transcriptions coming from the system audio (e.g., other people in a meeting).
 */
function SystemBubble({ skipAnimate, children }: { skipAnimate: boolean; children: ReactNode }) {
  return (
    <motion.div
      className="px-2.5 py-1.5 w-fit max-w-56 mr-auto rounded-lg bg-white/10 text-white/90 text-xs shadow-xs"
      initial={skipAnimate ? false : { scale: 0.8, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      transition={{ duration: 0.2, ease: 'easeOut' }}
    >
      {children}
    </motion.div>
  );
}

// --- Helper Functions ---

/**
 * Generates a key for the scroll-to-bottom logic based on the buffer's content.
 * This ensures that the view scrolls down even when only the partial text changes.
 */
function getBufferContentKey(buffer: { partialText: string | null } | null): string {
  if (!buffer) return 'no buffer';
  return buffer.partialText?.length.toString() ?? 'has buffer';
}