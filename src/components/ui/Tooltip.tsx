import { cn } from '@/lib/utils';
import { ReactNode } from 'react';
import { useMovableWindowApi } from '@/hooks/useMovableWindow';

interface TooltipProps {
  tooltipContent?: ReactNode;
  children: ReactNode;
  position?: 'top' | 'bottom' | 'left' | 'right';
  show?: 'hover' | 'always' | 'never';
  gap?: number;
  tooltipClassName?: string;
}

const positionClasses = {
  top: 'bottom-full left-1/2 -translate-x-1/2',
  bottom: 'top-full left-1/2 -translate-x-1/2',
  left: 'right-full top-1/2 -translate-y-1/2',
  right: 'left-full top-1/2 -translate-y-1/2',
};

export const Tooltip = ({
  tooltipContent,
  children,
  position = 'bottom',
  show = 'hover',
  gap = 8,
  tooltipClassName,
}: TooltipProps) => {
  if (!tooltipContent) {
    return <>{children}</>;
  }
  const isVertical = position === 'top' || position === 'bottom';
  return (
    <div className="relative">
      <div className="peer">{children}</div>
      <div
        className={cn(
          'absolute z-50 px-3 py-2 shadow-lg bg-zinc-950/95 rounded-lg whitespace-nowrap pointer-events-none opacity-0 transition-opacity text-[11px] text-white/90',
          positionClasses[position],
          {
            'peer-hover:opacity-100': show === 'hover',
            'opacity-100': show === 'always',
            'opacity-0': show === 'never',
          },
          tooltipClassName,
        )}
        style={{
          marginTop: isVertical ? gap : undefined,
          marginBottom: isVertical ? gap : undefined,
          marginLeft: !isVertical ? gap : undefined,
          marginRight: !isVertical ? gap : undefined,
        }}
      >
        {tooltipContent}
      </div>
    </div>
  );
};

export function MovableTooltip(props: Omit<React.ComponentProps<typeof Tooltip>, 'position'>) {
  const { vOrientation } = useMovableWindowApi();
  return <Tooltip position={vOrientation === 'top' ? 'bottom' : 'top'} {...props} />;
}