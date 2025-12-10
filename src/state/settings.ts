import { atomWithWebStorage } from "@/state/atomWithWebStorage";

export const autoLaunchAtLoginAtom = atomWithWebStorage<boolean>("auto-launch-at-login", true);

export const WIDGET_LOCAL_STORAGE_KEYS = {
    X: "widgetX",
    Y: "widgetY",
    HEIGHT: "widgetHeight",
};
