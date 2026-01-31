import { useGlobalShortcut } from "./useGlobalShortcut";
import { useKeybindings } from "./useKeybindings";
import { useToggleShowHide } from "@/apps/widgetApp/hooks/useToggleShowHide";

export function useHideWindowShortcut() {
  const keybindings = useKeybindings();
  const { toggleShowHide } = useToggleShowHide();

  useGlobalShortcut(keybindings.hide, toggleShowHide, {
    enable: true,
  });
}
