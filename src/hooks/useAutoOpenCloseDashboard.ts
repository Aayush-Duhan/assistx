import { updateState } from "@/shared/shared";
import { useEffect } from "react";
// import { useActiveSession } from "@/renderer/apps/hudApp/hooks/hud";

export function useAutoOpenCloseDashboard() {
  // const audioSession = useActiveSession();
  // const shouldShowDashboard = !audioSession;
  const shouldShowDashboard = true;

  useEffect(() => {
    if (shouldShowDashboard) {
      updateState({ showDashboard: true });
    }
  }, [shouldShowDashboard]);
}
