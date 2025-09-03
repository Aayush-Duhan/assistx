import React, { useState, useEffect } from 'react';

import { useGlobalServices } from '../../services/GlobalServicesContextProvider';
import { IS_MAC } from '@/lib/constants';

import { NotificationWindow } from '../windows/Notification';

const micUsedListeners = new Set<(payload: { app: string }) => void>();
const micOffListeners = new Set<(payload: { app: string }) => void>();

let listenersSetup = false;

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

function useMicUsageListener({
  handleMicUsed,
  handleMicOff,
}: {
  handleMicUsed: (payload: { app: string }) => void;
  handleMicOff: (payload: { app: string }) => void;
}) {
  useEffect(() => {
    setupEventListeners();
  }, []);

  useEffect(() => {
    if (IS_MAC) {
        window.electron.ipcRenderer?.send('mac-set-mic-monitor-enabled', { enabled: true });
      }
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

const NOTIFICATION_TIMEOUT_MS = 10000;

export const MeetingDetectedNotification = React.memo(function MeetingDetectedNotification() {
  const { micAudioCaptureService, systemAudioCaptureService } = useGlobalServices();
  const [notifiedApp, setNotifiedApp] = useState<string | null>(null);
  const [appName, setAppName] = useState('Yolo');

  useEffect(() => {
    window.electron.ipcRenderer.invoke('get-app-name').then(setAppName).catch(() => {
      setAppName('Yolo');
    });
  }, []);

  useMicUsageListener({
    handleMicUsed: (payload) => {
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

  useEffect(() => {
    if (notifiedApp !== null) {
      const timeoutId = setTimeout(() => {
        setNotifiedApp(null);
      }, NOTIFICATION_TIMEOUT_MS);

      return () => clearTimeout(timeoutId);
    }
  }, [notifiedApp]);

  return (
    <NotificationWindow
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