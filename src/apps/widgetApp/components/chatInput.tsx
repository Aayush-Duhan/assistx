import { PiSlidersHorizontal } from "react-icons/pi";
import { DEFAULT_KEYBINDINGS, useSharedState } from "@/shared";
import { motion, type Transition } from "motion/react";
import { useEffect, useState } from "react";
import TextareaAutosize from "react-textarea-autosize";
import { twMerge } from "tailwind-merge";
import { Send } from "@/assets/send";
import { kit } from "@/components/kit";
import { electronAcceleratorToLabels } from "@/lib/utils";
import { useKeybindings } from "@/hooks/useKeybindings";
import { useGlobalServices } from "@/services/GlobalServicesContextProvider";
import { useShowConversation } from "../hooks/useShowConversation";
import { Popover } from "@base-ui-components/react/popover";
import { CaptureMouseEventsWrapper } from "@/components/captureMouseEventsWrapper";
import { SettingsPanel } from "./settingsPanel";
import { ModelList, ModelSelectorTrigger } from "../chat/select-model";
import { chatModelAtom } from "@/stores/modelStore";
import { useAtom } from "jotai";

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
}: {
  ref: React.RefObject<HTMLTextAreaElement | null>;
  value: string;
  onChange: (value: string) => void;
  onFocus: () => void;
  onBlur: () => void;
  onSubmit: () => void;
  isFocused: boolean;
}) {
  const [isExpanded, setIsExpanded] = useState(false);
  const { aiResponsesService } = useGlobalServices();

  useEffect(() => {
    if (isFocused) {
      setIsExpanded(true);
    }

    const onWindowBlur = () => {
      setIsExpanded(false);
    };

    window.addEventListener("blur", onWindowBlur);

    return () => window.removeEventListener("blur", onWindowBlur);
  }, [isFocused]);

  const keybindings = useKeybindings();
  const triggerAiKbdLabels = electronAcceleratorToLabels(
    keybindings.trigger_ai ?? DEFAULT_KEYBINDINGS.trigger_ai,
  );

  const [showSettings, setShowSettings] = useState(false);
  const { undetectabilityEnabled } = useSharedState();
  const showConversation = useShowConversation();
  const [currentModel, setChatModel] = useAtom(chatModelAtom);
  const [isModelSelectorOpen, setIsModelSelectorOpen] = useState(false);

  useEffect(() => {
    setShowSettings(false);
  }, [undetectabilityEnabled]);

  useEffect(() => {
    if (!isExpanded) {
      setShowSettings(false);
    }
  }, [isExpanded]);

  useEffect(() => {
    return () => setShowSettings(false);
  }, []);

  return (
    <motion.div
      className={twMerge(
        "rounded-lg relative mt-px overflow-hidden",
        showConversation ? "border-[0.5px] border-[#9B9B9B]/40 mx-2.5 mb-2.5" : "mx-2 mb-2",
      )}
      style={{
        boxShadow: showConversation ? "0 -1px 0 0 rgba(255, 255, 255, 0.25)" : undefined,
      }}
      initial={{ height: "fit-content" }}
      animate={{
        height: isExpanded ? "fit-content" : showConversation ? "40px" : "36px",
      }}
      transition={expandTransition}
    >
      <motion.div
        initial={{ height: "fit-content" }}
        animate={{
          height: isExpanded ? "fit-content" : showConversation ? "40px" : "36px",
        }}
        transition={expandTransition}
      >
        <TextareaAutosize
          ref={ref}
          style={{
            boxShadow: showConversation ? "0 2px 20px -1px rgba(0, 0, 0, 0.05) inset" : undefined,
          }}
          maxRows={2}
          className={twMerge(
            "relative z-10 block resize-none w-full rounded-t-lg focus:outline-none text-[13px] text-white scrollbar-thin scrollbar-track-transparent scrollbar-thumb-white/50",
            showConversation ? "p-2" : "p-1.5",
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
          className={twMerge(
            "absolute text-[13px] pointer-events-none text-white/60 flex items-center gap-1",
            showConversation ? "top-2 left-2 right-2" : "top-1.5 left-1.5 right-1.5",
          )}
        >
          Ask about your screen or conversation, or
          <div className="flex items-center gap-1">
            {triggerAiKbdLabels.map((label, index) => (
              // biome-ignore lint/suspicious/noArrayIndexKey: static
              <Kbd key={index} char={label} />
            ))}
          </div>
          for Assist
        </motion.span>
      )}
      <div className="rounded-b-lg">
        <div className="rounded-b-lg flex items-center justify-between">
          <div className="flex items-center w-fit p-0.5 gap-0.5">
            <Popover.Root open={showSettings} onOpenChange={setShowSettings}>
              <Popover.Trigger className="focus:outline-none">
                <kit.HeadlessButton className="hover:text-white/70 hover:border-white/40 p-1 pl-0">
                  <div
                    className={twMerge(
                      "flex h-[26px] px-2 gap-1 items-center justify-start text-xs overflow-hidden rounded-full",
                      "text-white/40 bg-white/10",
                    )}
                  >
                    <PiSlidersHorizontal className="size-4" />
                  </div>
                </kit.HeadlessButton>
              </Popover.Trigger>

              <Popover.Portal keepMounted={false}>
                <Popover.Positioner align="start" side="top" sideOffset={8}>
                  <Popover.Popup>
                    <CaptureMouseEventsWrapper>
                      <SettingsPanel />
                    </CaptureMouseEventsWrapper>
                  </Popover.Popup>
                </Popover.Positioner>
              </Popover.Portal>
            </Popover.Root>

            {/* Model Selector Trigger */}
            <ModelSelectorTrigger
              model={currentModel}
              onClick={() => setIsModelSelectorOpen(!isModelSelectorOpen)}
              showProvider={false}
              className="p-1 h-[26px]"
            />
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

      {/* Inline Model List */}
      {isModelSelectorOpen && (
        <div className="border-t border-white/10">
          <ModelList
            selectedModel={currentModel}
            onSelect={(model) => {
              setChatModel(model);
              setIsModelSelectorOpen(false);
            }}
            className="w-full border-0 bg-transparent shadow-none"
          />
        </div>
      )}
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
