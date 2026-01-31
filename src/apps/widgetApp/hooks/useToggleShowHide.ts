import { updateState, useSharedState } from "@/shared";
import { useEffect, useEffectEvent } from "react";
import { useLocalStorage } from "usehooks-ts";

export function useHideChatAlsoHidesWidget() {
  return useLocalStorage("hide-chat-also-hides-widget", false);
}

export function useToggleShowHide() {
  const { windowHidden, panelHidden } = useSharedState();
  const [hideChatAlsoHidesWidget] = useHideChatAlsoHidesWidget();

  const toggleShowHide = useEffectEvent(() => {
    if (hideChatAlsoHidesWidget) {
      const newWindowHidden = !windowHidden;
      updateState({
        windowHidden: newWindowHidden,
        panelHidden: newWindowHidden,
      });
    } else {
      const newPanelHidden = !panelHidden;
      updateState({
        panelHidden: newPanelHidden,
        windowHidden: !newPanelHidden ? false : undefined,
      });
    }
  });

  return { toggleShowHide };
}

/**
 * Ensure that, if hideChatAlsoHidesWidget is true, if the window is shown, the
 * panel must also be shown, e.g. when some external caller simply shows the
 * window, like when the user clicks "Session in progress" from
 * consumer-dashboard.
 */
export function useEnsureHideChatAlsoHidesWidget() {
  const { windowHidden, panelHidden } = useSharedState();
  const [hideChatAlsoHidesWidget] = useHideChatAlsoHidesWidget();

  useEffect(() => {
    if (hideChatAlsoHidesWidget) {
      if (!windowHidden && panelHidden) {
        updateState({ panelHidden: false });
      }
    }
  }, [hideChatAlsoHidesWidget, windowHidden, panelHidden]);
}
