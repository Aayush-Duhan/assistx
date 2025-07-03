import { clsx } from "clsx";
import { ReactNode } from "react";

interface WindowMessageProps {
    className?: string;
    children?: ReactNode;
  }
  
  /**
   * A standard text component for displaying messages within a window.
   */
export const WindowMessage = ({ className, children }: WindowMessageProps) => {
    return <div className={clsx('px-4 text-white/90 text-sm', className)}>{children}</div>;
  };