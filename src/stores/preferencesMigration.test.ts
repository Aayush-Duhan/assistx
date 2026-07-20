import { describe, it, expect } from "vitest";
import {
  buildMigratedPreferences,
  extractSelectedModel,
  runPreferencesMigration,
  MIGRATION_MARKER,
  LEGACY_KEYS,
  type StorageLike,
} from "./preferencesMigration";

/** In-memory storage for tests */
function createMockStorage(initial: Record<string, string> = {}): StorageLike & { store: Record<string, string> } {
  const store: Record<string, string> = { ...initial };
  return {
    store,
    getItem: (key: string) => store[key] ?? null,
    setItem: (key: string, value: string) => { store[key] = value; },
    removeItem: (key: string) => { delete store[key]; },
  };
}

describe("extractSelectedModel", () => {
  it("reads Jotai chatModel", () => {
    const storage = createMockStorage({
      chatModel: JSON.stringify({ provider: "openai", model: "gpt-4o" }),
    });
    expect(extractSelectedModel(storage)).toEqual({ provider: "openai", model: "gpt-4o" });
  });

  it("falls back to MobX assistx_settings", () => {
    const storage = createMockStorage({
      assistx_settings: JSON.stringify({ selectedProvider: "google", selectedModel: "gemini-2.5-flash" }),
    });
    expect(extractSelectedModel(storage)).toEqual({ provider: "google", model: "gemini-2.5-flash" });
  });

  it("prefers chatModel over assistx_settings", () => {
    const storage = createMockStorage({
      chatModel: JSON.stringify({ provider: "anthropic", model: "claude-4" }),
      assistx_settings: JSON.stringify({ selectedProvider: "google", selectedModel: "gemini-2.5-flash" }),
    });
    expect(extractSelectedModel(storage)).toEqual({ provider: "anthropic", model: "claude-4" });
  });

  it("returns null when both missing", () => {
    const storage = createMockStorage({});
    expect(extractSelectedModel(storage)).toBeNull();
  });

  it("returns null for malformed chatModel", () => {
    const storage = createMockStorage({
      chatModel: "not-json",
    });
    expect(extractSelectedModel(storage)).toBeNull();
  });

  it("returns null for chatModel missing fields", () => {
    const storage = createMockStorage({
      chatModel: JSON.stringify({ provider: "openai" }), // no model
    });
    expect(extractSelectedModel(storage)).toBeNull();
  });
});

describe("buildMigratedPreferences", () => {
  it("builds from complete legacy data", () => {
    const storage = createMockStorage({
      chatModel: JSON.stringify({ provider: "openai", model: "gpt-4o" }),
      "screen-enabled": "true",
      "hide-chat-also-hides-widget": "true",
      widgetX: "100",
      widgetY: "200",
      widgetHeight: "400",
    });

    const result = buildMigratedPreferences(storage);
    expect(result).toEqual({
      version: 1,
      selectedModel: { provider: "openai", model: "gpt-4o" },
      screenEnabled: true,
      hideChatAlsoHidesWidget: true,
      widgetX: 100,
      widgetY: 200,
      widgetHeight: 400,
    });
  });

  it("uses defaults for missing keys", () => {
    const storage = createMockStorage({});
    const result = buildMigratedPreferences(storage);
    expect(result).toEqual({
      version: 1,
      selectedModel: null,
      screenEnabled: true,
      hideChatAlsoHidesWidget: false,
      widgetX: null,
      widgetY: null,
      widgetHeight: null,
    });
  });

  it("handles malformed boolean as default", () => {
    const storage = createMockStorage({
      "screen-enabled": "not-a-boolean",
    });
    const result = buildMigratedPreferences(storage);
    expect(result.screenEnabled).toBe(true); // default
  });

  it("handles NaN number as null", () => {
    const storage = createMockStorage({
      widgetX: JSON.stringify(NaN),
    });
    const result = buildMigratedPreferences(storage);
    expect(result.widgetX).toBeNull();
  });

  it("handles Infinity number as null", () => {
    const storage = createMockStorage({
      widgetY: JSON.stringify(Infinity),
    });
    const result = buildMigratedPreferences(storage);
    expect(result.widgetY).toBeNull();
  });
});

describe("runPreferencesMigration", () => {
  it("writes unified payload and removes legacy keys", () => {
    const storage = createMockStorage({
      chatModel: JSON.stringify({ provider: "openai", model: "gpt-4o" }),
      "screen-enabled": "true",
      "hide-chat-also-hides-widget": "false",
      widgetX: "50",
      widgetY: "60",
      widgetHeight: "300",
      "auto-launch-at-login": "true",
      customKeybindings: JSON.stringify({}),
    });

    const result = runPreferencesMigration(storage, 1000);

    // Returns migrated prefs
    expect(result).not.toBeNull();
    expect(result!.selectedModel).toEqual({ provider: "openai", model: "gpt-4o" });

    // Wrote unified key
    const unified = JSON.parse(storage.store["widget-preferences-v1"]);
    expect(unified.version).toBe(1);

    // Removed legacy keys
    for (const key of LEGACY_KEYS) {
      expect(storage.store[key]).toBeUndefined();
    }

    // Removed obsolete keys
    expect(storage.store["auto-launch-at-login"]).toBeUndefined();
    expect(storage.store["customKeybindings"]).toBeUndefined();

    // Marker set
    expect(storage.store[MIGRATION_MARKER]).toBe("1000");
  });

  it("is idempotent — skips if marker exists", () => {
    const storage = createMockStorage({
      [MIGRATION_MARKER]: "999",
      chatModel: JSON.stringify({ provider: "openai", model: "gpt-4o" }),
    });

    const result = runPreferencesMigration(storage);
    expect(result).toBeNull();
    // chatModel not deleted
    expect(storage.store.chatModel).toBeDefined();
  });

  it("backs up malformed legacy value before deleting", () => {
    const storage = createMockStorage({
      chatModel: "{bad-json",
    });

    runPreferencesMigration(storage, 2000);

    // Backup created
    expect(storage.store["chatModel__backup_2000"]).toBe("{bad-json");
    // Original removed
    expect(storage.store.chatModel).toBeUndefined();
  });

  it("does not back up valid null values", () => {
    const storage = createMockStorage({
      widgetX: "null",
    });

    runPreferencesMigration(storage, 3000);

    // No backup for parseable "null"
    expect(storage.store["widgetX__backup_3000"]).toBeUndefined();
  });

  it("handles completely empty storage", () => {
    const storage = createMockStorage({});
    const result = runPreferencesMigration(storage);
    expect(result).not.toBeNull();
    expect(result!.version).toBe(1);
    expect(result!.selectedModel).toBeNull();
    expect(storage.store[MIGRATION_MARKER]).toBeDefined();
  });
});
