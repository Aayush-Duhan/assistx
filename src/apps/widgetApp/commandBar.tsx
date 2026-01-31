import { FaChevronUp } from "react-icons/fa6";
import { updateState, useSharedState } from "@/shared";
import { HiSparkles } from "react-icons/hi2";
import { twMerge } from "tailwind-merge";
import { SessionControls } from "./components/sessionControls";
import { useAudioState } from "./hooks/useAudioState";
import { useWindowPosition } from "./hooks/useWindowPosition";
import { CaptureMouseEventsWrapper } from "@/components/captureMouseEventsWrapper";
import { kit } from "@/components/kit";
import { observer } from "mobx-react-lite";
import { Logo } from "@/components/Logo";
import { ReactNode, useState } from "react";
import { useHideChatAlsoHidesWidget } from "./hooks/useToggleShowHide";
import { useToggleShowHide } from "./hooks/useToggleShowHide";

export const CommandBar = observer(function CommandBar() {
  const audioState = useAudioState();
  const { isDragging, dragControls } = useWindowPosition();
  const { panelHidden } = useSharedState();
  const { toggleShowHide } = useToggleShowHide();
  const [hideChatAlsoHidesWidget] = useHideChatAlsoHidesWidget();
  const [disableHover, setDisableHover] = useState(false);
  const showAsk = panelHidden && !hideChatAlsoHidesWidget;

  return (
    <CaptureMouseEventsWrapper className="flex items-center gap-2.5">
      <div
        className={twMerge(
          "shadow-pane w-fit bg-surface-opaque rounded-full flex items-center px-[11px] py-[9px] gap-[7px] group/command-bar",
          !disableHover && "hover:bg-surface-opaque-hover",
        )}
        onPointerDown={(e) => dragControls.start(e)}
        onClick={() => {
          if (!isDragging) {
            updateState({ showDashboard: true });
          }
        }}
      >
        <Logo />
        <DisableDragWrapper setDisableHover={setDisableHover}>
          <kit.HeadlessButton
            className={twMerge(
              "rounded-full h-8 px-3 flex items-center gap-1 text-xs font-medium text-white",
              showAsk ? "primary-button" : "secondary-button",
            )}
            onClick={toggleShowHide}
          >
            {showAsk ? (
              <>
                <HiSparkles className="size-3" />
                Ask
              </>
            ) : (
              <>
                <FaChevronUp className="size-3" />
                Hide
              </>
            )}
          </kit.HeadlessButton>
        </DisableDragWrapper>
        <DisableDragWrapper setDisableHover={setDisableHover}>
          <SessionControls audioState={audioState} />
        </DisableDragWrapper>
      </div>
    </CaptureMouseEventsWrapper>
  );
});

function DisableDragWrapper({
  children,
  setDisableHover,
}: {
  children: ReactNode;
  setDisableHover: (disable: boolean) => void;
}) {
  return (
    <div
      onPointerDown={(e) => {
        e.preventDefault();
        e.stopPropagation();
      }}
      onPointerEnter={() => setDisableHover(true)}
      onPointerLeave={() => setDisableHover(false)}
      onClick={(e) => {
        e.stopPropagation();
      }}
    >
      {children}
    </div>
  );
}
