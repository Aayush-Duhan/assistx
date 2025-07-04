import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { observer } from 'mobx-react-lite';

// --- Component & Hook Imports ---
import { MovableWindow } from '../windows/MovableWindow';
import { LiveInsightsView } from './LiveInsightsView';
import { TranscriptionView } from '../ui/TranscriptionView';
import { useGlobalServices } from '../../services/GlobalServicesContextProvider';
import { useIsWindowHidden } from '../../hooks/useIsWindowHidden';

// --- Type Definitions ---
type ActiveView = 'transcription' | 'live-insights';

interface AudioSessionWindowProps {
  show: boolean;
  onClose: () => void;
}

/**
 * The main window displayed during an active audio recording session.
 * It can toggle between showing the live transcript and live AI insights.
 */
export const AudioSessionWindow = observer(({ show, onClose }: AudioSessionWindowProps) => {
  const { micAudioCaptureService, systemAudioCaptureService, liveInsightsService } = useGlobalServices();
  
  // --- State Management ---
  const [activeView, setActiveView] = useState<ActiveView>('live-insights');
  const isWindowHidden = useIsWindowHidden();

  // Check if we're in an audio session (either mic or system audio is running)
  const isInAudioSession = 
    micAudioCaptureService.state.state === 'running' || 
    systemAudioCaptureService.state.state === 'running' ||
    micAudioCaptureService.state.state === 'loading' ||
    systemAudioCaptureService.state.state === 'loading';

  // --- Effects ---
  // When the audio session ends, close this window and clean up state.
  useEffect(() => {
    if (!isInAudioSession) {
      onClose();
      // Delay cleanup to allow for exit animations
      const cleanupTimeout = setTimeout(() => {
        liveInsightsService.clearInsights();
        setActiveView('live-insights');
      }, 300);
      return () => clearTimeout(cleanupTimeout);
    }
  }, [isInAudioSession, onClose, liveInsightsService]);

  // Determine the width of the window based on the active view.
  const width = activeView === 'transcription' ? 500 : 400;

  // Show live insights by default
  const showLiveInsights = true;

  return (
    <MovableWindow
      show={show && !isWindowHidden && isInAudioSession}
      width={width}
      contentClassName="overflow-hidden"
    >
      <AnimatePresence mode="wait">
        {showLiveInsights && activeView === 'live-insights' ? (
          <LiveInsightsView
            key="live-insights"
            onShowTranscript={() => setActiveView('transcription')}
          />
        ) : (
          <TranscriptionView
            key="transcription"
            onShowInsights={showLiveInsights ? () => setActiveView('live-insights') : undefined}
          />
        )}
      </AnimatePresence>
    </MovableWindow>
  );
}); 