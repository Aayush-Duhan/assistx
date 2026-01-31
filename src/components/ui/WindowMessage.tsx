import { cn } from "@/lib/utils";
import { ReactNode } from "react";

interface WindowMessageProps {
  className?: string;
  children?: ReactNode;
}

export const WindowMessage = ({ className, children }: WindowMessageProps) => {
  return <div className={cn("px-4 text-white/90 text-sm", className)}>{children}</div>;
};
