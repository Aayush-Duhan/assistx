import { IconImages3 } from "@central-icons-react/round-filled-radius-2-stroke-1.5";
import { DEFAULT_KEYBINDINGS } from "@/shared";
import { motion, type Transition } from "motion/react";
import { useEffect, useState } from "react";
import TextareaAutosize from "react-textarea-autosize";
import { twMerge } from "tailwind-merge";
import { Send } from "@/assets/send";
import { kit } from "@/components/kit";
import { electronAcceleratorToLabels } from "@/lib/utils"
import { useKeybindings } from "@/hooks/useKeybindings";
import { useGlobalServices } from "@/services/GlobalServicesContextProvider";
import { useScreenEnabled } from "@/hooks/useScreenEnabled";
// import ModeSelector from "../chat/modeSelector";

const expandTransition: Transition = {
  type: "spring",
  stiffness: 1000,
  damping: 50,
};

export function ChatInput({
  ref,
  value,
  onChange,
  onFocus,
  onBlur,
  onSubmit,
  isFocused,
  mode,
}: {
  ref: React.RefObject<HTMLTextAreaElement | null>;
  value: string;
  onChange: (value: string) => void;
  onFocus: () => void;
  onBlur: () => void;
  onSubmit: () => void;
  isFocused: boolean;
  mode: "chat" | "transcript";
}) {
  const [isExpanded, setIsExpanded] = useState(false);
  const { aiResponsesService } = useGlobalServices();
  const [useScreen, setUseScreen] = useScreenEnabled();

  useEffect(() => {
    if (mode === "transcript") return;

    if (isFocused) {
      setIsExpanded(true);
    }

    const onWindowBlur = () => {
      setIsExpanded(false);
    };

    window.addEventListener("blur", onWindowBlur);

    return () => window.removeEventListener("blur", onWindowBlur);
  }, [isFocused, mode]);

  const keybindings = useKeybindings();
  const triggerAiKbdLabels = electronAcceleratorToLabels(
    keybindings.trigger_ai ?? DEFAULT_KEYBINDINGS.trigger_ai,
  );

  return (
    <motion.div
      className="rounded-lg overflow-hidden relative mx-3 mb-3 mt-px border-[0.5px] border-[#9B9B9B]/40"
      style={{
        boxShadow: "0 -1px 0 0 rgba(255, 255, 255, 0.25)",
      }}
      initial={{ height: "fit-content" }}
      animate={{
        height: isExpanded ? "fit-content" : "40px",
      }}
      transition={expandTransition}
    >
      <motion.div
        initial={{ height: "fit-content" }}
        animate={{
          height: isExpanded ? "fit-content" : "40px",
        }}
        transition={expandTransition}
      >
        <TextareaAutosize
          ref={ref}
          style={{
            boxShadow: "0 2px 20px -1px rgba(0, 0, 0, 0.05) inset",
          }}
          maxRows={2}
          className={twMerge(
            "relative z-10 block resize-none w-full p-2.5 rounded-t-lg focus:outline-none text-[13px] text-white scrollbar-thin scrollbar-track-transparent scrollbar-thumb-white/50",
          )}
          data-testid="chat-input"
          value={value}
          onFocus={onFocus}
          onBlur={onBlur}
          onChange={(event) => onChange(event.target.value)}
        />
      </motion.div>
      {value === "" && (
        <motion.span
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.1 }}
          className="absolute top-2.5 left-2.5 right-2.5 text-[13px] pointer-events-none text-white/60 flex items-center gap-1"
        >
          Ask about your screen or conversation, or
          <div className="flex items-center gap-1">
            {triggerAiKbdLabels.map((label, index) => (
              <Kbd key={index} char={label} />
            ))}
          </div>
          for Assist
        </motion.span>
      )}
      <div className="rounded-b-lg">
        <div className="bg-surface-chat-footer rounded-b-lg flex border-white/25 border-t-[0.5px] items-center gap-2 justify-between">
          <div className="flex items-center w-fit">
            <kit.Tooltip tooltipContent="Uses your screen to provide better answers">
              <kit.HeadlessButton
                className={twMerge("hover:text-white/70 hover:border-white/40 p-1 pl-1 group/pill")}
                onClick={() => {
                  setUseScreen(!useScreen);
                }}
              >
                <div
                  className={twMerge(
                    "flex h-[26px] pl-1.5 pr-2 gap-1 items-center justify-start text-xs overflow-hidden rounded-full",
                    "bg-surface-action text-white/40 border border-white/15",
                    "group-hover/pill:text-primary-foreground group-hover/pill:border-white/25",
                    useScreen &&
                    "text-[#6EC0F2] bg-[#2377ED]/20 border-[#3C92E9]/50 group-hover/pill:text-[#6EC0F2] group-hover/pill:bg-[#2377ED]/30 group-hover/pill:border-[#3C92E9]/80",
                  )}
                >
                  <IconImages3 size={12} className="shrink-0 fill-current" />
                  Use Screen
                </div>
              </kit.HeadlessButton>
            </kit.Tooltip>
            {/* <ModeSelector /> */}
          </div>
          <motion.div
            className={twMerge("flex items-center gap-1.5 absolute")}
            layout
            transition={expandTransition}
            style={isExpanded ? { right: 8, bottom: 6 } : { right: 8, bottom: 8 }}
          >
            <kit.HeadlessButton
              className="p-1.5 size-6 gap-1 text-xs rounded-full primary-button flex items-center justify-center text-white"
              data-testid="submit-manual-input"
              onClick={() => {
                onSubmit();
                aiResponsesService.setClickedAskAi(true);
              }}
            >
              <Send className="size-3.5" />
            </kit.HeadlessButton>
          </motion.div>
        </div>
      </div>
    </motion.div>
  );
}

const Kbd = ({ char }: { char: React.ReactNode }) => {
  return (
    <div className="w-5 h-5.5 bg-linear-to-b from-black/10 to-black/15 inline-flex justify-center items-center font-mono text-[10px] text-white/50 border-white/20 border-0.5 border rounded-md px-[3px] py-0.5">
      {char}
    </div>
  );
};
