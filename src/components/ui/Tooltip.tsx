import { cn } from '@/lib/utils';
import { AnimatePresence, motion } from 'framer-motion';
import { ReactNode, useState } from 'react';
import { useMovableWindowApi } from '@/hooks/useMovableWindow';
import { useHover } from '@react-aria/interactions';

interface TooltipProps {
  tooltipContent?: ReactNode;
  children: ReactNode;
  position?: 'top' | 'bottom' | 'left' | 'right';
  show?: 'hover' | 'always' | 'never';
  gap?: number;
  tooltipClassName?: string;
}

const animationVariants = {
  top: { initial: { opacity: 0, y: 4 }, animate: { opacity: 1, y: 0 }, exit: { opacity: 0, y: 4 } },
  bottom: { initial: { opacity: 0, y: -4 }, animate: { opacity: 1, y: 0 }, exit: { opacity: 0, y: -4 } },
  left: { initial: { opacity: 0, x: 4 }, animate: { opacity: 1, x: 0 }, exit: { opacity: 0, x: 4 } },
  right: { initial: { opacity: 0, x: -4 }, animate: { opacity: 1, x: 0 }, exit: { opacity: 0, x: -4 } },
};

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
  const [isHovered, setIsHovered] = useState(false);
  const { hoverProps } = useHover({
    onHoverStart: () => setIsHovered(true),
    onHoverEnd: () => setIsHovered(false),
  });
  const shouldShow = show === 'always' || (show === 'hover' && isHovered);
  return (
    <div className="relative inline-flex" {...hoverProps}>
      {children}
      <AnimatePresence>
        {shouldShow && (
          <motion.div
            {...animationVariants[position]}
            transition={{ duration: 0.15, ease: 'easeOut' }}
            className={cn(
              "absolute z-50 pointer-events-none",
              positionClasses[position]
            )}
            style={{
              ...(position === 'top' && { marginBottom: `${gap}px`}),
              ...(position === 'bottom' && { marginTop: `${gap}px`}),
              ...(position === 'left' && { marginRight: `${gap}px`}),
              ...(position === 'right' && { marginLeft: `${gap}px`}),
            }}
          >
            <div
              className={cn(
                "px-2 py-2 bg-black/80 text-white text-xs font-medium rounded-md shadow-lg whitespace-nowrap",
                tooltipClassName
              )}
            >
              {tooltipContent}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export function MovableTooltip(props: Omit<React.ComponentProps<typeof Tooltip>, 'position'>) {
  const { vOrientation } = useMovableWindowApi();
  return <Tooltip position={vOrientation === 'top' ? 'bottom' : 'top'} {...props} />;
}