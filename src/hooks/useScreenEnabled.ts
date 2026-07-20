import { useWidgetPreferences } from "@/stores/widgetPreferencesStore";
import { widgetPreferencesStore } from "@/stores/widgetPreferencesStore";

export function useScreenEnabled() {
  const isScreenEnabled = useWidgetPreferences((s) => s.screenEnabled);
  const setIsScreenEnabled = useWidgetPreferences((s) => s.setScreenEnabled);

  return [isScreenEnabled, setIsScreenEnabled] as const;
}

export function getScreenEnabled() {
  return widgetPreferencesStore.getState().screenEnabled;
}
