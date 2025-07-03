import { useState, useEffect, useCallback } from 'react';

interface Display {
  id: number;
  label: string;
  bounds: {
    x: number;
    y: number;
    width: number;
    height: number;
  };
  workArea: {
    x: number;
    y: number;
    width: number;
    height: number;
  };
  primary: boolean;
  current: boolean;
}

export const useDisplayOverlay = () => {
  const [availableDisplays, setAvailableDisplays] = useState<Display[]>([]);
  const [isOverlayActive, setIsOverlayActive] = useState(false);

  const refreshDisplays = useCallback(async () => {
    try {
      const displays = await window.electron.ipcRenderer.invoke('get-available-displays');
      setAvailableDisplays(displays);
    } catch (error) {
      console.error('Failed to get available displays:', error);
    }
  }, []);

  const showOverlays = useCallback(() => {
    window.electron.ipcRenderer.send('show-display-overlays');
    setIsOverlayActive(true);
  }, []);

  const hideOverlays = useCallback(() => {
    window.electron.ipcRenderer.send('hide-display-overlays');
    setIsOverlayActive(false);
  }, []);

  const highlightDisplay = useCallback((displayId: number) => {
    window.electron.ipcRenderer.send('highlight-display', { displayId });
  }, []);

  const unhighlightDisplay = useCallback((displayId: number) => {
    window.electron.ipcRenderer.send('unhighlight-display', { displayId });
  }, []);

  useEffect(() => {
    refreshDisplays();
  }, [refreshDisplays]);

  // Listen for display changes
  useEffect(() => {
    const handleDisplayChanged = () => {
      refreshDisplays();
    };

    window.electron.ipcRenderer.on('display-changed', handleDisplayChanged);

    return () => {
      window.electron.ipcRenderer.removeListener('display-changed', handleDisplayChanged);
    };
  }, [refreshDisplays]);

  return {
    availableDisplays,
    isOverlayActive,
    showOverlays,
    hideOverlays,
    highlightDisplay,
    unhighlightDisplay,
    refreshDisplays,
  };
}; 