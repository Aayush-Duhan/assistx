import React, { useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { observer } from 'mobx-react-lite';
import { cn } from '@/lib/utils';

// --- Custom Hooks & Stores ---
import { useGlobalServices } from '../../services/GlobalServicesContextProvider';

// --- UI Components & Icons ---
import { Portal } from '../Portal';
import { MovableNotification } from '../MovableNotification';
import { Tooltip, HeadlessButton } from '../ui';
import {
  MicIcon,
  StopIcon,
  MicMutedIcon,
  ChevronDownIcon,
} from '../ui/icons';
import { Pause, Play, Square } from 'lucide-react';
import { PuffLoader } from 'react-spinners';
import { TranscriptionView } from '../ui/TranscriptionView';

// --- Child Components for Different Listen States ---

/**
 * A pulsing waveform icon, used to indicate that audio is being processed.
 */
function Waveform({ isStatic }: { isStatic: boolean }) {
  return (
    <div className="w-4 flex items-center justify-center gap-[2px]">
      {['waveform-1', 'waveform-2', 'waveform-3'].map((key, index) => (
        <motion.div
          key={key}
          className={cn('w-[2px] rounded-full', isStatic ? 'bg-white/30' : 'bg-white/60')}
          initial={{ height: '0px' }}
          animate={isStatic ? { height: index === 0 ? '6px' : index === 1 ? '10px' : '8px' } : {
            height: ['4px', '12px', '4px'],
            transition: {
              duration: 1,
              repeat: Infinity,
              delay: index * 0.2,
              ease: 'easeInOut',
            },
          }}
        />
      ))}
    </div>
  );
}

/**
 * The primary button to start or stop listening.
 */
const ListenButton = React.memo(function ListenButton({
  isLoading,
  onClick,
}: {
  isLoading: boolean;
  onClick: () => void;
}) {
  return (
    <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }}>
      <HeadlessButton
        className="w-18 h-6.5 rounded-full bg-white/20 shadow-sm flex items-center justify-center gap-1.5 hover:bg-white/30 focus:bg-white/40 transition"
        onClick={onClick}
      >
        <p className="text-white text-[11px]">Listen</p>
        {isLoading ? (
          <PuffLoader color="white" size={16} />
        ) : (
          <Waveform isStatic />
        )}
      </HeadlessButton>
    </motion.div>
  );
});

/**
 * The view shown when audio capture is active and listening.
 */
const ListeningView = observer(function ListeningView({ 
  onStop, 
  onPause, 
  isPaused 
}: { 
  onStop: () => void;
  onPause: () => void;
  isPaused: boolean;
}) {
  const { aiResponsesService } = useGlobalServices();
  const { showMainAppAiContent } = aiResponsesService;
  const [isTranscriptVisible, setIsTranscriptVisible] = useState(false);

  const menu = (
    <Portal.Movable>
      <motion.div
        className="absolute top-0"
        style={showMainAppAiContent ? { right: 'calc(100% + 20px)' } : { left: 'calc(50% - 196px)' }}
        layout="position"
        transition={{ ease: [0.4, 0, 0.2, 1] }}
      >
        <AnimatePresence>
          {isTranscriptVisible && (
            <motion.div
              initial={{ opacity: 0, x: -40 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -40 }}
            >
              <TranscriptionView />
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    </Portal.Movable>
  );

  const controls = (
    <div className="w-24 flex items-center justify-center gap-2">
      <Tooltip tooltipContent={isTranscriptVisible ? 'Hide transcript' : 'Show transcript'}>
        <HeadlessButton
          className={cn('relative overflow-hidden h-8 flex items-center gap-1 transition', isPaused && 'text-white/60')}
          onClick={() => setIsTranscriptVisible(!isTranscriptVisible)}
        >
          <Waveform isStatic={isPaused} />
          <ChevronDownIcon
            className={cn('text-white/60 size-2.5 transition', isTranscriptVisible && 'scale-y-[-1]')}
          />
        </HeadlessButton>
      </Tooltip>
      
      <Tooltip tooltipContent={isPaused ? 'Resume' : 'Pause'}>
        <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }}>
          <HeadlessButton
            className={cn('relative overflow-hidden size-6 rounded-full bg-white/20 shadow-sm flex items-center justify-center hover:bg-white/30 focus:bg-white/40 transition', isPaused && 'bg-white/30')}
            onClick={onPause}
          >
            {isPaused ? (
              <Play className="text-white size-3" />
            ) : (
              <Pause className="text-white size-3" />
            )}
          </HeadlessButton>
        </motion.div>
      </Tooltip>

      <Tooltip tooltipContent="Stop and clear">
        <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }}>
          <HeadlessButton
            className="relative overflow-hidden size-6 rounded-full bg-white/20 shadow-sm flex items-center justify-center hover:bg-white/30 focus:bg-white/40 transition"
            onClick={onStop}
          >
            <Square className="text-white size-3" />
          </HeadlessButton>
        </motion.div>
      </Tooltip>
    </div>
  );

  return (
    <>
      {controls}
      {menu}
    </>
  );
});

/**
 * The view shown when audio capture is paused.
 */
const PausedView = React.memo(function PausedView({ 
  onResume, 
  onStop 
}: { 
  onResume: () => void;
  onStop: () => void;
}) {
  return (
    <div className="w-24 flex items-center justify-center gap-2">
      <Tooltip tooltipContent="Resume listening">
        <HeadlessButton
          className="relative overflow-hidden h-8 flex items-center gap-1 transition"
          onClick={onResume}
        >
          <MicIcon size={14} className="text-white/60" />
        </HeadlessButton>
      </Tooltip>
      
      <Tooltip tooltipContent="Resume">
        <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }}>
          <HeadlessButton
            className="relative overflow-hidden size-6 rounded-full bg-white/20 shadow-sm flex items-center justify-center hover:bg-white/30 focus:bg-white/40 transition"
            onClick={onResume}
          >
            <Play className="text-white size-3" />
          </HeadlessButton>
        </motion.div>
      </Tooltip>

      <Tooltip tooltipContent="Stop and clear">
        <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }}>
          <HeadlessButton
            className="relative overflow-hidden size-6 rounded-full bg-white/20 shadow-sm flex items-center justify-center hover:bg-white/30 focus:bg-white/40 transition"
            onClick={onStop}
          >
            <Square className="text-white size-3" />
          </HeadlessButton>
        </motion.div>
      </Tooltip>
    </div>
  );
});

/**
 * A generic error view with options to retry or close.
 */
function ErrorView({
  error,
  onRetry,
  onClose,
}: {
  error: 'permission' | 'network' | 'unknown';
  onRetry: () => void;
  onClose: () => void;
}) {
  const getErrorMessage = (errorType: typeof error) => {
    switch (errorType) {
      case 'permission':
        return 'Audio capture permission required.';
      case 'network':
        return 'Network error during audio capture. Please check your connection.';
      default:
        return 'Error during audio capture. Please try again.';
    }
  };

  return (
    <>
      <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }}>
        <HeadlessButton
          className="relative overflow-hidden size-6 rounded-full bg-blue-500 shadow-sm flex items-center justify-center hover:bg-blue-600 focus:bg-blue-700 transition"
          onClick={onClose}
        >
          <MicMutedIcon className="text-white size-4" />
        </HeadlessButton>
      </motion.div>
      <MovableNotification
        title="Audio Capture Error"
        message={getErrorMessage(error)}
        actions={[
          { label: 'Retry', onClick: onRetry },
          { label: 'Close', onClick: onClose },
        ]}
      />
    </>
  );
}

// --- Main ListenUI Component ---

export const ListeningUI = observer(function ListeningUI() {
  const { micAudioCaptureService, systemAudioCaptureService, contextService } = useGlobalServices();

  const micState = micAudioCaptureService.state.state;
  const systemState = systemAudioCaptureService.state.state;

  const micPermissionError = micState === 'error' && micAudioCaptureService.state.error === 'permission';
  const systemPermissionError = systemState === 'error' && systemAudioCaptureService.state.error === 'permission';

  // Check if services are paused
  const micPaused = micAudioCaptureService.state.state === 'running' && (micAudioCaptureService.state.paused ?? false);
  const systemPaused = systemAudioCaptureService.state.state === 'running' && (systemAudioCaptureService.state.paused ?? false);
  const isAnyServicePaused = micPaused || systemPaused;

  // Get transcription service from metadata when available
  const micTranscriptionService = micAudioCaptureService.state.state === 'running' 
    ? micAudioCaptureService.state.metadata?.transcriptionService 
    : undefined;
  const systemTranscriptionService = systemAudioCaptureService.state.state === 'running'
    ? systemAudioCaptureService.state.metadata?.transcriptionService
    : undefined;

  const micTranscriptionNetworkError = micTranscriptionService?.state.state === 'error' && micTranscriptionService.state.error === 'network';
  const systemTranscriptionNetworkError = systemTranscriptionService?.state.state === 'error' && systemTranscriptionService.state.error === 'network';

  const micTranscriptionError = micTranscriptionService?.state.state === 'error';
  const systemTranscriptionError = systemTranscriptionService?.state.state === 'error';

  const stopCapture = useCallback(() => {
    micAudioCaptureService.stop();
    systemAudioCaptureService.stop();
    contextService.clearTranscriptions();
  }, [micAudioCaptureService, systemAudioCaptureService, contextService]);

  const startCapture = useCallback(() => {
    micAudioCaptureService.restart();
    systemAudioCaptureService.restart();
  }, [micAudioCaptureService, systemAudioCaptureService]);

  const pauseCapture = useCallback(() => {
    if (micAudioCaptureService.state.state === 'running') {
      micAudioCaptureService.pause();
    }
    if (systemAudioCaptureService.state.state === 'running') {
      systemAudioCaptureService.pause();
    }
  }, [micAudioCaptureService, systemAudioCaptureService]);

  const resumeCapture = useCallback(() => {
    if (micAudioCaptureService.state.state === 'running' && micAudioCaptureService.state.paused) {
      micAudioCaptureService.resume();
    }
    if (systemAudioCaptureService.state.state === 'running' && systemAudioCaptureService.state.paused) {
      systemAudioCaptureService.resume();
    }
  }, [micAudioCaptureService, systemAudioCaptureService]);

  const handlePauseResume = useCallback(() => {
    if (isAnyServicePaused) {
      resumeCapture();
    } else {
      pauseCapture();
    }
  }, [isAnyServicePaused, resumeCapture, pauseCapture]);

  if (micPermissionError || systemPermissionError) {
    return <ErrorView onClose={stopCapture} onRetry={startCapture} error="permission" />;
  }
  if (micTranscriptionNetworkError || systemTranscriptionNetworkError) {
    return <ErrorView onClose={stopCapture} onRetry={startCapture} error="network" />;
  }
  if (micTranscriptionError || systemTranscriptionError) {
    return <ErrorView onClose={stopCapture} onRetry={startCapture} error="unknown" />;
  }
  if (micState === 'error' || systemState === 'error') {
    return <ErrorView onClose={stopCapture} onRetry={startCapture} error="unknown" />;
  }
  if (micState === 'loading' || systemState === 'loading') {
    return <ListenButton isLoading onClick={stopCapture} />;
  }
  if (micTranscriptionService?.state.state === 'loading' || systemTranscriptionService?.state.state === 'loading') {
    return <ListenButton isLoading onClick={stopCapture} />;
  }
  if (micState === 'running' && systemState === 'running') {
    if (isAnyServicePaused) {
      return <PausedView onResume={resumeCapture} onStop={stopCapture} />;
    }
    return (
      <ListeningView 
        onStop={stopCapture}
        onPause={handlePauseResume}
        isPaused={isAnyServicePaused}
      />
    );
  }
  if (micState === 'not-running' && systemState === 'not-running') {
    return <ListenButton isLoading={false} onClick={startCapture} />;
  }

  return <ErrorView onClose={stopCapture} onRetry={startCapture} error="unknown" />;
});