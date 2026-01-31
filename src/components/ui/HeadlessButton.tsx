import { cn } from "@/lib/utils";
import { forwardRef } from "react";

interface HeadlessButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  className?: string;
  onMouseUp?: (event: React.MouseEvent<HTMLButtonElement>) => void;
  onMouseLeave?: (event: React.MouseEvent<HTMLButtonElement>) => void;
}

export const HeadlessButton = forwardRef<HTMLButtonElement, HeadlessButtonProps>(
  ({ className, onMouseUp, onMouseLeave, ...props }, ref) => {
    return (
      <button
        type="button"
        tabIndex={-1}
        ref={ref}
        className={cn("focus:outline-none", className)}
        onMouseUp={(event) => {
          event.currentTarget.blur();
          onMouseUp?.(event);
        }}
        onMouseLeave={(event) => {
          event.currentTarget.blur();
          onMouseLeave?.(event);
        }}
        {...props}
      />
    );
  },
);

HeadlessButton.displayName = "HeadlessButton";
