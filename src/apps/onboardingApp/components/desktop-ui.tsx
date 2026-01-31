import { LuCornerDownLeft, LuX, LuGripVertical } from "react-icons/lu";
import { FaChevronDown, FaPause, FaStop } from "react-icons/fa6";
import type { HTMLAttributes, InputHTMLAttributes, PropsWithChildren } from "react";
import { useEffect, useRef, useState } from "react";
import { twMerge } from "tailwind-merge";
import { useGlobalShortcut } from "@/hooks/useGlobalShortcut";
import { IS_MAC } from "@/shared/constants";
import { Command } from "./icons";

export function Overlay({
  children,
  className,
  style,
  ...props
}: PropsWithChildren<HTMLAttributes<HTMLDivElement>>) {
  return (
    <div
      className={twMerge(
        "rounded-3xl bg-gradient-to-b h-80 from-[#373840]/75 to-[#1F222D]/75 backdrop-blur-sm flex flex-col justify-between p-4 w-md",
        className,
      )}
      style={{
        ...style,
        boxShadow:
          "0 0 0 0.753px rgba(207, 226, 255, 0.24) inset, 0 -0.377px 0 0 rgba(255, 255, 255, 0.80), 0 131.09px 36.916px 0 rgba(0, 0, 0, 0.00), 0 84.38px 33.903px 0 rgba(0, 0, 0, 0.01), 0 47.464px 28.629px 0 rgba(0, 0, 0, 0.04), 0 21.095px 21.095px 0 rgba(0, 0, 0, 0.07), 0 5.274px 11.301px 0 rgba(0, 0, 0, 0.08)",
      }}
      {...props}
    >
      {children}
    </div>
  );
}

export function UserMessage({
  children,
  className,
  variant = "default",
  ...props
}: PropsWithChildren<HTMLAttributes<HTMLDivElement> & { variant?: "default" | "accent" }>) {
  return (
    <div className="w-full justify-end flex">
      <div
        className={twMerge(
          "flex flex-col gap-2 py-1 pl-2 pr-2.5 rounded-xl rounded-br-sm text-[#CBE3FF] w-fit",
          variant === "default" ? "primary-button" : "accent-button",
          className,
        )}
        {...props}
      >
        {children}
      </div>
    </div>
  );
}

export function AssistantMessage({
  children,
  className,
  ...props
}: PropsWithChildren<HTMLAttributes<HTMLParagraphElement>>) {
  return (
    <p className={twMerge("text-[#F2F2F5]/80 text-sm", className)} {...props}>
      {children}
    </p>
  );
}

export function ToolCall({
  children,
  className,
  ...props
}: PropsWithChildren<HTMLAttributes<HTMLDivElement>>) {
  return (
    <div
      className={twMerge(
        "flex gap-1 [&>svg]:size-4 text-xs text-white/50 items-center font-medium",
        className,
      )}
      {...props}
    >
      {children}
    </div>
  );
}

export function StaticActions({
  children,
  className,
  ...props
}: PropsWithChildren<HTMLAttributes<HTMLDivElement>>) {
  return (
    <div className={twMerge("flex gap-1 items-center", className)} {...props}>
      {children}
    </div>
  );
}

export function StaticAction({
  children,
  className,
  ...props
}: PropsWithChildren<HTMLAttributes<HTMLDivElement>>) {
  return (
    <div
      className={twMerge(
        "flex gap-1 items-center text-sm [&>svg]:size-4 text-white/70 group",
        className,
      )}
      {...props}
    >
      {children}
      <div className="size-1 bg-white/40 ml-1 mr-0.5 rounded-full group-last:hidden"></div>
    </div>
  );
}

export function ChatInput({
  children,
  className,
  value,
  onChange,
  ...props
}: PropsWithChildren<InputHTMLAttributes<HTMLInputElement>>) {
  const [input, setInput] = useState(value || "");
  const inputRef = useRef<HTMLInputElement>(null);

  useGlobalShortcut("CommandOrControl+Enter", () => {
    inputRef.current?.focus();
  });

  useEffect(() => {
    setInput(value || "");
  }, [value]);

  return (
    <div
      className={twMerge(
        "relative border-[0.5px] border-[#9B9B9B] rounded-xl p-2.5 h-10 text-sm",
        className,
      )}
    >
      <input
        className={twMerge(
          "w-full peer absolute inset-0 outline-none bg-transparent text-white px-2.5",
        )}
        placeholder=" "
        value={input}
        onChange={(e) => {
          setInput(e.target.value);
          onChange?.(e);
        }}
        ref={inputRef}
        {...props}
      />
      <div
        className={twMerge(
          "peer-focus:opacity-0 transition-all duration-100 text-white/40 inline-flex items-center pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2",
          input && "opacity-0",
        )}
      >
        Ask,{" "}
        <div className="inline-flex gap-1 mx-1 -translate-y-px items-center">
          <Kbd>{IS_MAC ? <Command /> : "Ctrl"}</Kbd>
          <Kbd>
            <LuCornerDownLeft />
          </Kbd>
        </div>
        to start typing
      </div>
      <div
        className={twMerge(
          "opacity-0 transition-all duration-100 items-center text-white/40 pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2",
          input ? "opacity-0" : "peer-focus:opacity-100",
        )}
      >
        Ask about your screen or conversation, or
        <div className="inline-flex items-center gap-1 mx-1 -translate-y-px">
          <Kbd>
            <LuCornerDownLeft />
          </Kbd>
        </div>
        for Assist
      </div>
      <div className="absolute right-2.5 top-1/2 -translate-y-1/2 flex gap-1 items-center">
        {children}
      </div>
    </div>
  );
}

const Kbd = ({ children }: { children: React.ReactNode }) => {
  return (
    <div className="w-fit min-w-4 font-mono h-5 [&>svg]:size-2.5 translate-y-px inline-flex justify-center items-center text-[10px] text-white/40 border rounded-md px-[3px] py-0.5">
      {children}
    </div>
  );
};

export function CommandBar() {
  return (
    <div className="flex gap-1 items-center dark">
      <div className="size-7 shrink-0" />
      <div className="shadow-pane p-1.5 gap-1 flex items-center bg-surface-opaque rounded-full">
        <div className="shadow-pane-action cursor-pointer flex gap-2 items-center border-[0.5px] border-[#9B9B9B]/40 bg-surface-action py-1.5 pl-2 pr-1 rounded-full text-xs w-fit text-white">
          AssistX for Sales
          <FaChevronDown className="size-4 opacity-50 shrink-0" />
        </div>
        <div className="flex items-center rounded-full w-fit">
          <div className="size-7 group flex justify-center items-center rounded-l-full secondary-button p-[7px] pl-[10px]">
            <FaPause className="size-full text-white group-hover:scale-[115%] origin-[25%_50%] transition-transform duration-150 ease-out" />
          </div>
          <div className="h-[26px] w-[1px] bg-white/[0.17]" />
          <div className="size-7 group flex justify-center items-center rounded-r-full secondary-button p-[7px] pr-[10px]">
            <FaStop className="size-full text-white group-hover:scale-[115%] origin-[75%_50%] transition-transform duration-150 ease-out" />
          </div>
        </div>
        <div className="h-7 w-[1px] bg-white/[0.17] ml-1.5" />
        <div className="size-7 cursor-pointer flex items-center justify-center">
          <LuGripVertical className="size-5 text-white" />
        </div>
      </div>
      <div className="bg-surface-opaque rounded-full shadow-pane-action size-6 p-1.5">
        <LuX className="size-full text-white" />
      </div>
    </div>
  );
}
