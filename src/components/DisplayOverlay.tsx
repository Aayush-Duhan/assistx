import React, { useState, useEffect } from 'react';

declare module 'react' {
  interface CSSProperties {
    WebkitAppRegion?: 'no-drag' | 'drag';
  }
}

interface DisplayData {
  display: {
    id: number;
    label: string;
    bounds: { x: number; y: number; width: number; height: number };
  };
  ipcChannel: string;
}

const DisplayOverlayApp: React.FC = () => {
  const [displayData, setDisplayData] = useState<DisplayData | null>(null);
  const [isHighlighted, setIsHighlighted] = useState(false);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const dataString = params.get('displayData');
    if (dataString) {
      try {
        const data = JSON.parse(decodeURIComponent(dataString));
        setDisplayData(data);
      } catch (error) {
        console.error('Failed to parse display data:', error);
      }
    }

    const handleHighlight = () => setIsHighlighted(true);
    const handleUnhighlight = () => setIsHighlighted(false);

    window.addEventListener('highlight', handleHighlight);
    window.addEventListener('unhighlight', handleUnhighlight);

    return () => {
      window.removeEventListener('highlight', handleHighlight);
      window.removeEventListener('unhighlight', handleUnhighlight);
    };
  }, []);

  const handleClick = () => {
    if (displayData) {
      window.electron.ipcRenderer.send(displayData.ipcChannel);
    }
  };

  if (!displayData) {
    return null; // Or a loading/error state
  }

  const { display } = displayData;

  const style: React.CSSProperties = {
    position: 'absolute',
    top: 0,
    left: 0,
    width: '100vw',
    height: '100vh',
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.3)',
    border: isHighlighted ? '4px solid #007aff' : '4px solid transparent',
    color: 'white',
    fontSize: '48px',
    fontWeight: 'bold',
    transition: 'border-color 0.2s ease-in-out',
    boxSizing: 'border-box',
    cursor: 'pointer',
    WebkitAppRegion: 'no-drag',
  };

  return (
    <div style={style} onClick={handleClick}>
      <p>{display.label}</p>
    </div>
  );
};

export default DisplayOverlayApp; 