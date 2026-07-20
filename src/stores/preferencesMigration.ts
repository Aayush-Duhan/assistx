/**
 * Pure migration helpers for consolidating legacy localStorage keys
 * into a single versioned preferences payload.
 *
 * Strategy: read all legacy keys → build unified payload → write → delete consumed keys.
 * Malformed data gets backed up under a timestamped key before deletion.
 *
 * ponytail: No Zod validation here yet; add when preferences store lands (Phase 2).
 */

export const MIGRATION_MARKER = "legacy-state-cleanup-v1";

/** The unified preferences shape after migration */
export interface MigratedPreferences {
  version: 1;
  selectedModel: { provider: string; model: string } | null;
  screenEnabled: boolean;
  hideChatAlsoHidesWidget: boolean;
  widgetX: number | null;
  widgetY: number | null;
  widgetHeight: number | null;
}

/** Legacy keys we consume during migration */
export const LEGACY_KEYS = [
  "chatModel",
  "assistx_settings",
  "screen-enabled",
  "hide-chat-also-hides-widget",
  "widgetX",
  "widgetY",
  "widgetHeight",
] as const;

/** Obsolete keys to remove (no data to migrate, just cleanup) */
export const OBSOLETE_KEYS = [
  "userContext",
  "customKeybindings",
  "customKeybindingsDisabled",
  "auto-launch-at-login",
] as const;

/** Minimal storage interface for testability */
export interface StorageLike {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
  removeItem(key: string): void;
}

/** Parse JSON safely, returning null on failure */
function safeParse(raw: string | null): unknown {
  if (raw === null) return null;
  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

/**
 * Extract selectedModel from legacy sources.
 * Priority: chatModel (Jotai) > assistx_settings (MobX)
 */
export function extractSelectedModel(
  storage: StorageLike,
): { provider: string; model: string } | null {
  // Try Jotai chatModel first
  const chatModelRaw = storage.getItem("chatModel");
  const chatModel = safeParse(chatModelRaw);
  if (
    chatModel &&
    typeof chatModel === "object" &&
    "provider" in chatModel &&
    "model" in chatModel &&
    typeof (chatModel as any).provider === "string" &&
    typeof (chatModel as any).model === "string"
  ) {
    return {
      provider: (chatModel as any).provider,
      model: (chatModel as any).model,
    };
  }

  // Fall back to MobX settingsStore
  const settingsRaw = storage.getItem("assistx_settings");
  const settings = safeParse(settingsRaw);
  if (
    settings &&
    typeof settings === "object" &&
    "selectedProvider" in settings &&
    "selectedModel" in settings &&
    typeof (settings as any).selectedProvider === "string" &&
    typeof (settings as any).selectedModel === "string"
  ) {
    return {
      provider: (settings as any).selectedProvider,
      model: (settings as any).selectedModel,
    };
  }

  return null;
}

/**
 * Read a boolean from localStorage (stored as JSON string).
 * Returns the default if missing or malformed.
 */
function readBool(storage: StorageLike, key: string, defaultValue: boolean): boolean {
  const raw = storage.getItem(key);
  if (raw === null) return defaultValue;
  const parsed = safeParse(raw);
  return typeof parsed === "boolean" ? parsed : defaultValue;
}

/**
 * Read a number from localStorage (stored as JSON string).
 * Returns null if missing or malformed.
 */
function readNumber(storage: StorageLike, key: string): number | null {
  const raw = storage.getItem(key);
  if (raw === null) return null;
  const parsed = safeParse(raw);
  return typeof parsed === "number" && Number.isFinite(parsed) ? parsed : null;
}

/**
 * Build unified preferences from legacy localStorage keys.
 * Pure function — reads but does not write/delete.
 */
export function buildMigratedPreferences(storage: StorageLike): MigratedPreferences {
  return {
    version: 1,
    selectedModel: extractSelectedModel(storage),
    screenEnabled: readBool(storage, "screen-enabled", true),
    hideChatAlsoHidesWidget: readBool(storage, "hide-chat-also-hides-widget", false),
    widgetX: readNumber(storage, "widgetX"),
    widgetY: readNumber(storage, "widgetY"),
    widgetHeight: readNumber(storage, "widgetHeight"),
  };
}

/**
 * Back up a malformed key's raw value under a timestamped key.
 */
function backupIfMalformed(storage: StorageLike, key: string, timestamp: number): void {
  const raw = storage.getItem(key);
  if (raw === null) return;
  const parsed = safeParse(raw);
  if (parsed === null && raw !== "null") {
    // Raw exists but couldn't parse — back it up
    storage.setItem(`${key}__backup_${timestamp}`, raw);
  }
}

/**
 * Run the full migration: build payload, write unified key, delete consumed keys.
 * Idempotent — skips if marker already present.
 *
 * Returns the migrated preferences or null if already migrated.
 */
export function runPreferencesMigration(
  storage: StorageLike,
  timestamp = Date.now(),
): MigratedPreferences | null {
  // Already migrated?
  if (storage.getItem(MIGRATION_MARKER) !== null) {
    return null;
  }

  const prefs = buildMigratedPreferences(storage);

  // Back up any malformed legacy values before deleting
  for (const key of LEGACY_KEYS) {
    backupIfMalformed(storage, key, timestamp);
  }

  // Write unified payload
  storage.setItem("widget-preferences-v1", JSON.stringify(prefs));

  // Remove consumed keys only after successful write
  for (const key of LEGACY_KEYS) {
    storage.removeItem(key);
  }

  // Remove obsolete keys
  for (const key of OBSOLETE_KEYS) {
    storage.removeItem(key);
  }

  // Mark migration complete
  storage.setItem(MIGRATION_MARKER, String(timestamp));

  return prefs;
}
