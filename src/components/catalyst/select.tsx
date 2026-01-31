"use client";

import * as SelectPrimitive from "@radix-ui/react-select";
import { LuCheck, LuChevronDown, LuChevronUp } from "react-icons/lu";
import type * as React from "react";
import { twMerge } from "tailwind-merge";
import { CaptureMouseEventsWrapper } from "@/components/captureMouseEventsWrapper";

function Select({ ...props }: React.ComponentProps<typeof SelectPrimitive.Root>) {
  return <SelectPrimitive.Root data-slot="select" {...props} />;
}

function SelectGroup({ ...props }: React.ComponentProps<typeof SelectPrimitive.Group>) {
  return <SelectPrimitive.Group data-slot="select-group" {...props} />;
}

function SelectValue({ ...props }: React.ComponentProps<typeof SelectPrimitive.Value>) {
  return <SelectPrimitive.Value data-slot="select-value" {...props} />;
}

function SelectTrigger({
  className,
  size = "default",
  children,
  ...props
}: React.ComponentProps<typeof SelectPrimitive.Trigger> & {
  size?: "sm" | "default";
}) {
  return (
    <SelectPrimitive.Trigger
      data-slot="select-trigger"
      data-size={size}
      className={twMerge(
        "shadow-pane-action flex gap-2 items-center justify-between border-[0.5px] border-[#9B9B9B]/40 hover:bg-surface-action-hover bg-surface-action py-1.5 pl-2 pr-1 text-primary-foreground rounded-lg text-xs focus:outline-none w-full max-w-[150px]",
        className,
      )}
      {...props}
    >
      {children}
      <SelectPrimitive.Icon asChild>
        <LuChevronDown className="size-4 opacity-50 shrink-0" />
      </SelectPrimitive.Icon>
    </SelectPrimitive.Trigger>
  );
}

function SelectContent({
  className,
  children,
  position = "popper",
  ...props
}: React.ComponentProps<typeof SelectPrimitive.Content>) {
  const container = document.getElementById("radix-portal-root") as HTMLElement;

  return (
    // Will default to body if container doesn't exist for whatever reason
    <SelectPrimitive.Portal container={container}>
      <SelectPrimitive.Content
        data-slot="select-content"
        className={twMerge(
          "shadow-pane-action border-[0.5px] border-[#9B9B9B]/40 bg-shade-2 rounded-xl text-xs focus:outline-none mt-1 z-50 overflow-hidden relative",
          position === "popper" &&
            "data-[side=bottom]:translate-y-1 data-[side=left]:-translate-x-1 data-[side=right]:translate-x-1 data-[side=top]:-translate-y-1",
          className,
        )}
        position={position}
        {...props}
      >
        <SelectScrollUpButton />
        <SelectPrimitive.Viewport
          className={twMerge(
            "p-1",
            position === "popper" &&
              "h-[var(--radix-select-trigger-height)] w-full min-w-[var(--radix-select-trigger-width)] scroll-my-1",
          )}
        >
          <CaptureMouseEventsWrapper>{children}</CaptureMouseEventsWrapper>
        </SelectPrimitive.Viewport>
      </SelectPrimitive.Content>
    </SelectPrimitive.Portal>
  );
}

function SelectLabel({ className, ...props }: React.ComponentProps<typeof SelectPrimitive.Label>) {
  return (
    <SelectPrimitive.Label
      data-slot="select-label"
      className={twMerge(
        "text-muted-foreground font-medium px-1 pt-1 pb-1.5 mb-1 text-[11px] border-b border-shade-7",
        className,
      )}
      {...props}
    />
  );
}

function SelectItem({
  className,
  children,
  ...props
}: React.ComponentProps<typeof SelectPrimitive.Item>) {
  return (
    <SelectPrimitive.Item
      data-slot="select-item"
      className={twMerge(
        "px-1 py-1.5 rounded-lg border-[0.5px] border-transparent hover:border-shade-7 hover:text-primary-foreground gap-2 text-foreground hover:bg-surface-action-hover data-focus:bg-surface-action-hover cursor-pointer flex items-center justify-between w-full focus-visible:outline-none",
        className,
      )}
      {...props}
    >
      <SelectPrimitive.ItemText>{children}</SelectPrimitive.ItemText>
      <span className="flex size-3.5 items-center justify-center">
        <SelectPrimitive.ItemIndicator>
          <LuCheck className="size-3.5" />
        </SelectPrimitive.ItemIndicator>
      </span>
    </SelectPrimitive.Item>
  );
}

function SelectSeparator({
  className,
  ...props
}: React.ComponentProps<typeof SelectPrimitive.Separator>) {
  return (
    <SelectPrimitive.Separator
      data-slot="select-separator"
      className={twMerge("bg-border pointer-events-none -mx-1 my-1 h-px", className)}
      {...props}
    />
  );
}

function SelectScrollUpButton({
  className,
  ...props
}: React.ComponentProps<typeof SelectPrimitive.ScrollUpButton>) {
  return (
    <SelectPrimitive.ScrollUpButton
      data-slot="select-scroll-up-button"
      className={twMerge(
        "flex cursor-default items-center justify-center py-1 bg-gradient-to-b from-shade-2 to-transparent text-muted-foreground absolute top-0 left-0 right-0 z-50",
        className,
      )}
      {...props}
    >
      <LuChevronUp className="size-4" />
    </SelectPrimitive.ScrollUpButton>
  );
}

function SelectScrollDownButton({
  className,
  ...props
}: React.ComponentProps<typeof SelectPrimitive.ScrollDownButton>) {
  return (
    <SelectPrimitive.ScrollDownButton
      data-slot="select-scroll-down-button"
      className={twMerge(
        "flex cursor-default items-center justify-center py-1 bg-gradient-to-t from-shade-2 to-transparent text-muted-foreground absolute bottom-0 left-0 right-0 z-50",
        className,
      )}
      {...props}
    >
      <LuChevronDown className="size-4" />
    </SelectPrimitive.ScrollDownButton>
  );
}

export {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectScrollDownButton,
  SelectScrollUpButton,
  SelectSeparator,
  SelectTrigger,
  SelectValue,
};
