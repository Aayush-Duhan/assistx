import { useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { observer } from 'mobx-react-lite';
import { cn } from '@/lib/utils';
import { useGlobalServices } from '@/services/GlobalServicesContextProvider';
import { NotificationWindow } from '../windows/Notification';
import { HeadlessButton } from '../ui/HeadlessButton';
import { Tooltip } from '../ui/Tooltip';
import {
  ChevronDown,
  X,
  XCircle,
} from 'lucide-react';
import { Pause, Play } from 'lucide-react';
import { PuffLoader } from 'react-spinners';
import { useSetAtom } from 'jotai';
import { isClearingAtom } from '@/state/atoms';

function Waveform({ isStatic }: { isStatic: boolean }) {
  const staticScales = [6, 10, 8];
  return (
    <div className="w-4 h-[12px] flex items-center justify-center gap-[2px]">
      {['waveform-1', 'waveform-2', 'waveform-3'].map((key, index) => (
        <motion.div
          key={key}
          className={cn('w-[2px] h-full rounded-full origin-center', isStatic ? 'bg-white/70' : 'bg-white/60')}
          initial={isStatic ? false : { scaleY: 0.333 }}
          animate={
            isStatic
              ? undefined
              : {
                  scaleY: [0.333, 1, 0.333],
                  transition: {
                    duration: 1,
                    repeat: Infinity,
                    delay: index * 0.2,
                    ease: 'easeInOut',
                  },
                }
          }
          style={isStatic ? { height: `${staticScales[index]}px` } : undefined}
        />
      ))}
    </div>
  );
}

const ListenButton = observer(({ isLoading, onClick }: { isLoading: boolean; onClick: () => void }) => {
  return (
    <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }}>
      <HeadlessButton
        className="w-18 h-6.5 rounded-full bg-blue-600/90 shadow-sm flex items-center justify-center gap-1 hover:bg-blue-600 transition"
        onClick={onClick}
      >
        {isLoading ? <PuffLoader color="white" size={16} /> : <Waveform isStatic />}
        <p className="text-white text-[11px]">Listen</p>
      </HeadlessButton>
    </motion.div>
  );
});

const RunningControls = observer(({ isPaused, onPause, onResume, onStop }: { isPaused: boolean; onPause: () => void; onResume: () => void; onStop: () => void; }) => {
  const { aiResponsesService } = useGlobalServices();

  return (
    <div className="flex items-center justify-between h-6">
      <Tooltip
        tooltipContent={isPaused ? 'Resume Listening' : 'Pause Listening'}
        gap={12}
      >
        <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }}>
            <HeadlessButton
              className="overflow-hidden size-6 rounded-full bg-white/20 shadow-sm flex items-center justify-center hover:bg-white/30 active:bg-white/40 transition"
              onClick={() => {
                if (isPaused) {
                  onResume();
                } else {
                  onPause();
                  aiResponsesService.setIsAudioSessionWindowOpen(true);
                }
              }}
            >
              <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} key={isPaused ? 'play' : 'pause'}>
                {isPaused ? <Play className="text-white size-3" /> : <Pause className="text-white size-3" />}
              </motion.div>
            </HeadlessButton>
        </motion.div>
      </Tooltip>

      <div className="relative w-[48px] h-6">
        <Tooltip tooltipContent={isPaused ? undefined : `${aiResponsesService.isAudioSessionWindowOpen ? 'Hide' : 'Show'} Live Insights`} gap={12}>
          <HeadlessButton
            className="ml-3 overflow-hidden h-6 flex items-center gap-1 transition"
            onClick={() => {
              const newState = !aiResponsesService.isAudioSessionWindowOpen;
              aiResponsesService.setIsAudioSessionWindowOpen(newState);
            }}
          >
            <Waveform isStatic={false} />
            <ChevronDown className={`text-white/60 size-3.5 transition ${aiResponsesService.isAudioSessionWindowOpen && 'scale-y-[-1]'}`} />
          </HeadlessButton>
        </Tooltip>
        <AnimatePresence mode="wait">
          {isPaused && (
            <motion.div
              className="absolute left-1 top-1/2 -translate-y-1/2"
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.8 }}
              transition={{ duration: 0.1 }}
            >
              <DoneButton onStop={onStop} />
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
});

const DoneButton = ({ onStop }: { onStop: () => void }) => {
  const setIsClearing = useSetAtom(isClearingAtom);

  useEffect(() => () => setIsClearing(false), [setIsClearing]);

  return (
    <Tooltip
      tooltipContent="Close Summary and Follow-Ups"
      gap={12}
    >
      <HeadlessButton
        className="h-6 px-2 rounded-full bg-red-500/90 shadow-sm flex items-center justify-center hover:bg-red-600/90 active:bg-red-700/90 transition"
        onClick={onStop}
        onMouseEnter={() => setIsClearing(true)}
        onMouseLeave={() => setIsClearing(false)}
      >
        <p className="text-white text-[10px]">Done</p>
        <X className="text-white size-2.5 ml-1" />
      </HeadlessButton>
    </Tooltip>
  );
};

function ErrorState({
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
          <XCircle className="text-white size-4" />
        </HeadlessButton>
      </motion.div>
      <NotificationWindow
        title="Audio Capture Error"
        message={getErrorMessage(error)}
        windowType="movable"
        actions={[
            { label: "Retry", onClick: onRetry },
            { label: "Close", onClick: onClose },
        ]}
      />
    </>
  );
}

export const ListeningUI = observer(function ListeningUI() {
  const { micAudioCaptureService, systemAudioCaptureService, contextService, aiResponsesService  } = useGlobalServices();

  const micState = micAudioCaptureService.state.state;
  const systemState = systemAudioCaptureService.state.state;
  const micError = micState === 'error' ? micAudioCaptureService.state.error : null;
  const systemError = systemState === 'error' ? systemAudioCaptureService.state.error : null;
  const micTranscriptionState = micAudioCaptureService.transcriptionService?.state.state;
  const systemTranscriptionState = systemAudioCaptureService.transcriptionService?.state.state;
  const micTranscriptionError = micTranscriptionState === 'error' ? micAudioCaptureService.transcriptionService?.state.error : null;
  const systemTranscriptionError = systemTranscriptionState === 'error' ? systemAudioCaptureService.transcriptionService?.state.error : null;

  const { isInAudioSessionAndAudioIsPaused } = contextService;

  if (micError === 'permission' || systemError === 'permission') {
    return <ErrorState error="permission" onClose={() => contextService.stopAudio()} onRetry={() => contextService.restartAudio()} />;
  }

  if (micTranscriptionError === 'network' || systemTranscriptionError === 'network') {
    return <ErrorState error="network" onClose={() => contextService.stopAudio()} onRetry={() => contextService.restartAudio()} />;
  }

  if (micTranscriptionState === 'error' || systemTranscriptionState === 'error' || micState === 'error' || systemState === 'error') {
    return <ErrorState error="unknown" onClose={() => contextService.stopAudio()} onRetry={() => contextService.restartAudio()} />;
  }

  if (micState === 'loading' || systemState === 'loading' || micTranscriptionState === 'loading' || systemTranscriptionState === 'loading') {
    return <ListenButton isLoading onClick={() => contextService.stopAudio()} />;
  }

  if (micState === 'running' && systemState === 'running') {
    return (
      <RunningControls
        isPaused={isInAudioSessionAndAudioIsPaused}
        onPause={() => {
          contextService.pauseAudio();
        }}
        onResume={() => {
          contextService.resumeAudio();
        }}
        onStop={() => {
          contextService.stopAudio();
          aiResponsesService.setIsAudioSessionWindowOpen(false)
        }}
      />
    );
  }

  if (micState === 'not-running' && systemState === 'not-running') {
    return (
      <ListenButton
        isLoading={false}
        onClick={() => {
          contextService.restartAudio();
        }}
      />
    );
  }

  // Fallback for inconsistent states
  return <ErrorState error="unknown" onClose={() => contextService.stopAudio()} onRetry={() => contextService.resumeAudio()} />;
});