import clsx from 'clsx';
import { ReactNode } from 'react';

// --- Type Definition for Component Props ---

/**
 * Defines the props accepted by the WindowTitle component.
 */
type WindowTitleProps = {
  /**
   * Optional components (like Shortcuts) to render on the right side of the title bar.
   * Can be a single element, an array of elements, or a fragment.
   */
  shortcuts?: ReactNode;

  /**
   * Optional additional CSS classes to apply to the root element for custom styling.
   */
  className?: string;

  /**
   * The main title content to display on the left side of the title bar.
   */
  children?: ReactNode;
};


// --- Component Implementation ---

/**
 * A component that renders a standardized window title bar.
 * It displays a title on the left and can optionally display a set of shortcuts on the right.
 */
export const WindowTitle = ({ shortcuts, className, children }: WindowTitleProps) => {
  return (
    <div className={clsx('px-4 py-2 flex items-center gap-6', className)}>
      {!!children && <div className="flex-1 text-white/90 text-xs font-semibold">{children}</div>}
      {!!shortcuts && <div className="flex items-center gap-6">{shortcuts}</div>}
    </div>
  );
};