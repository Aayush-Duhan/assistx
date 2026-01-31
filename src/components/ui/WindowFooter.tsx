import { cn } from "@/lib/utils";
import { ReactNode } from "react";

interface WindowFooterProps {
  shortcuts?: ReactNode;
  className?: string;
  children?: ReactNode;
}

export const WindowFooter = ({ shortcuts, className, children }: WindowFooterProps) => {
  if (!shortcuts && !children) {
    return <div className="h-3" />;
  }
  return (
    <div className={cn("px-4 py-2 flex flex-col items-center gap-2", className)}>
      {shortcuts}
      {!!children && <div className="text-white/60 text-xs max-w-full">{children}</div>}
    </div>
  );
};
