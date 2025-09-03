import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { observer } from 'mobx-react-lite';
import { useGlobalServices } from '@/services/GlobalServicesContextProvider';
import { WindowTitle } from '../ui/WindowTitle';
import { Shortcut } from '../ui/Shortcut';
import { CopyButton } from '../ui/CopyButton';
import { LiveInsightsUI } from './LiveInsightsUI';
import { AudioLines, Eye, EyeOff } from 'lucide-react';
import { useAtomValue, useSetAtom } from 'jotai';
import { isCopyingAtom } from '@/state/atoms';
import { APP_NAME } from '@/lib/constants';

interface LiveInsightsViewProps {
  mode: 'live-insights' | 'transcription';
  setMode: (mode: 'live-insights' | 'transcription') => void;
}

export const LiveInsightsView = observer(({ mode, setMode }: LiveInsightsViewProps) => {
  const { contextService } = useGlobalServices();
  const { audioSession, isInAudioSessionAndAudioIsPaused } = contextService;
  const setIsCopying = useSetAtom(isCopyingAtom);
  const isCopying = useAtomValue(isCopyingAtom);
  const [showSummary, setShowSummary] = useState(false);

  const createdAt = audioSession?.state.state === 'created' ? audioSession.state.createdAt : null;
  const [_, setTick] = useState(0);

  useEffect(() => {
    if (!createdAt) return;
    const interval = setInterval(() => {
      setTick(prev => prev + 1);
    }, 1000);
    return () => clearInterval(interval);
  }, [createdAt]);

  const durationMs = createdAt ? Date.now() - createdAt.getTime() : 0;
  const titleKey = isCopying ? 'copy' : `${isInAudioSessionAndAudioIsPaused ? 'paused' : 'listening'}`;

  const titleShortcuts = (
    <div className="flex items-center gap-4">
      <Shortcut
        label={
          <div className="flex items-center gap-2">
            {showSummary ? <Eye size={14} className="text-white/70" /> : <EyeOff size={14} className="text-white/70" />}
            <span>Summary</span>
          </div>
        }
        onTrigger={() => setShowSummary(!showSummary)}
      />
      <Shortcut
        label={
          <div className="flex items-center gap-2">
            <AudioLines size={14} className="text-white/70" />
            <span>Show Transcript</span>
          </div>
        }
        onTrigger={() => setMode('transcription')}
      />
      <CopyButton
        content={() => {
          const { summary, actions } = contextService.liveInsights;
          const summaryText = summary.lines.map((line: { text: string }) => line.text).join('\n');
          const actionsText = ["Actions:", ...actions.map((action: { text: string }) => action.text)].join('\n');
          return [summaryText, actionsText].join('\n\n');
        }}
        size="lg"
        onMouseOver={() => setIsCopying(true)}
        onMouseOut={() => setIsCopying(false)}
      />
    </div>
  );

  return (
    <>
      <WindowTitle shortcuts={titleShortcuts}>
        <AnimatePresence mode="popLayout">
          <motion.p
            key={titleKey}
            className="min-w-fit"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
          >
            {isCopying ? 'Copy All' : isInAudioSessionAndAudioIsPaused ? `${APP_NAME} is Paused` : `${APP_NAME} is Listening`}
          </motion.p>
        </AnimatePresence>
        {!isInAudioSessionAndAudioIsPaused && (
          <span className="text-white/60 font-normal ml-3">
            {formatDuration(durationMs)}
          </span>
        )}
      </WindowTitle>
      <LiveInsightsUI showSummary={showSummary} />
    </>
  );
});

function formatDuration(ms: number): string {
  const totalSeconds = Math.floor(ms / 1000);
  const minutes = Math.floor(totalSeconds / 60).toString().padStart(2, '0');
  const seconds = (totalSeconds % 60).toString().padStart(2, '0');
  return `${minutes}:${seconds}`;
}