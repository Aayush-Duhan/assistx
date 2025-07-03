import React from 'react';
import { cn } from '@/lib/utils';
import { useGlobalShortcut } from '@/hooks/useGlobalShortcut';
import { HeadlessButton } from './HeadlessButton';
import {
  Command,
  ArrowBigUp,
  CornerDownLeft,
  ArrowLeft,
  ArrowRight,
  ArrowDown,
  ArrowUp,

} from 'lucide-react';

type Accelerator = string;
type TriggerEvent = { fromClick: boolean };

interface ShortcutProps {
  label?: React.ReactNode;
  accelerator: Accelerator;
  onTrigger?: (event: TriggerEvent) => void;
  enable?: boolean | 'onlyWhenVisible';
  large?: boolean;
  fullWidth?: boolean;
  shouldHover?: boolean;
  commandBarHideShortcut?: boolean; // Special prop for unique styling
}

/**
 * A component that displays a label and a keyboard shortcut, and optionally
 * triggers an action when the shortcut is pressed or the component is clicked.
 */
export function Shortcut({
  label,
  accelerator,
  onTrigger,
  enable = 'onlyWhenVisible',
  large = false,
  fullWidth = false,
  shouldHover = true,
  commandBarHideShortcut = false,
}: ShortcutProps) {
  // Register the global shortcut to fire the onTrigger callback.
  useGlobalShortcut(accelerator, () => onTrigger?.({ fromClick: false }), {
    enable: onTrigger ? enable : false,
  });

  const keyParts = accelerator ? parseAccelerator(accelerator) : null;

  const content = (
    <div
      className={cn(
        'relative flex items-center gap-2 pointer-events-none',
        fullWidth && 'justify-between'
      )}
    >
      {label && (
        <p
          className="text-white/90 text-[11px]"
          style={{ color: commandBarHideShortcut ? 'var(--color-zinc-400)' : undefined }}
        >
          {label}
        </p>
      )}
      {keyParts && !commandBarHideShortcut && (
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

  if (!onTrigger) {
    return <div className="relative">{content}</div>;
  }

  return (
    <div className="relative">
      {shouldHover && (
        <HeadlessButton
          className="absolute -inset-x-2 -inset-y-1 rounded hover:bg-white/10 focus:bg-white/20 transition"
          onClick={() => onTrigger({ fromClick: true })}
        />
      )}
      {content}
    </div>
  );
}

/**
 * A smaller, inline version of the shortcut display, without a label.
 */
export function InlineShortcut({ accelerator }: { accelerator: Accelerator }) {
  const keyParts = parseAccelerator(accelerator);
  return (
    <div className="relative flex items-center pointer-events-none">
      {keyParts.map((part, index) => (
        <div
          key={index}
          className="rounded-md text-white flex items-center justify-center text-[11px] px-1 min-w-5 h-5"
        >
          {part}
        </div>
      ))}
    </div>
  );
}

/**
 * Parses an accelerator string (e.g., "CommandOrControl+Enter") into an array
 * of React nodes for rendering. It handles platform-specific modifier keys.
 * @param accelerator The accelerator string to parse.
 * @returns An array of strings or JSX elements representing the keys.
 */
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