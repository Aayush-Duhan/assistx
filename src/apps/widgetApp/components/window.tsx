import type React from "react";
import { twMerge } from "tailwind-merge";

export function Window({
  fullRadius,
  children,
  className,
  ...props
}: {
  fullRadius?: boolean;
  children: React.ReactNode;
  className?: string;
} & React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      {...props}
      className={twMerge(
        "border border-white/25 rounded-2xl flex",
        fullRadius && "rounded-full",
        className,
      )}
    >
      {children}
    </div>
  );
}
