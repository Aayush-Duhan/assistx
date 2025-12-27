import { LuGripVertical } from "react-icons/lu";
import { FaChevronUp } from "react-icons/fa6";
import { updateState, useSharedState } from "@/shared";
import { LuX } from "react-icons/lu";
import { twMerge } from "tailwind-merge";
import { SessionControls } from "./components/sessionControls";
import { useAudioState } from "./hooks/useAudioState";
import { useWindowPosition } from "./hooks/useWindowPosition";
import { CaptureMouseEventsWrapper } from "@/components/captureMouseEventsWrapper";
import { kit } from "@/components/kit";
import ToggleInvisibility from "./components/toggleInvisibility";
import { useGlobalServices } from "@/services/GlobalServicesContextProvider";

export function CommandBar() {
  const audioState = useAudioState();
  const { tweenToInitialPosition, dragControls } = useWindowPosition();
  const { panelHidden } = useSharedState();
  const { aiResponsesService } = useGlobalServices();

  return (
    <CaptureMouseEventsWrapper className="flex items-center gap-2.5">
      <div className="size-7 shrink-0" />
      <div className="shadow-pane w-fit bg-surface-opaque rounded-full flex items-center p-[7px] gap-1">
        <ToggleInvisibility />
        <SessionControls audioState={audioState} />
        <kit.HeadlessButton
          className="rounded-full cursor-pointer p-1 hover:bg-white/10 transition-all duration-150"
          onClick={() => {
            updateState({ panelHidden: !panelHidden });
          }}
        >
          <FaChevronUp
            className={twMerge(
              "size-4.5 text-white transition-transform duration-150",
              panelHidden && "rotate-180",
            )}
          />
        </kit.HeadlessButton>
        <div className="h-7 w-px bg-shade-10 ml-1.5" />
        <kit.HeadlessButton
          onPointerDown={(e) => dragControls.start(e)}
          onDoubleClick={() => tweenToInitialPosition()}
          className="size-7 cursor-pointer flex items-center justify-center"
        >
          <LuGripVertical
            className="size-5 text-white
          "
          />
        </kit.HeadlessButton>
      </div>
      <kit.HeadlessButton
        onClick={() => {
          updateState({ windowHidden: true });
          aiResponsesService.setClickedHide(true);
        }}
        className="size-7 shadow-pane cursor-pointer bg-surface-opaque hover:bg-surface-opaque-hover hover:scale-105 transition-all duration-150 rounded-full flex items-center justify-center"
      >
        <LuX className="size-4 text-white" />
      </kit.HeadlessButton>
    </CaptureMouseEventsWrapper>
  );
}
