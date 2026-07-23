import Database from "better-sqlite3";
import { drizzle } from "drizzle-orm/better-sqlite3";
import { eq, and } from "drizzle-orm";
import * as schema from "./schema";
import path from "node:path";
import { existsSync, mkdirSync } from "node:fs";
import { uuidv7 } from "uuidv7";
import { DEFAULT_MODES, DEFAULT_AGENTS, getProviderDisplayName } from "./seed-data";
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
  migrateApiKeysToProviderConnections();

  // Start proactive token refresh for OAuth connections
  import("../lib/oauth/tokenRefreshService")
    .then((m) => m.startTokenRefreshService())
    .catch(() => {});

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

  // Provider Connections table
  sqlite.exec(`
        CREATE TABLE IF NOT EXISTS provider_connections (
            id TEXT PRIMARY KEY NOT NULL,
            provider TEXT NOT NULL,
            auth_type TEXT NOT NULL,
            name TEXT,
            email TEXT,
            priority INTEGER,
            is_active INTEGER DEFAULT 1,
            data TEXT NOT NULL,
            created_at TEXT NOT NULL,
            updated_at TEXT NOT NULL
        )
    `);

  // Provider Nodes table
  sqlite.exec(`
        CREATE TABLE IF NOT EXISTS provider_nodes (
            id TEXT PRIMARY KEY NOT NULL,
            type TEXT,
            name TEXT,
            data TEXT NOT NULL,
            created_at TEXT NOT NULL,
            updated_at TEXT NOT NULL
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
// Provider Connections & Nodes CRUD Operations
// ============================================================================

export function rowToConn(row: any): any {
  if (!row) return null;
  let decryptedData = {};
  try {
    if (row.data) {
      decryptedData = JSON.parse(decryptApiKey(row.data));
    }
  } catch (e) {
    logger.error(
      e instanceof Error ? e : new Error(String(e)),
      "db.rowToConn.decrypt.error",
      "Failed to decrypt connection data",
    );
  }
  return {
    ...decryptedData,
    id: row.id,
    provider: row.provider,
    authType: row.authType,
    name: row.name,
    email: row.email,
    priority: row.priority,
    isActive: row.isActive === 1 || row.isActive === true || row.isActive === "1",
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}

export function connToRow(c: any): any {
  const { id, provider, authType, name, email, priority, isActive, createdAt, updatedAt, ...rest } =
    c;
  const encryptedData = encryptApiKey(JSON.stringify(rest));
  return {
    id,
    provider,
    authType,
    name: name ?? null,
    email: email ?? null,
    priority: priority ?? null,
    isActive: isActive !== false,
    data: encryptedData,
    createdAt: createdAt || new Date().toISOString(),
    updatedAt: updatedAt || new Date().toISOString(),
  };
}

export function getProviderConnections(
  filter: { provider?: string; isActive?: boolean } = {},
): any[] {
  const database = getDatabase();
  const conditions = [];
  if (filter.provider) {
    conditions.push(eq(schema.providerConnections.provider, filter.provider));
  }
  if (filter.isActive !== undefined) {
    conditions.push(eq(schema.providerConnections.isActive, filter.isActive));
  }

  let query = database.select().from(schema.providerConnections);
  if (conditions.length > 0) {
    query = query.where(and(...conditions)) as any;
  }

  const rows = query.all();
  const list = rows.map(rowToConn);
  list.sort((a, b) => (a.priority || 999) - (b.priority || 999));
  return list;
}

export function getProviderConnectionById(id: string): any {
  const database = getDatabase();
  const row = database
    .select()
    .from(schema.providerConnections)
    .where(eq(schema.providerConnections.id, id))
    .get();
  return rowToConn(row);
}

export function createProviderConnection(data: any): any {
  const database = getDatabase();
  const now = new Date().toISOString();

  const all = getProviderConnections({ provider: data.provider });
  let existing = null;
  if (data.authType === "oauth" && data.email) {
    const incomingUsername = data.providerSpecificData?.username;
    const incomingWs = data.providerSpecificData?.chatgptAccountId;
    existing = all.find((c) => {
      if (c.authType !== "oauth" || c.email !== data.email) return false;
      if (data.provider === "codex") {
        const existingWs = c.providerSpecificData?.chatgptAccountId;
        return !!incomingWs && !!existingWs && incomingWs === existingWs;
      }
      const existingWs = c.providerSpecificData?.chatgptAccountId;
      if (incomingWs && existingWs) return incomingWs === existingWs;
      if (incomingWs && !existingWs) return false;
      if (!incomingWs && existingWs) return false;
      const existingUsername = c.providerSpecificData?.username;
      if (incomingUsername && existingUsername) {
        return incomingUsername === existingUsername;
      }
      if (incomingUsername || existingUsername) return false;
      return true;
    });
  } else if (data.authType === "apikey" && data.name) {
    existing = all.find((c) => c.authType === "apikey" && c.name === data.name);
  }

  if (existing) {
    const merged = { ...existing, ...data, updatedAt: now };
    const r = connToRow(merged);
    database
      .update(schema.providerConnections)
      .set({
        provider: r.provider,
        authType: r.authType,
        name: r.name,
        email: r.email,
        priority: r.priority,
        isActive: r.isActive,
        data: r.data,
        updatedAt: r.updatedAt,
      })
      .where(eq(schema.providerConnections.id, existing.id))
      .run();
    return getProviderConnectionById(existing.id);
  }

  let connectionName = data.name || null;
  if (!connectionName && (data.authType === "oauth" || data.authType === "access_token")) {
    connectionName = deriveConnectionName(data, data.email || `Account ${all.length + 1}`);
  }
  let connectionPriority = data.priority;
  if (!connectionPriority) {
    connectionPriority = all.reduce((m, c) => Math.max(m, c.priority || 0), 0) + 1;
  }

  const conn: any = {
    id: uuidv7(),
    provider: data.provider,
    authType: data.authType || "oauth",
    name: connectionName,
    priority: connectionPriority,
    isActive: data.isActive !== undefined ? data.isActive : true,
    createdAt: now,
    updatedAt: now,
  };

  const OPTIONAL_FIELDS = [
    "displayName",
    "email",
    "globalPriority",
    "defaultModel",
    "accessToken",
    "refreshToken",
    "expiresAt",
    "tokenType",
    "scope",
    "projectId",
    "apiKey",
    "testStatus",
    "lastTested",
    "lastError",
    "lastErrorAt",
    "rateLimitedUntil",
    "expiresIn",
    "errorCode",
    "consecutiveUseCount",
    "idToken",
    "lastRefreshAt",
  ];
  for (const f of OPTIONAL_FIELDS) {
    if (data[f] !== undefined && data[f] !== null) conn[f] = data[f];
  }
  if (data.providerSpecificData && Object.keys(data.providerSpecificData).length > 0) {
    conn.providerSpecificData = data.providerSpecificData;
  }
  if (data.email !== undefined) conn.email = data.email;

  const r = connToRow(conn);
  database.insert(schema.providerConnections).values(r).run();

  reorderInTx(data.provider);

  return getProviderConnectionById(conn.id);
}

export function updateProviderConnection(id: string, data: any): any {
  const database = getDatabase();
  const existing = getProviderConnectionById(id);
  if (!existing) return null;

  const merged = { ...existing, ...data, updatedAt: new Date().toISOString() };
  const r = connToRow(merged);

  database
    .update(schema.providerConnections)
    .set({
      provider: r.provider,
      authType: r.authType,
      name: r.name,
      email: r.email,
      priority: r.priority,
      isActive: r.isActive,
      data: r.data,
      updatedAt: r.updatedAt,
    })
    .where(eq(schema.providerConnections.id, id))
    .run();

  if (data.priority !== undefined) {
    reorderInTx(existing.provider);
  }

  return getProviderConnectionById(id);
}

export function deleteProviderConnection(id: string): boolean {
  const database = getDatabase();
  const existing = getProviderConnectionById(id);
  if (!existing) return false;

  database.delete(schema.providerConnections).where(eq(schema.providerConnections.id, id)).run();

  reorderInTx(existing.provider);
  return true;
}

export function deleteProviderConnectionsByProvider(providerId: string): number {
  const database = getDatabase();
  const rows = getProviderConnections({ provider: providerId });
  database
    .delete(schema.providerConnections)
    .where(eq(schema.providerConnections.provider, providerId))
    .run();
  return rows.length;
}

function deriveConnectionName(data: any, fallbackName: string) {
  if (data.provider === "github") {
    return (
      data.providerSpecificData?.githubLogin ||
      data.providerSpecificData?.githubEmail ||
      data.email ||
      data.providerSpecificData?.githubName ||
      fallbackName
    );
  }
  return fallbackName;
}

function reorderInTx(providerId: string) {
  const database = getDatabase();
  const list = getProviderConnections({ provider: providerId });
  list.sort((a, b) => {
    const pDiff = (a.priority || 0) - (b.priority || 0);
    if (pDiff !== 0) return pDiff;
    return new Date(b.updatedAt || 0).getTime() - new Date(a.updatedAt || 0).getTime();
  });
  list.forEach((c, i) => {
    database
      .update(schema.providerConnections)
      .set({ priority: i + 1 })
      .where(eq(schema.providerConnections.id, c.id))
      .run();
  });
}

export function rowToNode(row: any): any {
  if (!row) return null;
  let parsedData = {};
  try {
    if (row.data) {
      parsedData = JSON.parse(row.data);
    }
  } catch (e) {
    logger.error(
      e instanceof Error ? e : new Error(String(e)),
      "db.rowToNode.parse.error",
      "Failed to parse node data",
    );
  }
  return {
    ...parsedData,
    id: row.id,
    type: row.type,
    name: row.name,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}

export function nodeToRow(n: any): any {
  const { id, type, name, createdAt, updatedAt, ...rest } = n;
  return {
    id,
    type: type ?? null,
    name: name ?? null,
    data: JSON.stringify(rest),
    createdAt: createdAt || new Date().toISOString(),
    updatedAt: updatedAt || new Date().toISOString(),
  };
}

export function getProviderNodes(filter: { type?: string } = {}): any[] {
  const database = getDatabase();
  let query = database.select().from(schema.providerNodes);
  if (filter.type) {
    query = query.where(eq(schema.providerNodes.type, filter.type)) as any;
  }
  const rows = query.all();
  return rows.map(rowToNode);
}

export function getProviderNodeById(id: string): any {
  const database = getDatabase();
  const row = database
    .select()
    .from(schema.providerNodes)
    .where(eq(schema.providerNodes.id, id))
    .get();
  return rowToNode(row);
}

export function createProviderNode(data: any): any {
  const database = getDatabase();
  const now = new Date().toISOString();
  const node = {
    id: data.id || uuidv7(),
    type: data.type,
    name: data.name,
    prefix: data.prefix,
    apiType: data.apiType,
    baseUrl: data.baseUrl,
    createdAt: now,
    updatedAt: now,
  };
  const r = nodeToRow(node);

  database
    .insert(schema.providerNodes)
    .values(r)
    .onConflictDoUpdate({
      target: schema.providerNodes.id,
      set: {
        type: r.type,
        name: r.name,
        data: r.data,
        updatedAt: r.updatedAt,
      },
    })
    .run();

  return node;
}

export function updateProviderNode(id: string, data: any): any {
  const database = getDatabase();
  const existing = getProviderNodeById(id);
  if (!existing) return null;
  const merged = { ...existing, ...data, updatedAt: new Date().toISOString() };
  const r = nodeToRow(merged);

  database
    .update(schema.providerNodes)
    .set({
      type: r.type,
      name: r.name,
      data: r.data,
      updatedAt: r.updatedAt,
    })
    .where(eq(schema.providerNodes.id, id))
    .run();

  return getProviderNodeById(id);
}

export function deleteProviderNode(id: string): any {
  const database = getDatabase();
  const existing = getProviderNodeById(id);
  if (!existing) return null;

  database.delete(schema.providerNodes).where(eq(schema.providerNodes.id, id)).run();

  return existing;
}

export function getActiveCredentialForProvider(
  providerId: string,
): { apiKey?: string; accessToken?: string } | null {
  const connections = getProviderConnections({ provider: providerId, isActive: true });
  if (connections.length === 0) return null;
  const conn = connections[0];
  return {
    apiKey: conn.apiKey,
    accessToken: conn.accessToken,
  };
}

export function getApiKeyForProvider(provider: string): string | null {
  const cred = getActiveCredentialForProvider(provider);
  return cred?.apiKey || cred?.accessToken || null;
}

export interface ApiKeyInfo {
  provider: string;
  name: string;
  isValid: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export function listApiKeys(): ApiKeyInfo[] {
  const connections = getProviderConnections();
  return connections.map((conn) => ({
    provider: conn.provider,
    name: conn.name || getProviderDisplayName(conn.provider),
    isValid: conn.isActive,
    createdAt: new Date(conn.createdAt),
    updatedAt: new Date(conn.updatedAt),
  }));
}

export function saveApiKey(provider: string, plainKey: string, name?: string): void {
  createProviderConnection({
    provider,
    authType: "apikey",
    apiKey: plainKey,
    name: name ?? getProviderDisplayName(provider),
    isActive: true,
  });
}

export function deleteApiKey(provider: string): void {
  deleteProviderConnectionsByProvider(provider);
}

export function migrateApiKeysToProviderConnections() {
  if (!sqlite) return;
  try {
    const apiKeysCount = sqlite.prepare("SELECT COUNT(*) as count FROM api_keys").get() as {
      count: number;
    };
    if (!apiKeysCount || apiKeysCount.count === 0) return;

    logger.info("db.migration", "Starting API keys migration to provider_connections...");

    const rows = sqlite.prepare("SELECT * FROM api_keys").all() as any[];
    const now = new Date().toISOString();

    for (const row of rows) {
      const existing = sqlite
        .prepare("SELECT id FROM provider_connections WHERE provider = ? AND auth_type = 'apikey'")
        .get([row.provider]);
      if (!existing) {
        let plainKey = "";
        try {
          plainKey = decryptApiKey(row.encrypted_key);
        } catch (e) {
          logger.error(
            e instanceof Error ? e : new Error(String(e)),
            "db.migration.decrypt_error",
            `Failed to decrypt key for ${row.provider}`,
          );
          continue;
        }

        const connData = { apiKey: plainKey };
        const encryptedData = encryptApiKey(JSON.stringify(connData));

        sqlite
          .prepare(`
          INSERT INTO provider_connections (id, provider, auth_type, name, priority, is_active, data, created_at, updated_at)
          VALUES (?, ?, 'apikey', ?, 1, 1, ?, ?, ?)
        `)
          .run([
            uuidv7(),
            row.provider,
            row.name || getProviderDisplayName(row.provider),
            encryptedData,
            now,
            now,
          ]);

        logger.info(
          "db.migration",
          `Successfully migrated key for provider ${row.provider} to provider_connections`,
        );
      }
    }
  } catch (error) {
    logger.error(
      error instanceof Error ? error : new Error(String(error)),
      "db.migration.error",
      "Failed to run API keys to provider_connections migration",
    );
  }
}

// getProviderDisplayName is now imported from seed-data.ts

// Export the schema for use in queries
export { schema };

// Re-export seed data for external use
export {
  PROVIDERS,
  DEFAULT_MODES,
  DEFAULT_AGENTS,
  getProviderDisplayName,
  type DefaultMode,
  type DefaultAgent,
  type ProviderConfig,
} from "./seed-data";
