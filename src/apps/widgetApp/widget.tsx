import { useSharedState } from "@/shared/shared";
import { AnimatePresence, motion } from "motion/react";
import { Activity, useRef, useState } from "react";
import { twMerge } from "tailwind-merge";
import { ChatContent } from "./chat/chatContent";
import { CommandBar } from "./commandBar";
import { VerticalResizeContainer } from "./components/verticalResizeContainer";
import { Window } from "./components/window";
import { useShowConversation } from "./hooks/useShowConversation";
import {
    useWindowPosition,
    WindowPositionProvider,
} from "./hooks/useWindowPosition";
import { HudNotifications } from "./hudNotifications";
import { useHandleStartListening } from "./hooks/useHandleStartListening";

export function Widget() {
    const insightsContentRef = useRef<HTMLDivElement>(null);

    // hooks for audio
    useHandleStartListening();

    return (
        <WindowPositionProvider insightsContentRef={insightsContentRef}>
            <Content ref={insightsContentRef} />
            <div id="radix-portal-root" />
        </WindowPositionProvider>
    );
}

function Content({ ref }: { ref?: React.Ref<HTMLDivElement> }) {
    const { undetectabilityEnabled, panelHidden } = useSharedState();
    const { x, y, handleDragStart, handleDragEnd, dragControls } = useWindowPosition();

    const showConversation = useShowConversation();

    const [mode, setMode] = useState<"chat" | "transcript">("chat");

    return (
        <div className="fixed inset-0 flex justify-center items-start p-0 pointer-events-none">
            <motion.div
                ref={ref}
                initial={false}
                animate="idle"
                whileHover="hover"
                drag
                dragMomentum={false}
                dragTransition={{
                    bounceStiffness: 0,
                    bounceDamping: 0,
                }}
                dragListener={false}
                dragControls={dragControls}
                onDragStart={handleDragStart}
                onDragEnd={handleDragEnd}
                style={{ x, y }}
                className={twMerge(
                    "flex justify-center group/window before:absolute before:-inset-5 has-[.live-insights-3]:pb-16 has-[.live-insights-2]:pb-16 has-[.live-insights-1]:pb-10",
                    undetectabilityEnabled && "undetectable",
                )}
            >
                <div className="w-fit flex flex-col gap-1.5 justify-center items-center">
                    <CommandBar />
                    <AnimatePresence>
                        <Activity mode={panelHidden ? "hidden" : "visible"}>
                            <motion.div
                                variants={{
                                    hidden: { opacity: 0, y: -8 },
                                    visible: { opacity: 1, y: 0 },
                                }}
                                initial="hidden"
                                animate="visible"
                                exit="hidden"
                                transition={{ duration: 0.16, ease: "easeOut" }}
                                className={twMerge(
                                    "window rounded-[24px] transition-[padding]",
                                    undetectabilityEnabled && "p-2",
                                )}
                            >
                                <VerticalResizeContainer allowResize={showConversation || mode === "transcript"}>
                                    <Window className="h-full bg-linear-to-b from-surface-panel-from to-surface-panel-to transition-colors duration-100 border-none shadow-pane">
                                        <ChatContent mode={mode} setMode={setMode} />
                                    </Window>
                                </VerticalResizeContainer>
                            </motion.div>
                        </Activity>
                    </AnimatePresence>

                    <HudNotifications />
                </div>
            </motion.div>
        </div>
    );
}
