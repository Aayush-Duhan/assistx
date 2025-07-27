import { cn } from '@/lib/utils';
import { ReactNode } from 'react';

type WindowTitleProps = {
  shortcuts?: ReactNode;
  className?: string;
  children?: ReactNode;
};

export const WindowTitle = ({ shortcuts, className, children }: WindowTitleProps) => {
  return (
    <div className={cn('px-4 py-2 flex items-center gap-6', className)}>
      {!!children && <div className="flex-1 text-white/90 text-xs font-semibold">{children}</div>}
      {!!shortcuts && <div className="flex items-center gap-6">{shortcuts}</div>}
    </div>
  );
};