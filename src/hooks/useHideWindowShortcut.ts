import { updateState, useSharedState } from "@/shared/shared";
import { useGlobalShortcut } from "./useGlobalShortcut";
import { useKeybindings } from "./useKeybindings";

export function useHideWindowShortcut() {
  const { windowHidden } = useSharedState();

  const shortcutEnabled = true;
  const keybindings = useKeybindings();

  useGlobalShortcut(keybindings.hide, () => updateState({ windowHidden: !windowHidden }), {
    enable: shortcutEnabled,
  });
}
