import { useEffect, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { observer } from 'mobx-react-lite';
import { LiveInsightsView } from './LiveInsightsView';
import { TranscriptionView } from '../ui/TranscriptionView';
import { useGlobalServices } from '../../services/GlobalServicesContextProvider';
import { useInvisibility } from '../../hooks/useInvisibility';
 
import { InlineWindow } from '../windows/InlineWindow';
import { useMovableWindowApi } from '@/hooks/useMovableWindow';


const AUDIO_SESSION_WINDOW_WIDTH = 550;

export const AudioSessionWindow = observer(() => {
  const { aiResponsesService } = useGlobalServices();
  const { isAudioSessionWindowOpen } = aiResponsesService;
  const { vOrientation } = useMovableWindowApi();
  const [mode, setMode] = useState<'live-insights' | 'transcription'>('live-insights');
  const { isInvisible } = useInvisibility();
  const width = AUDIO_SESSION_WINDOW_WIDTH;
  useWindowPositioning();
  
  return (
    <div
      className="absolute"
      style={{
        ...(vOrientation === 'top' ? { top: 45 } : { bottom: 45 }),
        left: `calc(50% - ${width / 2}px)`,
      }}
    >
      <AnimatePresence>
        {isAudioSessionWindowOpen && (
          <motion.div
            initial={{ opacity: 0, x: !isInvisible ? -40 : 0 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: !isInvisible ? -40 : 0 }}
          >
            <InlineWindow
              width={width}
              layoutTransition
              captureMouseEvents
            >
              {mode === 'live-insights' ? (
                <LiveInsightsView mode={mode} setMode={setMode} />
              ) : (
                <TranscriptionView setMode={setMode} />
              )}
            </InlineWindow>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
});

function useWindowPositioning() {
  const { getX, setX } = useMovableWindowApi();
  const { aiResponsesService } = useGlobalServices();
  const { isAudioSessionWindowOpen } = aiResponsesService;
  const { isInvisible } = useInvisibility();

  useEffect(() => {
    if (isAudioSessionWindowOpen && !isInvisible) {
      const windowWidth = AUDIO_SESSION_WINDOW_WIDTH;
      const newX = window.innerWidth / 2 + getX() - windowWidth;
      if (newX < 0) {
        setX(getX() - newX);
      }
    }
  }, [isAudioSessionWindowOpen, isInvisible, getX, setX]);
}