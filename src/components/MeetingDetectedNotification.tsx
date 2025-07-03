import React, { useState, useEffect } from 'react';

// --- Custom Hooks & Stores ---
import { useGlobalServices } from '../services/GlobalServicesContextProvider';
import { isMac } from '../utils/platform';

// --- UI Components ---
import { MovableNotification } from './MovableNotification';

const micUsedListeners = new Set<(payload: { app: string }) => void>();
const micOffListeners = new Set<(payload: { app: string }) => void>();

// Track if listeners are already set up
let listenersSetup = false;

// Function to set up event listeners
function setupEventListeners() {
  if (listenersSetup || !window.electron.ipcRenderer) return;
  
  window.electron.ipcRenderer.on('mic-used', (_event, payload) => {
    for (const listener of micUsedListeners) {
      listener(payload);
    }
  });

  window.electron.ipcRenderer.on('mic-off', (_event, payload) => {
    for (const listener of micOffListeners) {
      listener(payload);
    }
  });
  
  listenersSetup = true;
}

/**
 * A custom hook to subscribe to microphone usage events from the Electron main process.
 * This is how the app knows when another application (like Zoom) starts using the mic.
 */
function useMicUsageListener({
  handleMicUsed,
  handleMicOff,
}: {
  handleMicUsed: (payload: { app: string }) => void;
  handleMicOff: (payload: { app: string }) => void;
}) {
  // Set up event listeners when the hook is first used
  useEffect(() => {
    setupEventListeners();
  }, []);

  // On macOS, we need to explicitly enable the native module that monitors the mic.
  useEffect(() => {
    isMac().then((isMacOS) => {
      if (isMacOS) {
        window.electron.ipcRenderer?.send('mac-set-mic-monitor-enabled', { enabled: true });
      }
    });
  }, []);

  useEffect(() => {
    micUsedListeners.add(handleMicUsed);
    micOffListeners.add(handleMicOff);

    return () => {
      micUsedListeners.delete(handleMicUsed);
      micOffListeners.delete(handleMicOff);
    };
  }, [handleMicUsed, handleMicOff]);
}

// --- Constants ---
const NOTIFICATION_TIMEOUT_MS = 10000; // 10 seconds

// --- Main Component ---

/**
 * Displays a notification when it detects that the user has joined a meeting
 * in another application, prompting them to start a recording session.
 */
export const MeetingDetectedNotification = React.memo(function MeetingDetectedNotification() {
  const { micAudioCaptureService, systemAudioCaptureService } = useGlobalServices();
  const [notifiedApp, setNotifiedApp] = useState<string | null>(null);
  const [appName, setAppName] = useState('Yolo');

  // Get app name from main process
  useEffect(() => {
    window.electron.ipcRenderer.invoke('get-app-name').then(setAppName).catch(() => {
      setAppName('Yolo');
    });
  }, []);

  // Subscribe to microphone usage events
  useMicUsageListener({
    handleMicUsed: (payload) => {
      // Only show the notification if our own app is not already recording
      if (
        micAudioCaptureService.state.state === 'not-running' &&
        systemAudioCaptureService.state.state === 'not-running'
      ) {
        setNotifiedApp(payload.app);
      }
    },
    handleMicOff: () => {
      setNotifiedApp(null);
    },
  });

  // Automatically dismiss the notification after a timeout
  useEffect(() => {
    if (notifiedApp !== null) {
      const timeoutId = setTimeout(() => {
        setNotifiedApp(null);
      }, NOTIFICATION_TIMEOUT_MS);

      return () => clearTimeout(timeoutId);
    }
  }, [notifiedApp]);

  return (
    <MovableNotification
      show={notifiedApp !== null}
      title="Meeting Detected"
      message={`We detected you are using ${notifiedApp} for a meeting.`}
      actions={[
        {
          label: `Record with ${appName}`,
          onClick: () => {
            micAudioCaptureService.start();
            systemAudioCaptureService.start();
            setNotifiedApp(null);
          },
        },
        {
          label: 'Dismiss',
          onClick: () => {
            setNotifiedApp(null);
          },
        },
      ]}
    />
  );
});