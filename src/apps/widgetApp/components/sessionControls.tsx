import { IoMicOutline } from "react-icons/io5";
import { BsExclamationCircleFill } from "react-icons/bs";
import type { ReactNode } from "react";
import { BsStopFill } from "react-icons/bs";
import { LuLoader } from "react-icons/lu";
import { twMerge } from "tailwind-merge";
import { AudioErrorNotification } from "../components/audioErrorNotification";
import { CommandBarTooltip } from "../components/commandBarTooltip";
import type { AudioState } from "../types";
import { kit } from "@/components/kit";
import { getAudioCaptureErrorMessage } from "@/lib/audio/error";

export function SessionControls({ audioState: state }: { audioState: AudioState }) {
  return (
    <div className="flex items-center gap-1">
      {state.state === "loading" ? (
        <SessionControlButton loading onClick={state.stopAction} tooltip="Stop Session">
          <BsStopFill className="size-full group-hover:scale-[115%] origin-[75%_50%] transition-transform duration-150 ease-out" />
        </SessionControlButton>
      ) : state.state === "error" ? (
        <>
          <kit.Tooltip
            tooltipContent={
              <>
                {getAudioCaptureErrorMessage(state.error).message}
                <span className="text-white/50"> Click to retry.</span>
              </>
            }
          >
            <kit.HeadlessButton
              className="h-7 px-2 flex items-center justify-center gap-1 rounded-full bg-[#bb3232] hover:bg-red-600 active:bg-red-700"
              onClick={state.retryAction}
            >
              <BsExclamationCircleFill className="size-3.5 text-white" />
              <p className="text-xs text-white">Failed to listen</p>
            </kit.HeadlessButton>
          </kit.Tooltip>

          <AudioErrorNotification
            error={state.error}
            onRetry={state.retryAction}
            onStop={state.stopAction}
          />
        </>
      ) : state.state === "off" ? (
        <SessionControlButton
          tooltip="Start Session"
          onClick={() => {
            state.startAction();
          }}
        >
          <IoMicOutline className="size-4.5" />
        </SessionControlButton>
      ) : (
        <SessionControlButton
          tooltip="Stop Session"
          onClick={() => {
            state.stopAction();
          }}
        >
          <BsStopFill className="size-full group-hover:scale-[115%] origin-[75%_50%] transition-transform duration-150 ease-out" />
        </SessionControlButton>
      )}
    </div>
  );
}

function SessionControlButton({
  loading,
  onClick,
  children,
  tooltip,
}: {
  loading?: boolean;
  onClick: () => void;
  children: ReactNode;
  tooltip: string;
}) {
  return (
    <div className="flex items-center w-fit">
      {loading && (
        <>
          <div className="size-8 text-white group flex justify-center rounded-l-full session-secondary-button disabled items-center p-[6px] pr-[6px] pl-[8px]">
            <LuLoader className="size-full animate-spin" />
          </div>
          <div className="h-[30px] w-[1px] bg-white/[0.17]" />
        </>
      )}

      <CommandBarTooltip tooltip={tooltip}>
        <kit.HeadlessButton
          className={twMerge(
            "size-8 text-white hover:![transform:scale(1)] group flex justify-center session-secondary-button items-center",
            loading ? "rounded-r-full p-[7px] pr-[9px] pl-[5px]" : "rounded-full p-[7px]",
          )}
          onClick={onClick}
        >
          {children}
        </kit.HeadlessButton>
      </CommandBarTooltip>
    </div>
  );
}
