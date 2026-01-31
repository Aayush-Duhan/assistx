import { ElectronDragWrapper } from "@/components/electronDragWrapper";
import { FallbackMenu } from "@/components/fallback-menu";
import { useSharedState } from "@/shared/shared";
import { useState, useEffect } from "react";
import { IS_WINDOWS } from "@/shared/constants";
import Landing from "./steps/Landing";
import Permissions from "./steps/Permissions";
import Mode from "./steps/Mode";
import Submit from "./steps/Submit";
import Hide from "./steps/Hide";

export function Onboarding() {
  return (
    <div className="size-full relative">
      <div className="size-full relative z-0">
        <ElectronDragWrapper className="absolute top-0 left-0 right-0 h-12 z-10" />
        <OnboardingStep />
      </div>
      <div className="absolute top-2 right-2 [-webkit-app-region:no-drag] z-10 flex gap-2 items-center">
        <FallbackMenu />
      </div>
    </div>
  );
}

function OnboardingStep() {
  const { onboardingState } = useSharedState();
  const [didInitialize, setDidInitialize] = useState(false);
  const {
    permissions: { didGrantMicrophonePermission, didGrantScreenPermission },
    surveys: { mode },
    restarted,
    learn: { didCompleteSend, didCompleteHide },
    didCompleteLanding,
  } = onboardingState;

  useEffect(() => {
    const timeoutRef = setTimeout(() => {
      setDidInitialize(true);
    }, 10);

    return () => clearTimeout(timeoutRef);
  }, []);
  const skipPermissions = IS_WINDOWS;
  if (!didInitialize) {
    return null;
  }

  if (!didCompleteLanding) {
    return <Landing />;
  }

  if (
    (!didGrantMicrophonePermission || !didGrantScreenPermission || !restarted) &&
    !skipPermissions
  ) {
    return <Permissions />;
  }

  if (!mode) {
    return <Mode />;
  }

  if (!didCompleteSend) {
    return <Submit />;
  }

  if (!didCompleteHide) return <Hide />;

  // Onboarding complete - return null to indicate flow is finished
  return null;
}
