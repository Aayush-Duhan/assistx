import clsx from 'clsx';
import { ReactNode } from 'react';

// Type definitions
interface TooltipProps {
  tooltipContent: ReactNode;
  children: ReactNode;
  position?: 'top' | 'bottom' | 'left' | 'right';
  tooltipClassName?: string;
}

const positionClasses = {
  top: 'bottom-full left-1/2 -translate-x-1/2 mb-2',
  bottom: 'top-full left-1/2 -translate-x-1/2 mt-2',
  left: 'right-full top-1/2 -translate-y-1/2 mr-2',
  right: 'left-full top-1/2 -translate-y-1/2 ml-2',
};

/**
 * A simple CSS-driven tooltip that appears when hovering over its child element.
 */
export const Tooltip = ({ tooltipContent, children, position = 'bottom',tooltipClassName }: TooltipProps) => {
    if (!tooltipContent) {
      return <>{children}</>;
    }
    return (
      <div className="relative">
        <div className="peer">{children}</div>
        <div
          className={clsx(
            'absolute px-3 py-2 shadow-lg bg-zinc-950/95 rounded-lg whitespace-nowrap',
            'opacity-0 peer-hover:opacity-100 transition-opacity pointer-events-none',
            'text-[11px] text-white/90 z-50',
            positionClasses[position],
            tooltipClassName
          )}
        >
          {tooltipContent}
        </div>
      </div>
    );
  };