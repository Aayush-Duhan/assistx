import { sendToIpcMain, useSharedState } from "@/shared";
import { AnimatePresence, motion } from "framer-motion";
import { useEffect, useRef, useState } from "react";
import { twMerge } from "tailwind-merge";
import { useEventCallback } from "usehooks-ts";
import { ConversationContent } from "./conversationContent";
import { useDelayedTrueValue } from "@/hooks/useDelayedTrueValue";
import { useGlobalShortcut } from "@/hooks/useGlobalShortcut";
import { useKeybindings } from "@/hooks/useKeybindings";
import { StaticActions } from "./staticActions";
import { useAudioState } from "../hooks/useAudioState";
import { ChatInput } from "../components/chatInput";
import { useShowConversation } from "../hooks/useShowConversation";
import { useSubmit } from "../hooks/useSubmit";
import { CaptureMouseEventsWrapper } from "@/components/captureMouseEventsWrapper";
import { useGlobalServices } from "@/services/GlobalServicesContextProvider";
import { useAiResponse } from "../hooks/useAiResponse";

export const CHAT_INPUT_CONTAINER_ID = "chat-input-container";
export const HIDE_WINDOW_DELAY = 100;

export function ChatContent() {
  const audioState = useAudioState();
  const { contextService } = useGlobalServices();
  const isInAudioSessionAndActive = contextService.isInAudioSession && audioState.state === "on";
  // Delay the flipped value, so the UI doesn't flash when the session ends and the window hides
  const notInSession = useDelayedTrueValue(!isInAudioSessionAndActive, HIDE_WINDOW_DELAY);
  const delayedInSession = !notInSession;

  const showConversation = useShowConversation();

  return (
    <motion.div className={twMerge("w-[540px] pt-2.5 relative")}>
      <CaptureMouseEventsWrapper className="h-full grid grid-rows-[auto_1fr]">
        <div className={twMerge("flex overflow-hidden relative w-full")}>
          <div className="w-full grid grid-rows-[1fr_auto] opacity-100">
            <div className={twMerge("overflow-hidden h-(--height)", !showConversation && "h-0")}>
              <ConversationContent />
            </div>
            <div id={CHAT_INPUT_CONTAINER_ID}>
              <AnimatePresence initial={false}>
                {delayedInSession && (
                  <motion.div
                    initial={{ height: 0 }}
                    animate={{ height: "auto" }}
                    exit={{ height: 0 }}
                    transition={{ type: "spring", damping: 26, stiffness: 300 }}
                    className="overflow-hidden"
                  >
                    <div className="px-3 pb-1">
                      <StaticActions />
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
              <motion.div
                layout
                // effectively zero-duration layout animation, to prevent inner
                // layout animations from taking precedence and glitching
                transition={{ ease: "easeOut", duration: 0 }}
              >
                <DrivenChatInput />
              </motion.div>
            </div>
          </div>
        </div>
      </CaptureMouseEventsWrapper>
    </motion.div>
  );
}

function DrivenChatInput() {
  const { clearConversation } = useAiResponse();
  const { clientMetadata } = useSharedState();
  const keybindings = useKeybindings();

  const inputRef = useRef<HTMLTextAreaElement>(null);

  const [value, setValue] = useState("");
  const [isFocused, setIsFocused] = useState(false);
  const submit = useSubmit();

  const [firedFirstFocus, setFiredFirstFocus] = useState(false);

  // use skipOnFirstFocus to avoid focusing on first-time show
  const focus = useEventCallback((skipOnFirstFocus = false) => {
    setFiredFirstFocus(true);
    if (skipOnFirstFocus && !firedFirstFocus) return;

    const inputEl = inputRef.current;
    if (!inputEl) return;

    sendToIpcMain("focus-window", null);
    inputEl.focus();
    // select everything
    inputEl.setSelectionRange(0, inputEl.value.length);
  });

  const submitChat = useEventCallback(() => {
    console.log("submitting chat");
    submit({
      manualInput: value,
      displayInput: value,
    });
    setValue("");
  });

  useGlobalShortcut("Enter", submitChat, {
    enable: isFocused ? "onlyWhenVisible" : false,
  });

  useGlobalShortcut(keybindings.trigger_ai, submitChat);

  useGlobalShortcut(
    "Escape",
    () => {
      if (value) {
        setValue("");
      } else {
        inputRef.current?.blur();
        sendToIpcMain("unfocus-window", null);
      }
    },
    { enable: isFocused ? "onlyWhenVisible" : false },
  );

  useGlobalShortcut(keybindings.start_over, () => {
    clearConversation({ onlyClearVisually: true });
  });

  const { windowHidden } = useSharedState();

  useEffect(() => {
    if (windowHidden) {
      sendToIpcMain("unfocus-window", null);
    } else if (!clientMetadata?.noFocusOnShow) {
      focus(true);
    }
  }, [windowHidden, focus, clientMetadata?.noFocusOnShow]);

  return (
    <ChatInput
      ref={inputRef}
      value={value}
      onChange={setValue}
      onFocus={() => setIsFocused(true)}
      onBlur={() => setIsFocused(false)}
      onSubmit={submitChat}
      isFocused={isFocused}
    />
  );
}
