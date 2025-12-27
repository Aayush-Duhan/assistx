import { BsExclamationCircleFill } from "react-icons/bs";
import { FaPause, FaPlay, FaStop } from "react-icons/fa6";
import { LuLoader } from "react-icons/lu";
import { twMerge } from "tailwind-merge";
import { AudioErrorNotification } from "./audioErrorNotification";
import type { AudioState, TypedAudioState } from "../types";
import { kit } from "@/components/kit";
import { getAudioCaptureErrorMessage } from "@/lib/audio/error";

export function SessionControls({ audioState }: { audioState: AudioState }) {
  return (
    <div className="flex items-center gap-1">
      {audioState.state === "loading" ? (
        <LoadingIndicator state={audioState} />
      ) : audioState.state === "error" ? (
        <RetryControl state={audioState} />
      ) : audioState.state !== "off" ? (
        <div className="flex items-center rounded-full w-fit">
          <ListenControl state={audioState} />
          <div className="h-[26px] w-[1px] bg-white/[0.17]" />
          <SessionControl state={audioState} />
        </div>
      ) : (
        <StartSession state={audioState} />
      )}
    </div>
  );
}

function ListenControl({ state }: { state: TypedAudioState<"on" | "paused"> }) {
  return (
    <kit.HeadlessButton
      className={twMerge(
        "size-7 text-white hover:![transform:scale(1)] group flex justify-center rounded-l-full secondary-button items-center p-[6px] pr-[6px] pl-[8px]",
      )}
      onClick={() => {
        if (state.state === "paused") {
          state.resumeAction();
        } else if (state.state === "on") {
          state.pauseAction();
        }
      }}
    >
      {state.state === "paused" ? (
        <FaPlay className="size-full group-hover:scale-[115%] origin-[25%_50%] transition-transform duration-150 ease-out" />
      ) : (
        <FaPause className="size-full group-hover:scale-[115%] origin-[25%_50%] transition-transform duration-150 ease-out" />
      )}
    </kit.HeadlessButton>
  );
}

function StartSession({ state }: { state: TypedAudioState<"off"> }) {
  return (
    <kit.HeadlessButton
      onClick={() => {
        if (state.state === "off") {
          state.startAction();
        }
      }}
      className="h-7 text-xs text-white group flex justify-center rounded-full primary-button items-center p-1 px-2"
    >
      Start Listening
    </kit.HeadlessButton>
  );
}

function SessionControl({ state }: { state: TypedAudioState<"on" | "paused"> }) {
  return (
    <kit.HeadlessButton
      className={twMerge(
        "size-7 text-white hover:![transform:scale(1)] group flex justify-center rounded-r-full secondary-button items-center p-[6px] pl-[6px] pr-[8px]",
      )}
      onClick={() => {
        state.stopAction();
      }}
    >
      <FaStop className="size-full group-hover:scale-[115%] origin-[75%_50%] transition-transform duration-150 ease-out" />
    </kit.HeadlessButton>
  );
}

function LoadingIndicator({ state }: { state: TypedAudioState<"loading"> }) {
  return (
    <div className="flex items-center rounded-full w-fit">
      <div
        className={twMerge(
          "size-7 text-white group flex justify-center rounded-l-full secondary-button disabled items-center p-[6px] pr-[6px] pl-[8px]",
        )}
      >
        <LuLoader className="size-full animate-spin" />
      </div>
      <div className="h-[26px] w-[1px] bg-white/[0.17]" />
      <kit.HeadlessButton
        className={twMerge(
          "size-7 text-white hover:![transform:scale(1)] group flex justify-center rounded-r-full secondary-button items-center p-[6px] pl-[6px] pr-[8px]",
        )}
        onClick={() => {
          state.state === "loading" && state.stopAction();
        }}
      >
        <FaStop className="size-full group-hover:scale-[115%] origin-[75%_50%] transition-transform duration-150 ease-out" />
      </kit.HeadlessButton>
    </div>
  );
}

function RetryControl({ state }: { state: TypedAudioState<"error"> }) {
  const { message } = getAudioCaptureErrorMessage(state.error);

  return (
    <>
      <kit.Tooltip
        tooltipContent={
          <>
            {message}
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
  );
}
