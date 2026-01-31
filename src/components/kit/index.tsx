import type { ReactNode } from "react";
import TextareaAutosize from "react-textarea-autosize";
import { twMerge } from "tailwind-merge";
import Kbd from "@/components/catalyst/kbd";
import { useGlobalShortcut } from "@/hooks/useGlobalShortcut";
import { electronAcceleratorToLabels } from "@/lib/utils";

function HeadlessButton({
  className,
  onMouseUp,
  onMouseLeave,
  ...rest
}: React.ComponentProps<"button">) {
  return (
    <button
      type="button"
      tabIndex={-1} // prevent focus
      className={twMerge("focus:outline-none", className)}
      // don't let button remain focused after mouse interaction
      onMouseUp={(event) => {
        event.currentTarget.blur();
        onMouseUp?.(event);
      }}
      onMouseLeave={(event) => {
        event.currentTarget.blur();
        onMouseLeave?.(event);
      }}
      {...rest}
    />
  );
}

function Shortcut({
  label,
  accelerator,
  onTrigger,
  enable = "onlyWhenVisible",
  large = false,
  fullWidth = false,
  shouldHover = true,
  commandBarHideShortcut = false,
  className,
  flushButton = false,
  variant = "primary",
  onWhiteBackground = false,
  dataTestId,
}: {
  label?: ReactNode;
  accelerator?: string;
  onTrigger?: (event: { fromClick: boolean }) => void;
  enable?: boolean | "onlyWhenVisible";
  large?: boolean;
  fullWidth?: boolean;
  shouldHover?: boolean;
  commandBarHideShortcut?: boolean;
  className?: string;
  flushButton?: boolean;
  variant?: "primary" | "alternate";
  onWhiteBackground?: boolean;
  dataTestId?: string;
}) {
  useGlobalShortcut(accelerator, () => onTrigger?.({ fromClick: false }), {
    // don't register the shortcut on the OS level if no trigger is provided
    enable: onTrigger ? enable : false,
  });

  const acceleratorLabels = accelerator ? electronAcceleratorToLabels(accelerator) : null;

  const isAlternate = variant === "alternate";

  return (
    <div className={twMerge("relative", className)}>
      {!!onTrigger && shouldHover && (
        <HeadlessButton
          className={twMerge(
            "absolute transition",
            isAlternate ? "inset-0 rounded-lg z-10" : "rounded-full",
            isAlternate ? undefined : flushButton ? "inset-0" : "-inset-x-2 -inset-y-1",
            enable === false && "pointer-events-none",
            onWhiteBackground
              ? "hover:bg-black/15 active:bg-black/25"
              : "hover:bg-white/10 active:bg-white/20",
          )}
          onClick={() => onTrigger?.({ fromClick: true })}
          {...(dataTestId && { "data-testid": dataTestId })}
        />
      )}
      <div
        className={twMerge(
          "relative flex items-center gap-2 pointer-events-none",
          fullWidth && "justify-between",
          // set min height so that it remains same height even without shortcut display
          large ? "min-h-8" : "min-h-5",
        )}
      >
        {label && (
          <div
            className={twMerge(
              "text-[11px]",
              onWhiteBackground ? "text-black/90" : "text-white/90",
              isAlternate &&
                twMerge(
                  "px-3 py-2 backdrop-blur-sm rounded-lg",
                  onWhiteBackground ? "bg-black/15" : "bg-white/10",
                ),
            )}
            style={{ color: commandBarHideShortcut ? "blue-500" : undefined }}
          >
            {label}
          </div>
        )}
        {acceleratorLabels && !commandBarHideShortcut && (
          <div className="flex gap-1">
            {acceleratorLabels.map((val, i) => (
              <Kbd
                key={i}
                onWhiteBackground={onWhiteBackground}
                className={twMerge(
                  "relative font-sans",
                  onWhiteBackground ? "text-black" : "text-white",
                  large
                    ? "mx-0.5 px-2 min-w-8 min-h-8 rounded-lg font-bold text-[16px]"
                    : "px-1 min-w-5 h-5 rounded-md text-[11px]",
                )}
              >
                <div
                  className={twMerge(
                    "absolute z-0 inset-0 opacity-75 border",
                    large ? "rounded-lg" : "rounded-md",
                  )}
                  style={{ borderColor: "blue-500" }}
                />
                <span className="relative z-10">{typeof val === "string" ? val : val}</span>
              </Kbd>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function InlineShortcut({
  accelerator,
  onTrigger,
  enable = "onlyWhenVisible",
  size = "md",
}: {
  label?: string;
  accelerator: string;
  onTrigger?: () => void;
  size?: "sm" | "md";
  enable?: boolean | "onlyWhenVisible";
}) {
  useGlobalShortcut(accelerator, onTrigger, {
    enable,
  });

  const acceleratorLabels = electronAcceleratorToLabels(accelerator);

  return (
    <div className="relative flex items-center pointer-events-none">
      {acceleratorLabels.map((val, i) => (
        <div
          // biome-ignore lint/suspicious/noArrayIndexKey: static list
          key={i}
          className={twMerge(
            "rounded-md text-white text-[11px] flex items-center justify-center",
            size === "sm" && "px-0.5 min-w-3 h-3",
            size === "md" && "px-1 min-w-5 h-5",
          )}
        >
          {typeof val === "string" ? val : val}
        </div>
      ))}
    </div>
  );
}

function CommandBarStatus({
  label,
  icon,
  level = "transparent",
  fullBorderRadius = false,
  className,
  onClick,
}: {
  label: string;
  icon: React.ReactNode;
  level?: "transparent" | "accent";
  fullBorderRadius?: boolean;
  className?: string;
  onClick?: () => void;
}) {
  return (
    <div className={twMerge("relative", className)}>
      <HeadlessButton
        className={twMerge(
          "absolute -inset-x-2.5 -inset-y-0 rounded-md transition",
          level === "transparent" && "hover:cursor-pointer",
          level === "accent" && "bg-sky-500/60 hover:bg-sky-600/60 active:bg-sky-700/60",
          fullBorderRadius && "rounded-full",
        )}
        onClick={onClick}
      />
      <div className="relative flex items-center h-7.5 gap-2 pointer-events-none">
        <p className="text-white/90 text-[11px]">{label}</p>
        {icon}
      </div>
    </div>
  );
}

const positionToClassName: Record<"top" | "bottom" | "left" | "right", string> = {
  top: "bottom-full left-1/2 -translate-x-1/2",
  bottom: "top-full left-1/2 -translate-x-1/2",
  left: "right-full top-1/2 -translate-y-1/2",
  right: "left-full top-1/2 -translate-y-1/2",
};

function Tooltip({
  tooltipContent,
  children,
  position = "bottom",
  show = "hover",
  gap = 8,
  tooltipClassName,
}: {
  tooltipContent?: React.ReactNode;
  children?: React.ReactNode;
  position?: "top" | "bottom" | "left" | "right";
  show?: "hover" | "always" | "never";
  gap?: number;
  tooltipClassName?: string;
}) {
  if (!tooltipContent) {
    return children;
  }

  const isVertical = position === "top" || position === "bottom";

  return (
    <div className="relative">
      <div className="peer">{children}</div>
      <div
        className={twMerge(
          "absolute z-50 px-2.5 py-1 shadow-pane-action bg-gradient-to-b from-shade-3 to-shade-2 rounded-lg whitespace-nowrap pointer-events-none opacity-0 transition-opacity text-[11px] text-white/90 border-[0.5px] border-white/20",
          positionToClassName[position],
          show === "hover" && "peer-hover:opacity-100",
          show === "always" && "opacity-100",
          show === "never" && "opacity-0",
          tooltipClassName,
        )}
        style={{
          marginTop: isVertical ? gap : undefined,
          marginBottom: isVertical ? gap : undefined,
          marginLeft: isVertical ? undefined : gap,
          marginRight: isVertical ? undefined : gap,
        }}
      >
        {tooltipContent}
      </div>
    </div>
  );
}

/**
 * Usage:
 *
 * ```tsx
 * <CluelyKit.Label text="Label text:">
 *   <CluelyKit.Input />
 * </CluelyKit.Label>
 */
function Label({
  className,
  text,
  children,
}: {
  className?: string;
  text?: string;
  children?: React.ReactNode;
}) {
  return (
    // biome-ignore lint/a11y/noLabelWithoutControl: children will contain <input>
    <label>
      <p className={twMerge("px-4 pt-1 text-xs font-semibold text-white/90", className)}>{text}</p>
      {children}
    </label>
  );
}

function Input({
  className,
  onChange,
  multiLine = false,
  ...rest
}: Omit<React.ComponentProps<"input">, "onChange"> & {
  onChange?: (value: string) => void;
  multiLine?: boolean;
}) {
  // hack: <textarea> and <input> have similar-enough props
  const Component = (multiLine ? TextareaAutosize : "input") as "input";

  // TODO style caret and selection?
  return (
    <Component
      className={twMerge(
        "block w-full resize-none px-4 py-2.5 focus:outline-none text-sm text-white/90 placeholder:text-white/60 disabled:text-white/60 scrollbar-thin scrollbar-track-transparent scrollbar-thumb-white/50",
        className,
      )}
      onChange={(e) => onChange?.(e.target.value)}
      {...rest}
    />
  );
}

function Button({
  className,
  level = "standard",
  size = "sm",
  onClick,
  ...rest
}: Omit<React.ComponentProps<"button">, "onClick"> & {
  size?: "sm" | "lg";
  level?: "standard" | "accent";
  onClick?: () => void;
}) {
  // mimic macOS "About This Mac -> More Info..." button
  return (
    <HeadlessButton
      className={twMerge(
        "rounded shadow border-t border-b border-t-white/10 border-b-white/5 text-xs text-white disabled:opacity-60 transition",
        size === "sm" && "px-2.5 py-0.5",
        size === "lg" && "px-3.5 py-1.5",
        level === "standard" && "bg-white/20 active:bg-white/30",
        level === "accent" && "bg-sky-600 active:bg-sky-500",
        className,
      )}
      onClick={onClick}
      {...rest}
    />
  );
}

function WindowTitle({
  shortcuts,
  className,
  children,
}: {
  shortcuts?: React.ReactNode;
  className?: string;
  children?: React.ReactNode;
}) {
  return (
    <div className={twMerge("px-4 py-2 flex items-center gap-6", className)}>
      {!!children && <div className="flex-1 text-white/90 text-xs font-semibold">{children}</div>}
      {!!shortcuts && <div className="flex items-center gap-6">{shortcuts}</div>}
    </div>
  );
}

/** Can specify no shortcuts or children to get a blank space */
function WindowFooter({
  shortcuts,
  className,
  children,
}: {
  shortcuts?: React.ReactNode;
  className?: string;
  children?: React.ReactNode;
}) {
  if (!shortcuts && !children) {
    return <div className="h-3" />;
  }

  return (
    <div className={twMerge("px-4 py-2 flex flex-col items-center gap-2", className)}>
      {shortcuts}
      {!!children && <div className="text-white/60 text-xs max-w-full">{children}</div>}
    </div>
  );
}

function WindowMessage({
  className,
  children,
}: {
  className?: string;
  children?: React.ReactNode;
}) {
  return <div className={twMerge("px-4 text-white/90 text-sm", className)}>{children}</div>;
}

export const kit = {
  HeadlessButton,
  Shortcut,
  InlineShortcut,
  CommandBarStatus,
  Tooltip,
  Label,
  Input,
  Button,
  WindowTitle,
  WindowFooter,
  WindowMessage,
};
