import { RiMenuSearchLine } from "react-icons/ri";
import { FaChevronRight } from "react-icons/fa6";
import { PiPaperPlaneTiltFill } from "react-icons/pi";
import { LuUserSearch } from "react-icons/lu";
import { updateState, useSharedState } from "@/shared/shared";
import { AnimatePresence, motion } from "motion/react";
import { useEffect, useState } from "react";
import { twMerge } from "tailwind-merge";
import { useDarkMode } from "usehooks-ts";
import {
  AssistantMessage,
  ChatInput,
  Overlay,
  StaticAction,
  StaticActions,
  ToolCall,
  UserMessage,
} from "../components/desktop-ui";
import { Command, Slash } from "../components/icons";
// import Meeting from "../components/meeting";
import OnboardingButton from "../components/ob-button";
import {
  OnboardingDemo,
  OnboardingForm,
  OnboardingPage,
} from "../components/onboarding-page";
import { GradientShimmer } from "../steps/Submit";
import { IS_MAC } from "@/shared/constants";

export default function Hide() {
  const { onboardingState } = useSharedState();
  const { learn } = onboardingState;
  const [hidden, setHidden] = useState(false);
  const [numHides, setNumHides] = useState(0);
  const { isDarkMode } = useDarkMode();

  useEffect(() => {
    const handleKeydown = (event: KeyboardEvent) => {
      const metaKey = IS_MAC ? event.metaKey : event.ctrlKey;
      if (metaKey && event.key === "\\") {
        setHidden(!hidden);
        setNumHides((prev) => prev + 1);
      }
    };

    window.addEventListener("keydown", handleKeydown);
    return () => {
      window.removeEventListener("keydown", handleKeydown);
    };
  }, [hidden]);

  return (
    <OnboardingPage className={isDarkMode ? "bg-[#0f0f0f]" : "bg-[#EDEEF2]"}>
      <OnboardingForm className={`justify-between ${isDarkMode ? "bg-[#0f0f0f]" : ""}`}>
        <div />
        <div className="flex flex-col gap-10 items-center text-center">
          <div className="flex flex-col gap-4">
            <h2 className={`font-semibold text-sm ${isDarkMode ? "text-white/40" : "text-black/40"}`}>Try AssistX</h2>
            <h1>
              <AnimatePresence initial={false} mode="wait">
                <motion.span
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  transition={{ duration: 0.2, ease: "easeOut" }}
                  className={`text-4xl tracking-[-1.254px] font-medium inline-block ${isDarkMode ? "text-[#F0F0F0]" : "text-[#1a1a1a]"}`}
                  key={numHides === 0 ? "hide" : "show"}
                >
                  {numHides === 0 ? (
                    <>
                      Hide and show
                      <br />
                      AssistX on the fly
                    </>
                  ) : (
                    <>
                      Now, try showing
                      <br />
                      AssistX again.
                    </>
                  )}
                </motion.span>
              </AnimatePresence>
            </h1>
            <p className={isDarkMode ? "text-[#A0A0A0]" : "text-[#6B6B6D]"}>Press the keyboard shortcut to try hiding AssistX.</p>
          </div>
          <div className="flex gap-2">
            <Shortcuts />
          </div>
          <div className="flex flex-col w-full items-center gap-2">
            <OnboardingButton
              disabled={numHides < 2}
              onClick={() => {
                updateState({
                  onboardingState: {
                    ...onboardingState,
                    learn: { ...learn, didCompleteHide: true },
                    completed: true,
                  },
                });
              }}
            >
              {numHides < 2 ? (
                "Use the shortcut to continue"
              ) : (
                <>
                  Complete <FaChevronRight className="size-3" />
                </>
              )}
            </OnboardingButton>
          </div>
        </div>
        <OnboardingButton
          size="fit"
          variant="ghost"
          className="opacity-60"
          onClick={() => {
            updateState({
              onboardingState: {
                ...onboardingState,
                learn: { ...learn, didCompleteHide: true },
                completed: true,
              },
            });
          }}
        >
          Skip
          <FaChevronRight className="size-3" />
        </OnboardingButton>
      </OnboardingForm>
      <OnboardingDemo className="px-4 overflow-hidden justify-around relative">
        {numHides >= 2 && (
          <motion.div
            className="absolute -bottom-[28rem] flex justify-center items-center w-full"
            initial={{ y: 0, scaleY: 1 }}
            animate={{ y: "-80rem", scaleY: 1.6 }}
            transition={{
              duration: 0.3,
              ease: "easeIn",
            }}
          >
            <GradientShimmer className="scale-200 opacity-60" />
          </motion.div>
        )}
        <div className="relative w-full h-fit pt-12">
          {/* <Meeting /> */}
          <div className="absolute top-0 -translate-x-1/2 left-1/2">
            <Overlay
              style={{
                opacity: hidden ? 0 : 1,
                scale: hidden ? 0.95 : 1,
                transformOrigin: "center bottom",
                transition: "all 0.1s ease-out",
              }}
            >
              <div className="flex flex-col h-fit gap-4">
                <UserMessage>Is it secure? We handle pretty sensitive info.</UserMessage>
                <div className="flex flex-col gap-1">
                  <ToolCall>
                    <RiMenuSearchLine />
                    Searched records
                  </ToolCall>
                  <AssistantMessage>
                    We’re SOC2 compliant, use end-to-end encryption, and your data is private to
                    your org. Plus, you control what’s stored and can request deletion anytime.
                  </AssistantMessage>
                </div>
              </div>
              <div className="flex flex-col h-fit gap-2">
                <StaticActions className="opacity-40">
                  <StaticAction>
                    <PiPaperPlaneTiltFill className="!size-3" />
                    Send recap email
                  </StaticAction>
                  <StaticAction>
                    <LuUserSearch className="!size-3" />
                    Research meeting participants
                  </StaticAction>
                </StaticActions>
                <ChatInput />
              </div>
            </Overlay>
          </div>
        </div>
      </OnboardingDemo>
    </OnboardingPage>
  );
}

const Shortcuts = () => {
  const [cmdActive, setCmdActive] = useState(false);
  const [slashActive, setSlashActive] = useState(false);
  const { isDarkMode } = useDarkMode();

  useEffect(() => {
    const isMeta = (event: KeyboardEvent) =>
      IS_MAC ? event.metaKey || event.key === "Meta" : event.ctrlKey || event.key === "Control";

    const handleKeyDown = (event: KeyboardEvent) => {
      if (isMeta(event)) {
        setCmdActive(true);
      }
      if (event.key === "\\") {
        setSlashActive(true);
      }
    };
    const handleKeyUp = (event: KeyboardEvent) => {
      if (isMeta(event)) {
        setCmdActive(false);
        setSlashActive(false);
      }
      if (event.key === "\\") {
        setSlashActive(false);
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    window.addEventListener("keyup", handleKeyUp);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      window.removeEventListener("keyup", handleKeyUp);
    };
  }, []);

  return (
    <>
      <kbd
        className={twMerge(
          "p-[1.5px] pb-[3px] rounded-xl flex justify-center items-center size-20 transition-all duration-100",
          cmdActive
            ? "text-white bg-gradient-to-b from-[#ffb366] to-[#b35f18] scale-95"
            : isDarkMode
              ? "text-[#A0A0A0] bg-[#2a2a2a] scale-100"
              : "text-[#88889D] bg-[#DFDFE4] scale-100",
        )}
      >
        <div
          className={twMerge(
            "flex justify-center items-center rounded-[10px] size-full",
            cmdActive
              ? "bg-gradient-to-br from-[#e8913f] to-[#b35f18]"
              : isDarkMode
                ? "bg-[#1a1a1a] transition-all duration-100"
                : "bg-white transition-all duration-100",
          )}
        >
          {IS_MAC ? <Command /> : <span className="font-semibold text-lg">Ctrl</span>}
        </div>
      </kbd>
      <kbd
        className={twMerge(
          "p-[1.5px] pb-[3px] rounded-xl flex justify-center items-center size-20 transition-all duration-100",
          slashActive
            ? "text-white bg-gradient-to-b from-[#ffb366] to-[#b35f18] scale-95"
            : isDarkMode
              ? "text-[#A0A0A0] bg-[#2a2a2a]"
              : "text-[#88889D] bg-[#DFDFE4]",
        )}
      >
        <div
          className={twMerge(
            "flex justify-center items-center rounded-[10px] size-full",
            slashActive
              ? "bg-gradient-to-br from-[#e8913f] to-[#b35f18]"
              : isDarkMode
                ? "bg-[#1a1a1a] transition-all duration-100"
                : "bg-white transition-all duration-100",
          )}
        >
          <Slash />
        </div>
      </kbd>
    </>
  );
};
