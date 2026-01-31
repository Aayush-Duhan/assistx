import { useSharedState } from "@/shared/shared";
import { AnimatePresence, motion } from "motion/react";
import { Activity, useRef } from "react";
import { twMerge } from "tailwind-merge";
import { ChatContent } from "./chat/chatContent";
import { CommandBar } from "./commandBar";
import { RxCross2 } from "react-icons/rx";
import { VerticalResizeContainer } from "./components/verticalResizeContainer";
import { Window } from "./components/window";
import { useShowConversation } from "./hooks/useShowConversation";
import { useWindowPosition, WindowPositionProvider } from "./hooks/useWindowPosition";
import { HudNotifications } from "./hudNotifications";
import { useHandleStartListening } from "./hooks/useHandleStartListening";
import { useToggleShowHide } from "./hooks/useToggleShowHide";
import { CaptureMouseEventsWrapper } from "@/components/captureMouseEventsWrapper";
import { kit } from "@/components/kit";

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

  const { toggleShowHide } = useToggleShowHide();

  return (
    <div className="fixed inset-0 flex justify-center items-start p-0">
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
                  "window rounded-[24px] transition-[padding] relative group/hud-chat",
                  undetectabilityEnabled && "p-2",
                )}
              >
                <VerticalResizeContainer allowResize={showConversation}>
                  <Window className="h-full bg-linear-to-b from-surface-panel-from to-surface-panel-to transition-colors duration-100 border-none shadow-pane relative">
                    <CaptureMouseEventsWrapper className="absolute top-0 right-0 -mt-2.5 -mr-2.5 z-30 opacity-0 group-hover/hud-chat:opacity-100 transition-opacity duration-100">
                      <kit.HeadlessButton onClick={toggleShowHide}>
                        <div
                          className="rounded-full bg-[#18171C]/60 items-center justify-center size-6 flex"
                          style={{
                            boxShadow:
                              "0px -0.5px 0px 0px rgba(255, 255, 255, 0.8), 0px 0px 0px 1px rgba(207, 226, 255, 0.24) inset",
                          }}
                        >
                          <RxCross2 className="size-4.5 text-white" />
                        </div>
                      </kit.HeadlessButton>
                    </CaptureMouseEventsWrapper>
                    <ChatContent />
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
