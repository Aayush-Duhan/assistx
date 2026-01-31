import React from "react";
import logoImg from "@/assets/logo.png";
import { cn } from "@/lib/utils";

interface LogoProps {
  /**
   * The size of the logo in pixels if a number is provided,
   * or any valid CSS dimension string. Defaults to 32.
   */
  size?: number | string;
  /**
   * Additional CSS classes for the container.
   */
  className?: string;
  /**
   * Whether to enable hover/active animations. Defaults to true.
   */
  animate?: boolean;
}

/**
 * A reusable component for the AssistX application logo.
 * Uses the high-resolution PNG source and supports flexible sizing.
 */
export const Logo: React.FC<LogoProps> = ({ size = 32, className = "", animate = true }) => {
  const sizeValue = typeof size === "number" ? `${size}px` : size;

  return (
    <div
      className={cn(
        "inline-flex items-center justify-center overflow-hidden shrink-0 select-none",
        animate && "transition-all duration-300 hover:scale-110 active:scale-95",
        className,
      )}
      style={{ width: sizeValue, height: sizeValue }}
    >
      <img
        src={logoImg}
        alt="AssistX Logo"
        className="w-full h-full object-contain"
        draggable={false}
      />
    </div>
  );
};
