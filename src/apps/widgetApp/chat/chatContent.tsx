import { IconHomeOpen } from "@central-icons-react/round-filled-radius-2-stroke-1.5";
import { sendToIpcMain, updateState, useSharedState } from "@/shared";
import { AnimatePresence, motion } from "framer-motion";
import { useEffect, useRef, useState } from "react";
import { twMerge } from "tailwind-merge";
import { useEventCallback } from "usehooks-ts";
import { ConversationContent } from "./conversationContent";
import { useDelayedTrueValue } from "@/hooks/useDelayedTrueValue";
import { useGlobalShortcut } from "@/hooks/useGlobalShortcut";
import { useKeybindings } from "@/hooks/useKeybindings";
import { CopyAll } from "../components/copyAll";
import { ToggleSize } from "../components/toggleSize";
import { StaticActions } from "./staticActions";
import { useAudioState } from "../hooks/useAudioState";
import { ChatInput } from "../components/chatInput";
import ChatTranscriptToggle from "../components/chatTranscriptToggle";
import { useShowConversation } from "../hooks/useShowConversation";
import { useSubmit } from "../hooks/useSubmit";
import { TranscriptContent } from "../insights/transcriptContent";
import { CaptureMouseEventsWrapper } from "@/components/captureMouseEventsWrapper";
import { kit } from "@/components/kit";
import { useGlobalServices } from "@/services/GlobalServicesContextProvider";
import { useAiResponse } from "../hooks/useAiResponse";

export const CHAT_HEADER_CONTAINER_ID = "chat-header-container";
export const CHAT_INPUT_CONTAINER_ID = "chat-input-container";
export const HIDE_WINDOW_DELAY = 100;

export function ChatContent({
    mode,
    setMode,
}: {
    mode: "chat" | "transcript";
    setMode: (mode: "chat" | "transcript") => void;
}) {
    const audioState = useAudioState();
    const { contextService } = useGlobalServices();
    const isInAudioSessionAndActive = contextService.isInAudioSession && audioState.state === "on";
    // Delay the flipped value, so the UI doesn't flash when the session ends and the window hides
    const notInSession = useDelayedTrueValue(!isInAudioSessionAndActive, HIDE_WINDOW_DELAY);
    const delayedInSession = !notInSession;

    const showConversation = useShowConversation();

    useEffect(() => {
        if (!isInAudioSessionAndActive && mode === "transcript") {
            const timeout = setTimeout(() => {
                setMode("chat");
            }, 300);
            return () => clearTimeout(timeout);
        }
    }, [isInAudioSessionAndActive, mode, setMode]);

    return (
        <motion.div className={twMerge("w-[540px] pt-2.5 relative")}>
            <CaptureMouseEventsWrapper className="h-full grid grid-rows-[auto_1fr]">
                <div
                    id={CHAT_HEADER_CONTAINER_ID}
                    className={twMerge("flex items-center gap-2 mb-1 h-7 px-3 justify-between relative")}
                >
                    <AnimatePresence mode="popLayout" initial={false}>
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            key={audioState.state === "on" ? "on" : "off"}
                            className="flex items-center gap-2"
                        >
                            <kit.HeadlessButton
                                className="size-5 group/button flex justify-center cursor-pointer items-center relative before:absolute before:-inset-1 before:rounded-full before:transition-colors before:duration-150"
                                onClick={() => {
                                    updateState({ showDashboard: true });
                                }}
                            >
                                <IconHomeOpen className="text-white/60 size-5 group-hover/button:text-white drop-shadow-transparent transition-all duration-150 group-hover/button:drop-shadow-white/50 drop-shadow-sm" />
                            </kit.HeadlessButton>
                            {audioState.state === "on" && (
                                <div className="flex items-center gap-2">
                                    <AnimatePresence initial={false}>
                                        {delayedInSession && (
                                            <ChatTranscriptToggle key="toggle" mode={mode} setMode={setMode} />
                                        )}
                                        {mode === "transcript" && <CopyAll key="copy" />}
                                    </AnimatePresence>
                                </div>
                            )}
                        </motion.div>
                    </AnimatePresence>

                    <ToggleSize setMode={setMode} />
                </div>
                <div className={twMerge("flex overflow-hidden relative w-full")}>
                    <div
                        className={twMerge(
                            "w-full grid grid-rows-[1fr_auto]",
                            mode === "chat" ? "opacity-100" : "opacity-0 pointer-events-none",
                        )}
                    >
                        <div
                            className={twMerge(
                                "overflow-hidden h-(--height)",
                                !showConversation && mode === "chat" && "h-0",
                            )}
                        >
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
                                <DrivenChatInput mode={mode} setMode={setMode} />
                            </motion.div>
                        </div>
                    </div>
                    <div
                        className={twMerge(
                            "w-full h-full absolute inset-0 bottom-[unset]",
                            mode === "transcript" ? "opacity-100" : "opacity-0 pointer-events-none",
                        )}
                    >
                        <TranscriptContent mode={mode} />
                    </div>
                </div>
            </CaptureMouseEventsWrapper>
        </motion.div>
    );
}

function DrivenChatInput({
    mode,
    setMode,
}: {
    mode: "chat" | "transcript";
    setMode: (mode: "chat" | "transcript") => void;
}) {
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
        setMode("chat");
    });

    const submitChat = useEventCallback(() => {
        console.log("submitting chat");
        submit({
            manualInput: value,
            displayInput: value
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
        setMode("chat");
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
            mode={mode}
            isFocused={isFocused}
        />
    );
}
