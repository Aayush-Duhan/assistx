import clsx from 'clsx';
import { ReactNode } from 'react';

// Type definitions
interface WindowFooterProps {
    shortcuts?: ReactNode;
    className?: string;
    children?: ReactNode;
  }

/**
 * A component for displaying window footers with consistent styling.
 */
export const WindowFooter = ({ shortcuts, className, children }: WindowFooterProps) => {
    if (!shortcuts && !children) {
      return <div className="h-3" />; // Render a spacer if empty
    }
    return (
      <div className={clsx('px-4 py-2 flex flex-col items-center gap-2', className)}>
        {shortcuts}
        {!!children && <div className="text-white/60 text-xs max-w-full">{children}</div>}
      </div>
    );
  };