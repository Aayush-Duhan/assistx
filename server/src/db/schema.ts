import { sqliteTable, text, integer } from "drizzle-orm/sqlite-core";

// ============================================================================
// API Keys Table
// Stores encrypted API keys for various AI providers
// ============================================================================
export const apiKeys = sqliteTable("api_keys", {
  id: text("id").primaryKey(), // UUIDv7
  provider: text("provider").notNull(), // e.g., 'openai', 'anthropic', 'google'
  name: text("name").notNull(), // User-friendly name
  encryptedKey: text("encrypted_key").notNull(), // AES-256 encrypted
  isValid: integer("is_valid", { mode: "boolean" }).default(true),
  createdAt: integer("created_at", { mode: "timestamp" }).notNull(),
  updatedAt: integer("updated_at", { mode: "timestamp" }).notNull(),
});

// ============================================================================
// AI Models Table
// Metadata about available AI models
// ============================================================================
export const aiModels = sqliteTable("ai_models", {
  id: text("id").primaryKey(), // UUIDv7
  providerId: text("provider_id").notNull(), // e.g., 'openai', 'anthropic'
  modelId: text("model_id").notNull(), // e.g., 'gpt-4o', 'claude-3-5-sonnet'
  displayName: text("display_name").notNull(),
  contextWindow: integer("context_window"), // in tokens
  maxOutputTokens: integer("max_output_tokens"),
  supportsVision: integer("supports_vision", { mode: "boolean" }).default(false),
  supportsTools: integer("supports_tools", { mode: "boolean" }).default(false),
  isEnabled: integer("is_enabled", { mode: "boolean" }).default(true),
  isBuiltIn: integer("is_built_in", { mode: "boolean" }).default(false), // Built-in models from seed data
  createdAt: integer("created_at", { mode: "timestamp" }).notNull(),
  updatedAt: integer("updated_at", { mode: "timestamp" }).notNull(),
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
  modelId: text("model_id").references(() => aiModels.id),
  iconUrl: text("icon_url"), // CDN emoji URL
  iconBgColor: text("icon_bg_color"), // Background color (oklch format)
  toolConfig: text("tool_config", { mode: "json" }), // JSON: enabled MCP tools
  createdAt: integer("created_at", { mode: "timestamp" }).notNull(),
  updatedAt: integer("updated_at", { mode: "timestamp" }).notNull(),
});

// ============================================================================
// Workflows Table
// n8n-style workflow definitions
// ============================================================================
export const workflows = sqliteTable("workflows", {
  id: text("id").primaryKey(), // UUIDv7
  name: text("name").notNull(),
  description: text("description"),
  graphData: text("graph_data", { mode: "json" }).notNull(), // Nodes & edges JSON
  isActive: integer("is_active", { mode: "boolean" }).default(false),
  triggerType: text("trigger_type"), // 'manual', 'schedule', 'ai'
  lastRunAt: integer("last_run_at", { mode: "timestamp" }),
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
// MCP Servers Table
// Model Context Protocol server configurations
// ============================================================================
export const mcpServers = sqliteTable("mcp_servers", {
  id: text("id").primaryKey(), // UUIDv7
  name: text("name").notNull(),
  command: text("command").notNull(), // e.g., 'node', 'python'
  args: text("args", { mode: "json" }), // Command arguments as JSON array
  envVars: text("env_vars", { mode: "json" }), // Environment variables as JSON
  isEnabled: integer("is_enabled", { mode: "boolean" }).default(true),
  lastConnectedAt: integer("last_connected_at", { mode: "timestamp" }),
  createdAt: integer("created_at", { mode: "timestamp" }).notNull(),
  updatedAt: integer("updated_at", { mode: "timestamp" }).notNull(),
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
