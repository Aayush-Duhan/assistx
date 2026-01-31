import { atom, useAtomValue, useSetAtom } from "jotai";

export const isSettingsVisibleAtom = atom(false);

export function useIsSettingsVisible() {
  return useAtomValue(isSettingsVisibleAtom);
}

export function useSetIsSettingsVisible() {
  return useSetAtom(isSettingsVisibleAtom);
}
