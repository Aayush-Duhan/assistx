import { sqliteTable, text, integer } from "drizzle-orm/sqlite-core";

// ============================================================================
// Provider Connections Table
// Stores credentials (encrypted API keys or OAuth tokens) and configuration
// ============================================================================
export const providerConnections = sqliteTable("provider_connections", {
  id: text("id").primaryKey(), // UUID
  provider: text("provider").notNull(),
  authType: text("auth_type").notNull(), // 'apikey' | 'oauth' | 'cookie' | 'none'
  name: text("name"),
  email: text("email"),
  priority: integer("priority"),
  isActive: integer("is_active", { mode: "boolean" }).default(true),
  data: text("data").notNull(), // AES-256 encrypted JSON string containing credentials, defaultModel, testStatus, proxy configs
  createdAt: text("created_at").notNull(),
  updatedAt: text("updated_at").notNull(),
});

// ============================================================================
// Provider Nodes Table
// Custom endpoints configurations (e.g. OpenAI Compatible, Custom Embedding)
// ============================================================================
export const providerNodes = sqliteTable("provider_nodes", {
  id: text("id").primaryKey(), // provider identifier / node ID
  type: text("type"), // 'openai-compatible' | 'anthropic-compatible' | 'custom-embedding'
  name: text("name"),
  data: text("data").notNull(), // JSON string (baseUrl, prefix, apiType)
  createdAt: text("created_at").notNull(),
  updatedAt: text("updated_at").notNull(),
});

// ============================================================================
// Agents Table
// AI agent configurations with specialized roles
// ============================================================================
export const agents = sqliteTable("agents", {
  id: text("id").primaryKey(), // UUIDv7
  name: text("name").notNull(),
  description: text("description"),
  role: text("role"), // "This agent is a ___"
  systemPrompt: text("system_prompt").notNull(),
  modelId: text("model_id"), // Custom model ID (no reference constraints as models are listed dynamically)
  iconUrl: text("icon_url"), // CDN emoji URL
  iconBgColor: text("icon_bg_color"), // Background color (oklch format)
  toolConfig: text("tool_config", { mode: "json" }), // JSON: enabled tools
  createdAt: integer("created_at", { mode: "timestamp" }).notNull(),
  updatedAt: integer("updated_at", { mode: "timestamp" }).notNull(),
});

// ============================================================================
// Audio Sessions Table
// Granola-style meeting/audio session records
// ============================================================================
export const audioSessions = sqliteTable("audio_sessions", {
  id: text("id").primaryKey(), // UUIDv7
  title: text("title"),
  summary: text("summary"),
  startedAt: integer("started_at", { mode: "timestamp" }).notNull(),
  endedAt: integer("ended_at", { mode: "timestamp" }),
  durationSeconds: integer("duration_seconds"),
  createdAt: integer("created_at", { mode: "timestamp" }).notNull(),
});

// ============================================================================
// Transcripts Table
// Individual transcript entries within an audio session
// ============================================================================
export const transcripts = sqliteTable("transcripts", {
  id: text("id").primaryKey(), // UUIDv7
  sessionId: text("session_id")
    .references(() => audioSessions.id)
    .notNull(),
  speaker: text("speaker").notNull(), // 'me' | 'them' | speaker name
  text: text("text").notNull(),
  timestampMs: integer("timestamp_ms").notNull(), // Milliseconds from session start
  confidence: integer("confidence"), // 0-100
  createdAt: integer("created_at", { mode: "timestamp" }).notNull(),
});

// ============================================================================
// Modes Table
// User-defined AI contexts/modes
// ============================================================================
export const modes = sqliteTable("modes", {
  id: text("id").primaryKey(), // UUIDv7
  name: text("name").notNull(),
  description: text("description"),
  systemPrompt: text("system_prompt").notNull(),
  isActive: integer("is_active", { mode: "boolean" }).default(false),
  createdAt: integer("created_at", { mode: "timestamp" }).notNull(),
  updatedAt: integer("updated_at", { mode: "timestamp" }).notNull(),
});
