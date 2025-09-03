import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { send, on } from "../../services/electron"
import { Display } from "../../types"
import { useInvisibility } from "@/hooks/useInvisibility";
import { useMovableWindowApi } from "@/hooks/useMovableWindow";
import { InlineWindow } from "./InlineWindow";
import { WindowTitle } from "../ui/WindowTitle";
import { Monitor } from "lucide-react";
import { Shortcut } from "../ui/Shortcut";
import { WindowFooter } from "../ui/WindowFooter";
import { cn } from "@/lib/utils";

class DisplayService {
  private displays: Display[] = [];
  private listeners = new Set<(displays: Display[]) => void>();
  private isInitialized = false;

  constructor() {
    this.Initialize();
  }

  private async Initialize() {
    if (this.isInitialized) return;
    this.isInitialized = true;

    on('available-displays', ({ displays }) => {
      this.displays = displays;
      this.listeners.forEach(listener => listener(this.displays));
    });

    send('get-available-displays', null);
  }

  getDisplays() {
    return this.displays;
  }

  getDisplayCount(): number {
    return this.displays.length;
  }

  subscribe(callback: (displays: Display[]) => void): () => void {
    this.listeners.add(callback);
    if (this.displays.length > 0) {
      callback(this.displays);
    }
    return () => {
      this.listeners.delete(callback);
    };
  }

  refresh() {
    send('get-available-displays', null);
  }
}

const displayService = new DisplayService();

export function useDisplayCount() {
  const [count, setCount] = useState(() => displayService.getDisplayCount() || 1);
  useEffect(() => {
    const unsubscribe = displayService.subscribe((displays) => {
      setCount(displays.length);
    });
    return unsubscribe;
  }, []);
  return count;
}

export function DisplaySelector({ onClose }: { onClose: () => void }) {
  const [displays, setDisplays] = useState<Display[]>([]);
  const [hoveredId, setHoveredId] = useState<number | null>(null);
  const { isInvisible } = useInvisibility();
  const { setX } = useMovableWindowApi();

  useEffect(() => {
    displayService.refresh();
    const unsubscribe = displayService.subscribe((displays) => {
      setDisplays(displays);
    });
    return () => {
      setDisplays([]);
      unsubscribe();
    };
  }, []);

  useEffect(() => {
    send('show-display-overlays', null);
    return () => {
      send('hide-display-overlays', null);
    }
  }, []);

  useEffect(() => {
    if (!isInvisible) {
      onClose();
    }
  }, [isInvisible, onClose]);

  on('display-changed', () => {
    setX(0);
    onClose();
  });

  const handleDisplayClick = (displayId: number) => {
    send('move-window-to-display', { displayId });
    send('hide-display-overlays', null);
  };
  const handleMouseEnter = (displayId: number) => {
    setHoveredId(displayId);
    send('highlight-display', { displayId });
  };
  const handleMouseLeave = (displayId: number) => {
    if (hoveredId === displayId) {
      setHoveredId(null);
    }
    send('unhighlight-display', { displayId });
  };
  const handleBack = () => {
    console.log('[DisplaySelector] Back button clicked, hiding overlays');
    send('hide-display-overlays', null);
    onClose();
  };

  return (
    <InlineWindow opaque captureMouseEvents>
      <div className="w-48 flex flex-col items-left">
        <WindowTitle>Change Display</WindowTitle>
        <div className="w-44 mx-auto mt-1 flex flex-col items-center">
          <p className="text-white/70 text-xs mb-3 text-left px-2">
            Select a display or click on any overlay.
          </p>
          <div className="space-y-1.5 pt-1 h-fit max-h-96 overflow-y-auto w-full px-1
scrollbar-thin scrollbar-track-transparent scrollbar-thumb-white/50">
            {displays.map((display) => (
              <DisplayItem
                key={display.id}
                display={display}
                isHovered={hoveredId === display.id}
                onClick={() => handleDisplayClick(display.id)}
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
          <WindowFooter shortcuts={<Shortcut label="Close" accelerator="Escape"
            onTrigger={handleBack} />} />
        </div>
      </div>
    </InlineWindow >
  )
}

function DisplayItem({
  display,
  isHovered,
  onClick,
  onMouseEnter,
  onMouseLeave,
}: {
  display: Display;
  isHovered: boolean;
  onClick: () => void;
  onMouseEnter: () => void;
  onMouseLeave: () => void;
}) {
  return (
    <motion.div
      className={cn('w-full flex items-center gap-2 p-2 rounded-md cursor-pointer transition-all duration-200',
        'bg-white/5 border border-white/10',
        display.current && 'opacity-75',
        !display.current && isHovered && 'hover:bg-white/10 border-blue-400/30'
      )}
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
          <span className="text-[10px] px-1.5 py-0.5 mr-1 bg-blue-500/20 text-blue-300
rounded border border-blue-400/30">
            Primary
          </span>
        )}
        {display.current && (
          <span className="text-[10px] px-1.5 py-0.5 bg-green-500/20 text-green-300
rounded border border-green-400/30">
            Current
          </span>
        )}
      </div>
    </motion.div>
  )
}