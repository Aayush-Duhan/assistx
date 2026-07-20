/**
 * Zustand store for widget preferences (model selection, screen-enabled).
 *
 * Single source of truth for the model used by AiApiService and UI.
 * Replaces: Jotai chatModelAtom, useScreenEnabled localStorage hook,
 * MobX settingsStore (selectedProvider/selectedModel).
 *
 * ponytail: Add persistence via server API (POST /api/preferences) when
 * the preferences endpoint lands. Currently persists to localStorage.
 */

import { createStore, useStore } from "zustand";

export interface ChatModel {
  provider: string;
  model: string;
}

interface WidgetPreferencesState {
  selectedModel: ChatModel | null;
  screenEnabled: boolean;
}

interface WidgetPreferencesActions {
  setSelectedModel: (model: ChatModel) => void;
  setScreenEnabled: (enabled: boolean) => void;
}

type WidgetPreferencesStore = WidgetPreferencesState & WidgetPreferencesActions;

const STORAGE_KEY = "widget-preferences-v1";

function loadFromStorage(): Partial<WidgetPreferencesState> {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw);
    return {
      selectedModel: parsed.selectedModel ?? null,
      screenEnabled: typeof parsed.screenEnabled === "boolean" ? parsed.screenEnabled : true,
    };
  } catch {
    return {};
  }
}

function saveToStorage(state: WidgetPreferencesState): void {
  try {
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({
        selectedModel: state.selectedModel,
        screenEnabled: state.screenEnabled,
      }),
    );
  } catch {
    // Ignore write failures
  }
}

// Also read legacy keys for backward compat (migration may not have run yet)
function loadInitialModel(): ChatModel | null {
  const stored = loadFromStorage();
  if (stored.selectedModel) return stored.selectedModel;

  // Fall back to legacy Jotai key
  try {
    const raw = localStorage.getItem("chatModel");
    if (raw) {
      const parsed = JSON.parse(raw);
      if (parsed?.provider && parsed?.model) {
        return { provider: parsed.provider, model: parsed.model };
      }
    }
  } catch {
    // ignore
  }

  // Fall back to legacy MobX key
  try {
    const raw = localStorage.getItem("assistx_settings");
    if (raw) {
      const parsed = JSON.parse(raw);
      if (parsed?.selectedProvider && parsed?.selectedModel) {
        return { provider: parsed.selectedProvider, model: parsed.selectedModel };
      }
    }
  } catch {
    // ignore
  }

  return null;
}

function loadInitialScreenEnabled(): boolean {
  const stored = loadFromStorage();
  if (typeof stored.screenEnabled === "boolean") return stored.screenEnabled;

  // Fall back to legacy key
  try {
    const raw = localStorage.getItem("screen-enabled");
    if (raw !== null) {
      return JSON.parse(raw) === true;
    }
  } catch {
    // ignore
  }
  return true;
}

export const widgetPreferencesStore = createStore<WidgetPreferencesStore>((set, get) => ({
  selectedModel: loadInitialModel(),
  screenEnabled: loadInitialScreenEnabled(),

  setSelectedModel: (model: ChatModel) => {
    set({ selectedModel: model });
    saveToStorage(get());
  },

  setScreenEnabled: (enabled: boolean) => {
    set({ screenEnabled: enabled });
    saveToStorage(get());
  },
}));

/**
 * React hook for the widget preferences store.
 * Usage: const model = useWidgetPreferences(s => s.selectedModel)
 */
export function useWidgetPreferences<T>(selector: (state: WidgetPreferencesStore) => T): T {
  return useStore(widgetPreferencesStore, selector);
}
