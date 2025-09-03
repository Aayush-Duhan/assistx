import { cn } from '@/lib/utils';
import { HeadlessButton } from './HeadlessButton';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  level?: 'standard' | 'accent';
  size?: 'sm' | 'lg';
}

export function Button({
  className,
  level = 'standard',
  size = 'sm',
  onClick,
  ...props
}: ButtonProps) {
  return (
    <HeadlessButton
      className={cn(
        'rounded shadow border-t border-b border-t-white/10 border-b-white/5 text-xs text-white disabled: opacity - 60 transition',
        size === 'sm' && 'px-2.5 py-0.5',
        size === 'lg' && 'px-3.5 py-1.5',
        level === 'standard' && 'bg-white/20 focus:bg-white/30 ',
        level === 'accent' && 'bg-blue-600 focus:bg-blue-500',
        className
      )}
      onClick={onClick}
      {...props}
    />
  );
}
