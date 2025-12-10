import { useSharedState } from "@/shared/shared";
import { type Keybindings } from "@/shared/sharedState";
import { mapEntries } from "radash";

export function useKeybindings(): Record<keyof Keybindings, string | undefined> {
  const { keybindings, keybindingsDisabled } = useSharedState();

  return mapEntries(keybindings, (key, value) => [
    key,
    keybindingsDisabled[key] ? undefined : value,
  ]);
}
