import React, { ButtonHTMLAttributes, forwardRef, useRef } from "react";
import { cn } from "@/lib/utils";

interface HeadlessButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  className?: string;
  children?: React.ReactNode;
  onClick?: (event: React.MouseEvent<HTMLButtonElement>) => void;
}

// --- HeadlessButton Component ---

/**
 * A foundational, unstyled button component that forwards all props and a ref.
 * It handles the basic logic of blurring on click to prevent a persistent focus ring.
 */
export const HeadlessButton = forwardRef<HTMLButtonElement, HeadlessButtonProps>(
  ({ className, onClick, ...props }, ref) => {
    const internalRef = useRef<HTMLButtonElement>(null);
    const handleClick = (event: React.MouseEvent<HTMLButtonElement>) => {
      internalRef.current?.blur();
      onClick?.(event);
    };

    return (
      <button
        ref={(node) => {
          // Forward the ref to both the internal and external ref
          if (node) {
            (internalRef as React.MutableRefObject<HTMLButtonElement>).current = node;
            if (typeof ref === 'function') {
              ref(node);
            } else if (ref) {
              ref.current = node;
            }
          }
        }}
        type="button"
        tabIndex={-1}
        className={cn('focus:outline-none', className)}
        onClick={handleClick}
        {...props}
      />
    );
  }
);
