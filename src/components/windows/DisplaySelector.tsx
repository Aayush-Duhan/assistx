// src/components/windows/DisplaySelector.tsx

import React, { useState, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import { observer } from 'mobx-react-lite';

import { useMovableWindow } from './MovableWindowsProvider';
import { useGlobalShortcut } from '@/hooks/useGlobalShortcut';
import { electron, Display } from '@/services/electron';
import { WindowFrame, WindowTitle, WindowFooter } from '../../components/ui';
import { Shortcut } from '@/components/ui/Shortcut';
import { Monitor } from 'lucide-react'; 

interface DisplaySelectorProps {
  onClose: () => void;
}

/**
 * A UI component that allows the user to select which display the main application
 * window should be attached to. It shows a list of available displays and
 * communicates with the main process to move the window.
 */
export const DisplaySelector = observer(({ onClose }: DisplaySelectorProps) => {
  const [displays, setDisplays] = useState<Display[]>([]);
  const [hoveredDisplayId, setHoveredDisplayId] = useState<number | null>(null);
  const { setX: setWindowX } = useMovableWindow();

  // Fetch and subscribe to display list changes
  useEffect(() => {
    electron.showDisplayOverlays();
    const unsubscribe = electron.subscribeToDisplays(setDisplays);
    setDisplays(electron.getDisplays()); // Initial fetch

    return () => {
      electron.hideDisplayOverlays();
      unsubscribe();
    };
  }, []);

  // Close the selector if the main command bar is hidden
  useEffect(() => {
    if (!electron.getVisibility()) {
      onClose();
    }
  }, [onClose]);

  // Handle display selection
  const handleSelectDisplay = (displayId: number) => {
    electron.moveWindowToDisplay({ displayId });
    electron.hideDisplayOverlays();
    setWindowX(0, true); // Reset horizontal position immediately
    onClose();
  };

  // Handle mouse hover to highlight the corresponding display overlay
  const handleMouseEnter = (displayId: number) => {
    setHoveredDisplayId(displayId);
    electron.highlightDisplay({ displayId });
  };

  const handleMouseLeave = (displayId: number) => {
    if (hoveredDisplayId === displayId) {
      setHoveredDisplayId(null);
    }
    electron.unhighlightDisplay({ displayId });
  };

  const handleClose = useCallback(() => {
    console.log('[DisplaySelector] Back button clicked, hiding overlays');
    electron.hideDisplayOverlays();
    onClose();
  }, [onClose]);

  useGlobalShortcut('Escape', handleClose);

  return (
    <WindowFrame opaque captureMouseEvents width={192} contentClassName="flex flex-col items-left">
      <WindowTitle>Change Display</WindowTitle>
      <div className="w-44 mx-auto mt-1 flex flex-col items-center">
        <p className="text-white/70 text-xs mb-3 text-left px-2">
          Select a display or click on any overlay.
        </p>
        <div className="space-y-1.5 pt-1 h-fit max-h-96 overflow-y-auto w-full px-1 scrollbar-thin scrollbar-track-transparent scrollbar-thumb-white/50">
          {displays.map((display) => (
            <DisplayItem
              key={display.id}
              display={display}
              isHovered={hoveredDisplayId === display.id}
              onClick={() => handleSelectDisplay(display.id)}
              onMouseEnter={() => handleMouseEnter(display.id)}
              onMouseLeave={() => handleMouseLeave(display.id)}
            />
          ))}
          {displays.length === 0 && (
            <div className="text-white/50 text-center py-6">
              <Monitor className="mx-auto mb-2" size={20} />
              <p className="text-xs">Detecting displays...</p>
            </div>
          )}
        </div>
      </div>
      <div className="mt-3 pb-3">
        <WindowFooter shortcuts={<Shortcut label="Close" accelerator="Escape" onTrigger={handleClose} />} />
      </div>
    </WindowFrame>
  );
});

interface DisplayItemProps {
  display: Display;
  isHovered: boolean;
  onClick: () => void;
  onMouseEnter: () => void;
  onMouseLeave: () => void;
}

const DisplayItem = ({ display, isHovered, onClick, onMouseEnter, onMouseLeave }: DisplayItemProps) => {
  return (
    <motion.div
      className={`w-full flex items-center gap-2 p-2 rounded-md cursor-pointer transition-all duration-200 bg-white/5 border border-white/10 ${
        display.current ? 'opacity-75' : ''
      } ${!display.current && isHovered ? 'hover:bg-white/10 border-blue-400/30' : ''}`}
      onClick={onClick}
      onMouseEnter={onMouseEnter}
      onMouseLeave={onMouseLeave}
      whileHover={{ scale: display.current ? 1 : 1.01 }}
      whileTap={{ scale: display.current ? 1 : 0.98 }}
    >
      <div className="flex-shrink-0">
        <Monitor className="text-white/70" size={16} />
      </div>
      <div className="flex-grow min-w-0">
        <div className="flex items-center gap-1.5">
          <h3 className="text-white font-medium text-xs truncate">{display.label}</h3>
        </div>
        <p className="text-white/50 text-[10px]">
          {display.bounds.width} × {display.bounds.height}
          {display.scaleFactor !== 1 && ` @${display.scaleFactor}x`}
        </p>
        {display.primary && (
          <span className="text-[10px] px-1.5 py-0.5 mr-1 bg-blue-500/20 text-blue-300 rounded border border-blue-400/30">
            Primary
          </span>
        )}
        {display.current && (
          <span className="text-[10px] px-1.5 py-0.5 bg-green-500/20 text-green-300 rounded border border-green-400/30">
            Current
          </span>
        )}
      </div>
    </motion.div>
  );
};