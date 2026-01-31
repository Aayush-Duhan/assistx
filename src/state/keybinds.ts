import { atom, useAtomValue, useSetAtom } from "jotai";
import { atomWithStorage } from "jotai/utils";
import { mapEntries } from "radash";
import { useCallback } from "react";

const KEYBINDINGS = [
  "start_over",
  "trigger_ai",
  "hide",
  "move_window_up",
  "move_window_down",
  "move_window_left",
  "move_window_right",
  "scroll_response_up",
  "scroll_response_down",
  "toggle_session",
] as const;

export function isValidKeybindingKey(key: string): key is KeybindingKey {
  return (KEYBINDINGS as readonly string[]).includes(key);
}

type Accelerator = string;

export type KeybindingKey = (typeof KEYBINDINGS)[number];

export type Keybindings = Record<KeybindingKey, Accelerator>;

export type IpcKeybindings = Record<KeybindingKey, { accelerator: Accelerator; disabled: boolean }>;

export const DEFAULT_KEYBINDINGS: Keybindings = {
  start_over: "CommandOrControl+R",
  trigger_ai: "CommandOrControl+Enter",
  hide: "CommandOrControl+\\",
  move_window_up: "CommandOrControl+Up",
  move_window_down: "CommandOrControl+Down",
  move_window_left: "CommandOrControl+Left",
  move_window_right: "CommandOrControl+Right",
  scroll_response_up: "CommandOrControl+Shift+Up",
  scroll_response_down: "CommandOrControl+Shift+Down",
  toggle_session: "CommandOrControl+Shift+\\",
};

export type KeybindingsDisabled = Partial<Record<KeybindingKey, boolean>>;

const keybindingsAtom = atomWithStorage("customKeybindings", DEFAULT_KEYBINDINGS);

export const keybindingsDisabledAtom = atomWithStorage<KeybindingsDisabled>(
  "customKeybindingsDisabled",
  {
    toggle_session: true,
  },
);

export function useKeybindings() {
  const keybindings = useAtomValue(keybindingsAtom);
  const keybindingsDisabled = useAtomValue(keybindingsDisabledAtom);

  return mapEntries(keybindings, (key, value) => [
    key,
    keybindingsDisabled[key] ? undefined : value,
  ]);
}

export function useSetKeybinding() {
  const setKeybindings = useSetAtom(keybindingsAtom);
  return useCallback(
    (key: KeybindingKey, accelerator: Accelerator | undefined) => {
      setKeybindings((old) => ({ ...old, [key]: accelerator ?? DEFAULT_KEYBINDINGS[key] }));
    },
    [setKeybindings],
  );
}

export function useSetKeybindingDisabled() {
  const setKeybindingsDisabled = useSetAtom(keybindingsDisabledAtom);
  return useCallback(
    (key: KeybindingKey, disabled: boolean) => {
      setKeybindingsDisabled((old) => ({ ...old, [key]: disabled }));
    },
    [setKeybindingsDisabled],
  );
}

// new settings page -> bypass CUSTOM_KEYBINDINGS feature flag
export function useGetKeybindingsForNewSettings(): IpcKeybindings {
  const keybindings = useAtomValue(keybindingsAtom);
  const keybindingsDisabled = useAtomValue(keybindingsDisabledAtom);

  return KEYBINDINGS.reduce((acc, key) => {
    acc[key] = {
      accelerator: keybindings[key] ?? DEFAULT_KEYBINDINGS[key],
      disabled: !!keybindingsDisabled[key],
    };
    return acc;
  }, {} as IpcKeybindings);
}

export const recordingKeybindingAtom = atom(false);
