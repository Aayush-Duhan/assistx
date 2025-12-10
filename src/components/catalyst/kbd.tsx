import type { ComponentProps } from "react";
import { cn } from "@/lib/utils";

export default function Kbd({
  className,
  style,
  children,
  onWhiteBackground,
  ...rest
}: ComponentProps<"kbd"> & { onWhiteBackground?: boolean }) {
  return (
    <kbd
      className={cn(
        "w-fit min-w-[20px] justify-center items-center inline-flex h-[23px] px-[3px] py-px rounded-md font-sans text-xs",
        className,
      )}
      style={{
        background: onWhiteBackground
          ? "linear-gradient(180deg, #DDE2E8 0%, #D8DEE3 100%)"
          : "linear-gradient(180deg, #30333E 0%, #272931 100%)",
        boxShadow: onWhiteBackground
          ? "0 0.5px 0 0 #FBFBFB inset, 0 -1px 0 0 #AFB4B8 inset"
          : "0 0.5px 0 0 #5C6072 inset, 0 -1px 0 0 #0B0C10 inset",
        ...style,
      }}
      {...rest}
    >
      {children}
    </kbd>
  );
}
