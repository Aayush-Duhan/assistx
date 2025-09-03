import React from 'react';
import { cn } from '@/lib/utils';
import { useGlobalShortcut } from '@/hooks/useGlobalShortcut';
import { HeadlessButton } from './HeadlessButton';
import { Command, ArrowBigUp, CornerDownLeft, ArrowLeft, ArrowRight, ArrowDown, ArrowUp } from 'lucide-react';

type Accelerator = string;
type TriggerEvent = { fromClick: boolean };

interface ShortcutProps {
  label?: React.ReactNode;
  accelerator?: Accelerator;
  onTrigger?: (event: TriggerEvent) => void;
  enable?: 'onlyWhenVisible' | 'always' | boolean;
  large?: boolean;
  shouldHover?: boolean;
  className?: string;
  fullBorderRadius?: boolean;
  showAccelerator?: boolean;
}

export function Shortcut({
  label,
  accelerator,
  onTrigger,
  enable = 'onlyWhenVisible',
  large = false,
  shouldHover = true,
  showAccelerator = true,
  className,
  fullBorderRadius = false,
}: ShortcutProps) {
  useGlobalShortcut(accelerator, () => onTrigger?.({ fromClick: false }), {
    enable: onTrigger ? enable : false,
  });

  const keyParts = accelerator ? parseAccelerator(accelerator) : null;

  const content = (
    <div className={cn(
      "flex items-center gap-2 text-xs text-white/70",
      large && "text-sm",
      !label && "justify-center"
    )}>
      {label && <span className="flex-shrink-0">{label}</span>}
      {keyParts && showAccelerator && (
        <div className="flex gap-1">
          {keyParts.map((part, index) => (
            <div
              key={index}
              className={cn(
                'flex items-center justify-center text-white/70 relative bg-white/10 font-sans',
                large
                  ? 'my-4.5 mx-0.5 px-2 min-w-8 min-h-8 rounded-lg font-bold text-[16px]'
                  : 'px-1 min-w-5 h-5 rounded-md text-[11px]'
              )}
            >
              <div className="relative z-10">{part}</div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
  if (onTrigger) {
    return (
      <div className="relative">
      {shouldHover && (
        <HeadlessButton
          className={cn("absolute -inset-x-1.5 -inset-y-1.5 rounded hover:bg-white/10 focus:bg-white/20 transition", fullBorderRadius ? "rounded-full" : "rounded-md")}
          onClick={() => onTrigger({ fromClick: true })}
        />
      )}
      {content}
    </div>
    );
  }
  return (
    <div className={cn(className)}>
      {content}
    </div>
  );
}

  
interface InlineShortcutProps {
  accelerator: string;
  onTrigger?: () => void;
  enable?: "always" | 'onlyWhenVisible' | boolean;
  size?: 'sm' | 'md';
}

export function InlineShortcut({ accelerator, onTrigger, enable = 'onlyWhenVisible', size = 'md' }: InlineShortcutProps) {
  useGlobalShortcut(accelerator, onTrigger, { enable });
  const keyParts = accelerator ? parseAccelerator(accelerator) : null;
  if (!keyParts) return null;
  return (
    <div className="relative flex items-center pointer-events-none">
      {keyParts.map((part, index) => (
        <div
          key={index}
          className={cn(
            'rounded-md text-white flex items-center justify-center text-[11px]',
            size === 'sm' && 'px-0.5 min-w-3 h-3',
            size === 'md' && 'px-1 min-w-5 h-5'
          )}
        >
          {part}
        </div>
      ))}
    </div>
  );
}

function parseAccelerator(accelerator: Accelerator): (string | JSX.Element)[] {
  return accelerator.split('+').map(part => renderKey(part));
}

function renderKey(key: string): string | JSX.Element {
  const isMac = window.electron.process.platform === 'darwin';
  switch (key) {
    case 'CommandOrControl':
      return isMac ? <Command size={12} /> : 'Ctrl';
    case 'Shift':
      return <ArrowBigUp size={12} />;
    case 'Enter':
      return <CornerDownLeft size={12} />;
    case 'Left':
      return <ArrowLeft size={12} />;
    case 'Right':
      return <ArrowRight size={12} />;
    case 'Down':
      return <ArrowDown size={12} />;
    case 'Up':
      return <ArrowUp size={12} />;
    default:
      return key;
  }
}