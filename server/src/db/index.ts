import Database from "better-sqlite3";
import { drizzle } from "drizzle-orm/better-sqlite3";
import { eq } from "drizzle-orm";
import * as schema from "./schema";
import path from "node:path";
import { existsSync, mkdirSync } from "node:fs";
import { uuidv7 } from "uuidv7";
import {
  DEFAULT_MODES,
  DEFAULT_AGENTS,
  BUILT_IN_MODELS,
  getProviderDisplayName,
} from "./seed-data";
import { logger } from "../lib/pino/logger";

// Types for external use
export type Mode = typeof schema.modes.$inferSelect;
export type NewMode = Omit<typeof schema.modes.$inferInsert, "id" | "createdAt" | "updatedAt">;

export type Agent = typeof schema.agents.$inferSelect;
export type NewAgent = Omit<typeof schema.agents.$inferInsert, "id" | "createdAt" | "updatedAt">;

// Database singleton instance
let sqlite: Database.Database | null = null;
let db: ReturnType<typeof drizzle<typeof schema>> | null = null;

/**
 * Get the path to the SQLite database file.
 */
function getDatabasePath(): string {
  const isDev = process.env.NODE_ENV !== "production";

  if (isDev) {
    return path.join(process.cwd(), "data", "assistx.db");
  }

  // Production: Use app data directory set by Electron
  const appDataPath = process.env.ASSISTX_DATA_PATH || path.join(process.cwd(), "data");
  return path.join(appDataPath, "assistx.db");
}

/**
 * Initialize and return the database instance.
 */
export function initializeDatabase() {
  if (db) {
    return db;
  }

  const dbPath = getDatabasePath();
  const dbDir = path.dirname(dbPath);

  // Ensure the directory exists
  if (!existsSync(dbDir)) {
    mkdirSync(dbDir, { recursive: true });
  }

  // Create the SQLite connection
  sqlite = new Database(dbPath);

  // Enable WAL mode for better concurrent access
  sqlite.pragma("journal_mode = WAL");

  // Create the Drizzle instance with schema
  db = drizzle(sqlite, { schema });

  // Run inline migrations
  runMigrations();

  // Seed default data
  seedDefaultModes();
  seedDefaultAgents();
  seedBuiltInModels();

  logger.info("db.init", "Database initialized", { path: dbPath });
  return db;
}

/**
 * Run inline migrations for all tables.
 */
function runMigrations() {
  if (!sqlite) return;

  // Modes table
  sqlite.exec(`
        CREATE TABLE IF NOT EXISTS modes (
            id TEXT PRIMARY KEY NOT NULL,
            name TEXT NOT NULL,
            description TEXT,
            system_prompt TEXT NOT NULL,
            is_active INTEGER DEFAULT 0 NOT NULL,
            created_at INTEGER NOT NULL,
            updated_at INTEGER NOT NULL
        )
    `);

  // Agents table
  sqlite.exec(`
        CREATE TABLE IF NOT EXISTS agents (
            id TEXT PRIMARY KEY NOT NULL,
            name TEXT NOT NULL,
            description TEXT,
            role TEXT,
            system_prompt TEXT NOT NULL,
            model_id TEXT,
            icon_url TEXT,
            icon_bg_color TEXT,
            tool_config TEXT,
            created_at INTEGER NOT NULL,
            updated_at INTEGER NOT NULL
        )
    `);

  // API Keys table
  sqlite.exec(`
        CREATE TABLE IF NOT EXISTS api_keys (
            id TEXT PRIMARY KEY NOT NULL,
            provider TEXT NOT NULL UNIQUE,
            name TEXT NOT NULL,
            encrypted_key TEXT NOT NULL,
            is_valid INTEGER DEFAULT 1,
            created_at INTEGER NOT NULL,
            updated_at INTEGER NOT NULL
        )
    `);

  // AI Models table (for built-in and custom models)
  sqlite.exec(`
        CREATE TABLE IF NOT EXISTS ai_models (
            id TEXT PRIMARY KEY NOT NULL,
            provider_id TEXT NOT NULL,
            model_id TEXT NOT NULL,
            display_name TEXT NOT NULL,
            context_window INTEGER,
            max_output_tokens INTEGER,
            supports_vision INTEGER DEFAULT 0,
            supports_tools INTEGER DEFAULT 0,
            is_enabled INTEGER DEFAULT 1,
            is_built_in INTEGER DEFAULT 0,
            created_at INTEGER NOT NULL,
            updated_at INTEGER NOT NULL
        )
    `);

  // Migration: Add is_built_in column if it doesn't exist
  const columns = sqlite.prepare("PRAGMA table_info(ai_models)").all() as { name: string }[];
  const hasBuiltInColumn = columns.some((col) => col.name === "is_built_in");
  if (!hasBuiltInColumn) {
    sqlite.exec("ALTER TABLE ai_models ADD COLUMN is_built_in INTEGER DEFAULT 0");
    logger.info("db.migration", "Added is_built_in column to ai_models");
  }

  // Workflows table
  sqlite.exec(`
        CREATE TABLE IF NOT EXISTS workflows (
            id TEXT PRIMARY KEY NOT NULL,
            name TEXT NOT NULL,
            description TEXT,
            version TEXT DEFAULT '1.0.0',
            icon TEXT,
            is_published INTEGER DEFAULT 0,
            is_active INTEGER DEFAULT 0,
            trigger_type TEXT,
            execution_context TEXT,
            last_run_at INTEGER,
            created_at INTEGER NOT NULL,
            updated_at INTEGER NOT NULL
        )
    `);

  // Migration: Add new columns to workflows if they don't exist
  const workflowColumns = sqlite.prepare("PRAGMA table_info(workflows)").all() as {
    name: string;
  }[];
  const workflowColNames = new Set(workflowColumns.map((col) => col.name));

  if (!workflowColNames.has("version")) {
    sqlite.exec("ALTER TABLE workflows ADD COLUMN version TEXT DEFAULT '1.0.0'");
    logger.info("db.migration", "Added version column to workflows");
  }
  if (!workflowColNames.has("icon")) {
    sqlite.exec("ALTER TABLE workflows ADD COLUMN icon TEXT");
    logger.info("db.migration", "Added icon column to workflows");
  }
  if (!workflowColNames.has("is_published")) {
    sqlite.exec("ALTER TABLE workflows ADD COLUMN is_published INTEGER DEFAULT 0");
    logger.info("db.migration", "Added is_published column to workflows");
  }
  if (!workflowColNames.has("execution_context")) {
    sqlite.exec("ALTER TABLE workflows ADD COLUMN execution_context TEXT");
    logger.info("db.migration", "Added execution_context column to workflows");
  }
  // Remove graph_data column migration not needed as SQLite doesn't support DROP COLUMN easily

  // Workflow Nodes table
  sqlite.exec(`
        CREATE TABLE IF NOT EXISTS workflow_nodes (
            id TEXT PRIMARY KEY NOT NULL,
            workflow_id TEXT NOT NULL REFERENCES workflows(id) ON DELETE CASCADE,
            kind TEXT NOT NULL,
            name TEXT NOT NULL,
            description TEXT,
            node_config TEXT,
            ui_config TEXT,
            created_at INTEGER NOT NULL,
            updated_at INTEGER NOT NULL
        )
    `);

  // Workflow Edges table
  sqlite.exec(`
        CREATE TABLE IF NOT EXISTS workflow_edges (
            id TEXT PRIMARY KEY NOT NULL,
            workflow_id TEXT NOT NULL REFERENCES workflows(id) ON DELETE CASCADE,
            source TEXT NOT NULL,
            target TEXT NOT NULL,
            ui_config TEXT,
            created_at INTEGER NOT NULL
        )
    `);

  logger.debug("db.migration", "Migrations complete");
}

/**
 * Seed default modes if the table is empty.
 */
function seedDefaultModes() {
  if (!sqlite) return;

  const count = sqlite.prepare("SELECT COUNT(*) as count FROM modes").get() as { count: number };
  if (count.count > 0) return;

  const now = Date.now();
  const stmt = sqlite.prepare(`
        INSERT INTO modes (id, name, description, system_prompt, is_active, created_at, updated_at)
        VALUES (?, ?, ?, ?, 0, ?, ?)
    `);

  for (const mode of DEFAULT_MODES) {
    stmt.run(mode.id, mode.name, mode.description, mode.systemPrompt, now, now);
  }

  logger.info("db.seed", "Seeded default modes");
}

/**
 * Seed default agents if the table is empty.
 */
function seedDefaultAgents() {
  if (!sqlite) return;

  const count = sqlite.prepare("SELECT COUNT(*) as count FROM agents").get() as { count: number };
  if (count.count > 0) return;

  const now = Date.now();
  const stmt = sqlite.prepare(`
        INSERT INTO agents (id, name, description, role, system_prompt, icon_url, icon_bg_color, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

  for (const agent of DEFAULT_AGENTS) {
    stmt.run(
      agent.id,
      agent.name,
      agent.description,
      agent.role,
      agent.systemPrompt,
      agent.iconUrl,
      agent.iconBgColor,
      now,
      now,
    );
  }

  logger.info("db.seed", "Seeded default agents");
}

/**
 * Seed built-in AI models if they don't exist.
 * Unlike default modes/agents, we check for each model individually
 * since users may have added custom models.
 */
function seedBuiltInModels() {
  if (!sqlite) return;

  const now = Date.now();

  // Get existing model IDs grouped by provider+modelId
  const existingModels = sqlite.prepare("SELECT provider_id, model_id FROM ai_models").all() as {
    provider_id: string;
    model_id: string;
  }[];

  const existingKeys = new Set(existingModels.map((m) => `${m.provider_id}:${m.model_id}`));

  const stmt = sqlite.prepare(`
        INSERT INTO ai_models (
            id, provider_id, model_id, display_name,
            context_window, max_output_tokens,
            supports_vision, supports_tools,
            is_enabled, is_built_in,
            created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, 1, 1, ?, ?)
    `);

  let seededCount = 0;
  for (const model of BUILT_IN_MODELS) {
    const key = `${model.providerId}:${model.modelId}`;
    if (!existingKeys.has(key)) {
      stmt.run(
        uuidv7(),
        model.providerId,
        model.modelId,
        model.displayName,
        model.contextWindow ?? null,
        model.maxOutputTokens ?? null,
        model.supportsVision ? 1 : 0,
        model.supportsTools ? 1 : 0,
        now,
        now,
      );
      seededCount++;
    }
  }

  if (seededCount > 0) {
    logger.info("db.seed", `Seeded ${seededCount} built-in AI models`, { count: seededCount });
  }
}

/**
 * Get the database instance (must be initialized first).
 */
export function getDatabase() {
  if (!db) {
    return initializeDatabase();
  }
  return db;
}

/**
 * Close the database connection.
 */
export function closeDatabase() {
  if (sqlite) {
    sqlite.close();
    sqlite = null;
    db = null;
    logger.info("db.close", "Database connection closed");
  }
}

// ============================================================================
// Modes CRUD Operations
// ============================================================================

export function listModes(): Mode[] {
  const database = getDatabase();
  return database.select().from(schema.modes).all();
}

export function createMode(data: NewMode): { id: string } {
  const database = getDatabase();
  const id = uuidv7();
  const now = new Date();

  database
    .insert(schema.modes)
    .values({
      id,
      name: data.name,
      description: data.description ?? null,
      systemPrompt: data.systemPrompt,
      isActive: false,
      createdAt: now,
      updatedAt: now,
    })
    .run();

  return { id };
}

export function updateMode(id: string, data: Partial<NewMode & { isActive: boolean }>): void {
  const database = getDatabase();
  const now = new Date();

  database
    .update(schema.modes)
    .set({
      ...data,
      updatedAt: now,
    })
    .where(eq(schema.modes.id, id))
    .run();
}

export function deleteMode(id: string): void {
  const database = getDatabase();
  database.delete(schema.modes).where(eq(schema.modes.id, id)).run();
}

export function setActiveMode(id: string | null): void {
  const database = getDatabase();
  const now = new Date();

  // First, deactivate all modes
  database.update(schema.modes).set({ isActive: false, updatedAt: now }).run();

  // Then activate the specified mode
  if (id) {
    database
      .update(schema.modes)
      .set({ isActive: true, updatedAt: now })
      .where(eq(schema.modes.id, id))
      .run();
  }
}

// ============================================================================
// Agents CRUD Operations
// ============================================================================

export function listAgents(): Agent[] {
  const database = getDatabase();
  return database.select().from(schema.agents).all();
}

export function createAgent(data: NewAgent): { id: string } {
  const database = getDatabase();
  const id = uuidv7();
  const now = new Date();

  database
    .insert(schema.agents)
    .values({
      id,
      name: data.name,
      description: data.description ?? null,
      role: data.role ?? null,
      systemPrompt: data.systemPrompt,
      iconUrl: data.iconUrl ?? null,
      iconBgColor: data.iconBgColor ?? null,
      toolConfig: data.toolConfig ?? null,
      createdAt: now,
      updatedAt: now,
    })
    .run();

  return { id };
}

export function updateAgent(id: string, data: Partial<NewAgent>): void {
  const database = getDatabase();
  const now = new Date();

  database
    .update(schema.agents)
    .set({
      ...data,
      updatedAt: now,
    })
    .where(eq(schema.agents.id, id))
    .run();
}

export function deleteAgent(id: string): void {
  const database = getDatabase();
  database.delete(schema.agents).where(eq(schema.agents.id, id)).run();
}

// ============================================================================
// Encryption Utilities (for API Keys)
// ============================================================================
import { createCipheriv, createDecipheriv, randomBytes, scryptSync } from "node:crypto";

const ENCRYPTION_ALGORITHM = "aes-256-gcm";

/**
 * Get or create the encryption key.
 * In production, this should be stored securely.
 * For now, we derive it from a fixed salt + app-specific secret.
 */
function getEncryptionKey(): Buffer {
  // Use app secret from env or a default (should be set in production)
  const secret =
    process.env.ASSISTX_ENCRYPTION_SECRET || "assistx-default-secret-key-change-in-prod";
  const salt = "assistx-api-keys-salt";
  return scryptSync(secret, salt, 32);
}

/**
 * Encrypt a plaintext API key.
 */
function encryptApiKey(plaintext: string): string {
  const key = getEncryptionKey();
  const iv = randomBytes(16);
  const cipher = createCipheriv(ENCRYPTION_ALGORITHM, key, iv);

  let encrypted = cipher.update(plaintext, "utf8", "hex");
  encrypted += cipher.final("hex");
  const authTag = cipher.getAuthTag().toString("hex");

  // Format: iv:authTag:encryptedData
  return `${iv.toString("hex")}:${authTag}:${encrypted}`;
}

/**
 * Decrypt an encrypted API key.
 */
function decryptApiKey(encrypted: string): string {
  const key = getEncryptionKey();
  const [ivHex, authTagHex, data] = encrypted.split(":");

  const iv = Buffer.from(ivHex, "hex");
  const authTag = Buffer.from(authTagHex, "hex");
  const decipher = createDecipheriv(ENCRYPTION_ALGORITHM, key, iv);
  decipher.setAuthTag(authTag);

  let decrypted = decipher.update(data, "hex", "utf8");
  decrypted += decipher.final("utf8");

  return decrypted;
}

// ============================================================================
// API Keys CRUD Operations
// ============================================================================

export interface ApiKeyInfo {
  provider: string;
  name: string;
  isValid: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export function listApiKeys(): ApiKeyInfo[] {
  const database = getDatabase();
  const rows = database
    .select({
      provider: schema.apiKeys.provider,
      name: schema.apiKeys.name,
      isValid: schema.apiKeys.isValid,
      createdAt: schema.apiKeys.createdAt,
      updatedAt: schema.apiKeys.updatedAt,
    })
    .from(schema.apiKeys)
    .all();

  return rows.map((row) => ({
    provider: row.provider,
    name: row.name,
    isValid: row.isValid ?? true,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  }));
}

export function getApiKeyForProvider(provider: string): string | null {
  const database = getDatabase();
  const row = database
    .select()
    .from(schema.apiKeys)
    .where(eq(schema.apiKeys.provider, provider))
    .get();

  if (!row || !row.encryptedKey) return null;

  try {
    return decryptApiKey(row.encryptedKey);
  } catch (e) {
    logger.error(
      e instanceof Error ? e : new Error(String(e)),
      "db.decrypt.error",
      `Failed to decrypt API key for ${provider}`,
      { provider },
    );
    return null;
  }
}

export function saveApiKey(provider: string, plainKey: string): void {
  const database = getDatabase();
  const now = new Date();
  const encrypted = encryptApiKey(plainKey);

  // Check if key already exists for this provider
  const existing = database
    .select()
    .from(schema.apiKeys)
    .where(eq(schema.apiKeys.provider, provider))
    .get();

  if (existing) {
    // Update existing
    database
      .update(schema.apiKeys)
      .set({
        encryptedKey: encrypted,
        isValid: true,
        updatedAt: now,
      })
      .where(eq(schema.apiKeys.provider, provider))
      .run();
  } else {
    // Insert new
    database
      .insert(schema.apiKeys)
      .values({
        id: uuidv7(),
        provider,
        name: getProviderDisplayName(provider),
        encryptedKey: encrypted,
        isValid: true,
        createdAt: now,
        updatedAt: now,
      })
      .run();
  }
}

export function deleteApiKey(provider: string): void {
  const database = getDatabase();
  database.delete(schema.apiKeys).where(eq(schema.apiKeys.provider, provider)).run();
}

// getProviderDisplayName is now imported from seed-data.ts

// ============================================================================
// AI Models CRUD Operations
// ============================================================================

export interface AIModel {
  id: string;
  providerId: string;
  modelId: string;
  displayName: string;
  contextWindow: number | null;
  maxOutputTokens: number | null;
  supportsVision: boolean;
  supportsTools: boolean;
  isEnabled: boolean;
  isBuiltIn: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface NewAIModel {
  providerId: string;
  modelId: string;
  displayName: string;
  contextWindow?: number;
  maxOutputTokens?: number;
  supportsVision?: boolean;
  supportsTools?: boolean;
  isBuiltIn?: boolean;
}

export function listAIModels(): AIModel[] {
  const database = getDatabase();
  const rows = database.select().from(schema.aiModels).all();
  return rows.map((row) => ({
    id: row.id,
    providerId: row.providerId,
    modelId: row.modelId,
    displayName: row.displayName,
    contextWindow: row.contextWindow,
    maxOutputTokens: row.maxOutputTokens,
    supportsVision: row.supportsVision ?? false,
    supportsTools: row.supportsTools ?? false,
    isEnabled: row.isEnabled ?? true,
    isBuiltIn: row.isBuiltIn ?? false,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  }));
}

export function createAIModel(data: NewAIModel): { id: string } {
  const database = getDatabase();
  const now = new Date();
  const id = uuidv7();

  database
    .insert(schema.aiModels)
    .values({
      id,
      providerId: data.providerId,
      modelId: data.modelId,
      displayName: data.displayName,
      contextWindow: data.contextWindow,
      maxOutputTokens: data.maxOutputTokens,
      supportsVision: data.supportsVision ?? false,
      supportsTools: data.supportsTools ?? false,
      isEnabled: true,
      isBuiltIn: data.isBuiltIn ?? false,
      createdAt: now,
      updatedAt: now,
    })
    .run();

  return { id };
}

export function updateAIModel(
  id: string,
  data: Partial<NewAIModel & { isEnabled: boolean }>,
): void {
  const database = getDatabase();
  const now = new Date();

  database
    .update(schema.aiModels)
    .set({
      ...data,
      updatedAt: now,
    })
    .where(eq(schema.aiModels.id, id))
    .run();
}

export function deleteAIModel(id: string): void {
  const database = getDatabase();
  database.delete(schema.aiModels).where(eq(schema.aiModels.id, id)).run();
}

// ============================================================================
// Workflows CRUD Operations
// ============================================================================

import { and, inArray } from "drizzle-orm";

export interface Workflow {
  id: string;
  name: string;
  description: string | null;
  version: string;
  icon: { type: string; value: string; style?: Record<string, string> } | null;
  isPublished: boolean;
  isActive: boolean;
  triggerType: string | null;
  executionContext: {
    screenshot?: boolean;
    conversationHistory?: boolean;
    userPreferences?: boolean;
  } | null;
  lastRunAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface WorkflowNode {
  id: string;
  workflowId: string;
  kind: string;
  name: string;
  description: string | null;
  nodeConfig: Record<string, unknown> | null;
  uiConfig: Record<string, unknown> | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface WorkflowEdge {
  id: string;
  workflowId: string;
  source: string;
  target: string;
  uiConfig: Record<string, unknown> | null;
  createdAt: Date;
}

export interface NewWorkflow {
  name: string;
  description?: string;
  icon?: { type: string; value: string; style?: Record<string, string> };
}

export function listWorkflows(): Workflow[] {
  const database = getDatabase();
  const rows = database.select().from(schema.workflows).all();
  return rows.map((row) => ({
    id: row.id,
    name: row.name,
    description: row.description,
    version: row.version ?? "1.0.0",
    icon: row.icon as Workflow["icon"],
    isPublished: row.isPublished ?? false,
    isActive: row.isActive ?? false,
    triggerType: row.triggerType,
    executionContext: row.executionContext as Workflow["executionContext"],
    lastRunAt: row.lastRunAt,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  }));
}

export function getWorkflowById(id: string): Workflow | null {
  const database = getDatabase();
  const row = database.select().from(schema.workflows).where(eq(schema.workflows.id, id)).get();

  if (!row) return null;

  return {
    id: row.id,
    name: row.name,
    description: row.description,
    version: row.version ?? "1.0.0",
    icon: row.icon as Workflow["icon"],
    isPublished: row.isPublished ?? false,
    isActive: row.isActive ?? false,
    triggerType: row.triggerType,
    executionContext: row.executionContext as Workflow["executionContext"],
    lastRunAt: row.lastRunAt,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}

export function getWorkflowWithStructure(
  id: string,
): (Workflow & { nodes: WorkflowNode[]; edges: WorkflowEdge[] }) | null {
  const workflow = getWorkflowById(id);
  if (!workflow) return null;

  const database = getDatabase();

  const nodes = database
    .select()
    .from(schema.workflowNodes)
    .where(eq(schema.workflowNodes.workflowId, id))
    .all()
    .map((row) => ({
      id: row.id,
      workflowId: row.workflowId,
      kind: row.kind,
      name: row.name,
      description: row.description,
      nodeConfig: row.nodeConfig as WorkflowNode["nodeConfig"],
      uiConfig: row.uiConfig as WorkflowNode["uiConfig"],
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
    }));

  const edges = database
    .select()
    .from(schema.workflowEdges)
    .where(eq(schema.workflowEdges.workflowId, id))
    .all()
    .map((row) => ({
      id: row.id,
      workflowId: row.workflowId,
      source: row.source,
      target: row.target,
      uiConfig: row.uiConfig as WorkflowEdge["uiConfig"],
      createdAt: row.createdAt,
    }));

  return { ...workflow, nodes, edges };
}

export function createWorkflow(data: NewWorkflow): { id: string } {
  const database = getDatabase();
  const id = uuidv7();
  const now = new Date();

  database
    .insert(schema.workflows)
    .values({
      id,
      name: data.name,
      description: data.description ?? null,
      version: "1.0.0",
      icon: data.icon ?? null,
      isPublished: false,
      isActive: false,
      createdAt: now,
      updatedAt: now,
    })
    .run();

  // Create a default Input node for new workflows
  const inputNodeId = uuidv7();
  database
    .insert(schema.workflowNodes)
    .values({
      id: inputNodeId,
      workflowId: id,
      kind: "input",
      name: "INPUT",
      nodeConfig: { outputSchema: { type: "object", properties: {}, required: [] } },
      uiConfig: { position: { x: 100, y: 100 } },
      createdAt: now,
      updatedAt: now,
    })
    .run();

  return { id };
}

export function updateWorkflow(
  id: string,
  data: Partial<{
    name: string;
    description: string;
    icon: { type: string; value: string; style?: Record<string, string> };
    isPublished: boolean;
    isActive: boolean;
    triggerType: string;
    executionContext: {
      screenshot?: boolean;
      conversationHistory?: boolean;
      userPreferences?: boolean;
    };
  }>,
): void {
  const database = getDatabase();
  const now = new Date();

  database
    .update(schema.workflows)
    .set({
      ...data,
      updatedAt: now,
    })
    .where(eq(schema.workflows.id, id))
    .run();
}

export function deleteWorkflow(id: string): void {
  const database = getDatabase();
  // Cascade delete handles nodes and edges
  database.delete(schema.workflows).where(eq(schema.workflows.id, id)).run();
}

export function saveWorkflowStructure(
  workflowId: string,
  data: {
    nodes?: Array<{
      id: string;
      workflowId: string;
      kind: string;
      name: string;
      description?: string;
      nodeConfig?: Record<string, unknown>;
      uiConfig?: Record<string, unknown>;
    }>;
    edges?: Array<{
      id: string;
      workflowId: string;
      source: string;
      target: string;
      uiConfig?: Record<string, unknown>;
    }>;
    deleteNodes?: string[];
    deleteEdges?: string[];
  },
): void {
  const database = getDatabase();
  const now = new Date();

  // Delete nodes if specified
  if (data.deleteNodes && data.deleteNodes.length > 0) {
    database
      .delete(schema.workflowNodes)
      .where(
        and(
          eq(schema.workflowNodes.workflowId, workflowId),
          inArray(schema.workflowNodes.id, data.deleteNodes),
        ),
      )
      .run();
  }

  // Delete edges if specified
  if (data.deleteEdges && data.deleteEdges.length > 0) {
    database
      .delete(schema.workflowEdges)
      .where(
        and(
          eq(schema.workflowEdges.workflowId, workflowId),
          inArray(schema.workflowEdges.id, data.deleteEdges),
        ),
      )
      .run();
  }

  // Upsert nodes
  if (data.nodes && data.nodes.length > 0) {
    for (const node of data.nodes) {
      const existing = database
        .select()
        .from(schema.workflowNodes)
        .where(eq(schema.workflowNodes.id, node.id))
        .get();

      if (existing) {
        database
          .update(schema.workflowNodes)
          .set({
            kind: node.kind,
            name: node.name,
            description: node.description ?? null,
            nodeConfig: node.nodeConfig ?? null,
            uiConfig: node.uiConfig ?? null,
            updatedAt: now,
          })
          .where(eq(schema.workflowNodes.id, node.id))
          .run();
      } else {
        database
          .insert(schema.workflowNodes)
          .values({
            id: node.id,
            workflowId,
            kind: node.kind,
            name: node.name,
            description: node.description ?? null,
            nodeConfig: node.nodeConfig ?? null,
            uiConfig: node.uiConfig ?? null,
            createdAt: now,
            updatedAt: now,
          })
          .run();
      }
    }
  }

  // Upsert edges (edges are simpler, just insert if not exists)
  if (data.edges && data.edges.length > 0) {
    for (const edge of data.edges) {
      const existing = database
        .select()
        .from(schema.workflowEdges)
        .where(eq(schema.workflowEdges.id, edge.id))
        .get();

      if (!existing) {
        database
          .insert(schema.workflowEdges)
          .values({
            id: edge.id,
            workflowId,
            source: edge.source,
            target: edge.target,
            uiConfig: edge.uiConfig ?? null,
            createdAt: now,
          })
          .run();
      }
    }
  }

  // Update workflow's updatedAt
  database
    .update(schema.workflows)
    .set({ updatedAt: now })
    .where(eq(schema.workflows.id, workflowId))
    .run();
}

// Export the schema for use in queries
export { schema };

// Re-export seed data for external use
export {
  PROVIDERS,
  BUILT_IN_MODELS,
  DEFAULT_MODES,
  DEFAULT_AGENTS,
  getProviderDisplayName,
  getBuiltInModelsByProvider,
  type BuiltInModel,
  type DefaultMode,
  type DefaultAgent,
  type ProviderConfig,
} from "./seed-data";
