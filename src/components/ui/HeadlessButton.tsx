import { cn } from "@/lib/utils";
import { forwardRef } from "react";

export const HeadlessButton = forwardRef<
  HTMLButtonElement,
  React.ButtonHTMLAttributes<HTMLButtonElement>
>(({ className, onClick, ...props }, ref) => {
  const handleClick = (e: React.MouseEvent<HTMLButtonElement>) => {
    e.currentTarget.blur();
    onClick?.(e);
  };

  return (
    <button
      ref={ref}
      type="button"
      tabIndex={-1}
      className={cn('focus:outline-none', className)}
      onClick={handleClick}
      {...props}
    />
  );
});