/**
 * @file services/mcp.service.ts
 * MCP (Model Context Protocol) service for managing MCP server connections
 *
 * This service manages MCP client connections and provides methods for
 * CRUD operations on MCP servers and tool invocations.
 */

import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import {
  StdioClientTransport,
  getDefaultEnvironment,
} from "@modelcontextprotocol/sdk/client/stdio.js";
import { SSEClientTransport } from "@modelcontextprotocol/sdk/client/sse.js";
import { StreamableHTTPClientTransport } from "@modelcontextprotocol/sdk/client/streamableHttp.js";
import type { Transport } from "@modelcontextprotocol/sdk/shared/transport.js";
import { jsonSchema, type ToolCallOptions, type Tool } from "ai";
import { z } from "zod";

import { logger as appLogger } from "../lib/pino";
import { getMcpConfigPath } from "./mcp-config.service";

// Create a child logger for MCP
const logger = appLogger.child("mcp");

// ============================================================================
// Local Type Definitions (to avoid rootDir issues)
// ============================================================================

const MCPRemoteConfigZodSchema = z.object({
  url: z.string().url().describe("The URL of the SSE endpoint"),
  headers: z.record(z.string(), z.string()).optional(),
});

const MCPStdioConfigZodSchema = z.object({
  command: z.string().min(1).describe("The command to run"),
  args: z.array(z.string()).optional(),
  env: z.record(z.string(), z.string()).optional(),
});

type MCPRemoteConfig = z.infer<typeof MCPRemoteConfigZodSchema>;
type MCPStdioConfig = z.infer<typeof MCPStdioConfigZodSchema>;
type MCPServerConfig = MCPRemoteConfig | MCPStdioConfig;

type MCPToolInfo = {
  name: string;
  description: string;
  inputSchema?: {
    type?: string | string[];
    properties?: Record<string, unknown>;
    required?: string[];
  };
};

type MCPServerInfo = {
  name: string;
  config: MCPServerConfig;
  error?: unknown;
  status: "connected" | "disconnected" | "loading" | "authorizing";
  toolInfo: MCPToolInfo[];
  allowedTools?: string[];
};

type MCPServerInfoWithId = MCPServerInfo & { id: string };

type McpServerInsert = {
  name: string;
  config: MCPServerConfig;
  id?: string;
  allowedTools?: string[];
};

type McpServerSelect = {
  name: string;
  config: MCPServerConfig;
  id: string;
  allowedTools?: string[];
};

type CallToolResult = {
  content: Array<{ type: string; text?: unknown; data?: string; mimeType?: string }>;
  isError?: boolean;
};

// ============================================================================
// Type Guards
// ============================================================================

export function isMaybeStdioConfig(config: MCPServerConfig): config is MCPStdioConfig {
  return "command" in config;
}

export function isMaybeRemoteConfig(config: MCPServerConfig): config is MCPRemoteConfig {
  return "url" in config;
}

// ============================================================================
// Utility Functions
// ============================================================================

function generateUUID(): string {
  return crypto.randomUUID();
}

function errorToString(error: unknown): string {
  if (error instanceof Error) return error.message;
  if (typeof error === "string") return error;
  return JSON.stringify(error);
}

function isNull(value: unknown): value is null | undefined {
  return value === null || value === undefined;
}

function createDebounce() {
  let timeoutId: NodeJS.Timeout | null = null;
  return (fn: () => void, delay: number) => {
    if (timeoutId) clearTimeout(timeoutId);
    timeoutId = setTimeout(fn, delay);
  };
}

async function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
  return Promise.race([
    promise,
    new Promise<T>((_, reject) => setTimeout(() => reject(new Error(`Timeout after ${ms}ms`)), ms)),
  ]);
}

function safeJSONParse(text: string): { success: true; value: unknown } | { success: false } {
  try {
    return { success: true, value: JSON.parse(text) };
  } catch {
    return { success: false };
  }
}

function normalizeToolList(tools?: string[]): string[] | undefined {
  if (!tools) return undefined;
  const normalized = Array.from(
    new Set(tools.filter((tool) => typeof tool === "string" && tool.trim().length > 0)),
  );
  return normalized.length ? normalized : [];
}

// ============================================================================
// Locker Utility
// ============================================================================

class Locker {
  private locked = false;
  private waiters: (() => void)[] = [];

  get isLocked(): boolean {
    return this.locked;
  }

  lock(): void {
    this.locked = true;
  }

  unlock(): void {
    this.locked = false;
    const waiters = this.waiters;
    this.waiters = [];
    waiters.forEach((resolve) => resolve());
  }

  wait(): Promise<void> {
    if (!this.locked) return Promise.resolve();
    return new Promise((resolve) => {
      this.waiters.push(resolve);
    });
  }
}

// ============================================================================
// MCP Tool ID Utilities
// ============================================================================

const MCP_TOOL_ID_SEPARATOR = "___";

export function createMCPToolId(serverName: string, toolName: string): string {
  return `mcp_${serverName}${MCP_TOOL_ID_SEPARATOR}${toolName}`;
}

export function parseMCPToolId(toolId: string): { serverName: string; toolName: string } | null {
  if (!toolId.startsWith("mcp_")) return null;
  const rest = toolId.slice(4);
  const separatorIndex = rest.indexOf(MCP_TOOL_ID_SEPARATOR);
  if (separatorIndex === -1) return null;
  return {
    serverName: rest.slice(0, separatorIndex),
    toolName: rest.slice(separatorIndex + MCP_TOOL_ID_SEPARATOR.length),
  };
}

// ============================================================================
// Constants
// ============================================================================

const CONNECT_TIMEOUT = 120000;
const MCP_MAX_TOTAL_TIMEOUT = process.env.MCP_MAX_TOTAL_TIMEOUT
  ? parseInt(process.env.MCP_MAX_TOTAL_TIMEOUT, 10)
  : undefined;

// ============================================================================
// MCP Client Class
// ============================================================================

class MCPClient {
  private client?: Client;
  private error?: unknown;
  protected isConnected = false;
  private locker = new Locker();
  private transport?: Transport;
  toolInfo: MCPToolInfo[] = [];
  private disconnectDebounce = createDebounce();
  private inProgressToolCallIds: string[] = [];

  constructor(
    _id: string,
    private name: string,
    private serverConfig: MCPServerConfig,
    private options: { autoDisconnectSeconds?: number } = {},
  ) {}

  get status(): "connected" | "disconnected" | "loading" | "authorizing" {
    if (this.locker.isLocked) return "loading";
    if (this.isConnected) return "connected";
    return "disconnected";
  }

  get hasActiveToolCalls(): boolean {
    return this.inProgressToolCallIds.length > 0;
  }

  getInfo(): MCPServerInfo {
    return {
      name: this.name,
      config: this.serverConfig,
      status: this.status,
      error: this.error,
      toolInfo: this.toolInfo,
    };
  }

  private scheduleAutoDisconnect(): void {
    if (!isNull(this.options.autoDisconnectSeconds)) {
      this.disconnectDebounce(() => {
        if (this.inProgressToolCallIds.length === 0) {
          this.disconnect();
        } else {
          logger.info(
            "mcp.auto-disconnect.skipped",
            `Skipping auto-disconnect: ${this.inProgressToolCallIds.length} tool calls in progress`,
          );
          this.scheduleAutoDisconnect();
        }
      }, this.options.autoDisconnectSeconds * 1000);
    }
  }

  async connect(): Promise<Client | undefined> {
    if (this.status === "loading") {
      await this.locker.wait();
      return this.client;
    }
    if (this.status === "connected") {
      return this.client;
    }

    try {
      const startedAt = Date.now();
      this.locker.lock();
      this.error = undefined;
      this.isConnected = false;
      this.client = undefined;

      const client = new Client({
        name: `assistx-${this.name}`,
        version: "1.0.0",
      });

      if (isMaybeStdioConfig(this.serverConfig)) {
        const config = MCPStdioConfigZodSchema.parse(this.serverConfig);
        const defaultEnv = getDefaultEnvironment();
        this.transport = new StdioClientTransport({
          command: config.command,
          args: config.args,
          env: Object.entries({ ...defaultEnv, ...config.env }).reduce(
            (acc, [key, value]) => {
              if (value !== undefined) {
                acc[key] = value;
              }
              return acc;
            },
            {} as Record<string, string>,
          ),
        });

        await withTimeout(
          client.connect(this.transport, {
            maxTotalTimeout: MCP_MAX_TOTAL_TIMEOUT,
          }),
          CONNECT_TIMEOUT,
        );
      } else if (isMaybeRemoteConfig(this.serverConfig)) {
        const config = MCPRemoteConfigZodSchema.parse(this.serverConfig);
        const abortController = new AbortController();
        const url = new URL(config.url);

        try {
          this.transport = new StreamableHTTPClientTransport(url, {
            requestInit: {
              headers: config.headers,
              signal: abortController.signal,
            },
          });
          await withTimeout(
            client.connect(this.transport, {
              maxTotalTimeout: MCP_MAX_TOTAL_TIMEOUT,
            }),
            CONNECT_TIMEOUT,
          );
        } catch (streamableHttpError: unknown) {
          const errMsg = streamableHttpError instanceof Error ? streamableHttpError.message : "";
          logger.warn(
            "mcp.connect.streamable-failed",
            `Streamable HTTP connection failed: ${errMsg}, falling back to SSE transport`,
          );

          this.transport = new SSEClientTransport(url, {
            requestInit: {
              headers: config.headers,
              signal: abortController.signal,
            },
          });

          await withTimeout(
            client.connect(this.transport, {
              maxTotalTimeout: MCP_MAX_TOTAL_TIMEOUT,
            }),
            CONNECT_TIMEOUT,
          );
        }
      } else {
        throw new Error("Unsupported server configuration format");
      }

      logger.info(
        "mcp.connect.success",
        `Connected to MCP server ${this.name} in ${((Date.now() - startedAt) / 1000).toFixed(2)}s`,
      );
      this.client = client;
      this.isConnected = true;
      this.scheduleAutoDisconnect();
    } catch (error) {
      logger.error("mcp.connect.failed", `Failed to connect to MCP server ${this.name}`, {
        error: errorToString(error),
      });
      this.isConnected = false;
      this.error = errorToString(error);
      this.transport = undefined;
      throw error;
    } finally {
      this.locker.unlock();
    }

    await this.updateToolInfo();
    return this.client;
  }

  async disconnect(): Promise<void> {
    logger.info("mcp.disconnect", `Disconnecting from MCP server ${this.name}`);
    await this.locker.wait();
    this.isConnected = false;
    const client = this.client;
    this.client = undefined;
    this.transport = undefined;
    try {
      await client?.close?.();
    } catch (e) {
      logger.error("mcp.disconnect.error", `Error closing MCP client ${this.name}`, {
        error: errorToString(e),
      });
    }
  }

  async updateToolInfo(): Promise<void> {
    if (this.status === "connected" && this.client) {
      logger.info("mcp.tools.update", `Updating tool info for ${this.name}`);
      const toolResponse = await this.client.listTools();
      this.toolInfo = toolResponse.tools.map((tool) => ({
        name: tool.name,
        description: tool.description ?? "",
        inputSchema: tool.inputSchema,
      }));
    }
  }

  async callTool(toolName: string, input?: unknown): Promise<CallToolResult> {
    const id = generateUUID();
    this.inProgressToolCallIds.push(id);

    const execute = async () => {
      const client = await this.connect();
      return client?.callTool({
        name: toolName,
        arguments: input as Record<string, unknown>,
      });
    };

    try {
      logger.info("mcp.tool.call", `Calling tool ${toolName} on ${this.name}`);
      this.scheduleAutoDisconnect();

      let result;
      try {
        result = await execute();
      } catch (err: unknown) {
        const errMsg = err instanceof Error ? err.message : "";
        if (errMsg.includes("Transport is closed")) {
          logger.info("mcp.tool.reconnect", "Transport is closed, reconnecting...");
          await this.disconnect();
          result = await execute();
        } else {
          throw err;
        }
      }

      if (isNull(result)) {
        throw new Error("Tool call returned unexpected null response");
      }

      this.scheduleAutoDisconnect();

      // Parse JSON in text content
      if (result?.content && Array.isArray(result.content)) {
        return {
          ...result,
          content: result.content.map((c: { type: string; text?: string }) => {
            if (c?.type === "text" && c?.text) {
              const parsed = safeJSONParse(c.text);
              return {
                type: "text" as const,
                text: parsed.success ? parsed.value : c.text,
              };
            }
            return c;
          }),
        } as CallToolResult;
      }

      return result as CallToolResult;
    } catch (err: unknown) {
      logger.error("mcp.tool.call.failed", `Tool call ${toolName} failed`, {
        error: errorToString(err),
      });
      return {
        isError: true,
        content: [
          {
            type: "text",
            text: errorToString(err),
          },
        ],
      };
    } finally {
      this.inProgressToolCallIds = this.inProgressToolCallIds.filter((toolId) => toolId !== id);
    }
  }
}

// ============================================================================
// MCP Config Storage Interface
// ============================================================================

interface MCPConfigStorage {
  init(manager: MCPClientsManager): Promise<void>;
  loadAll(): Promise<McpServerSelect[]>;
  save(server: McpServerInsert): Promise<McpServerSelect>;
  delete(id: string): Promise<void>;
  has(id: string): Promise<boolean>;
  get(id: string): Promise<McpServerSelect | null>;
}

// ============================================================================
// File-Based MCP Config Storage
// ============================================================================

import { mkdir, readFile, writeFile } from "fs/promises";
import { dirname } from "path";
import chokidar, { type FSWatcher } from "chokidar";

function createFileBasedMCPConfigStorage(configPath: string): MCPConfigStorage {
  let watcher: FSWatcher | null = null;
  let manager: MCPClientsManager;
  const debounce = createDebounce();

  async function readConfigFile(): Promise<McpServerSelect[]> {
    try {
      const configText = await readFile(configPath, { encoding: "utf-8" });
      const config = JSON.parse(configText ?? "{}") as Record<string, unknown>;
      return Object.entries(config).map(([name, value]) => {
        if (value && typeof value === "object" && "config" in value) {
          const entry = value as { config: MCPServerConfig; allowedTools?: unknown };
          return {
            id: name,
            name,
            config: entry.config,
            allowedTools: Array.isArray(entry.allowedTools)
              ? entry.allowedTools.filter((tool) => typeof tool === "string")
              : undefined,
          };
        }
        return {
          id: name,
          name,
          config: value as MCPServerConfig,
        };
      });
    } catch (err: unknown) {
      const error = err as { code?: string };
      if (error.code === "ENOENT") {
        return [];
      } else if (err instanceof SyntaxError) {
        throw new Error(`Config file ${configPath} has invalid JSON: ${err.message}`, {
          cause: err,
        });
      } else {
        throw err;
      }
    }
  }

  async function writeConfigFile(
    config: Record<string, { config: MCPServerConfig; allowedTools?: string[] }>,
  ): Promise<void> {
    const dir = dirname(configPath);
    await mkdir(dir, { recursive: true });
    await writeFile(configPath, JSON.stringify(config, null, 2), "utf-8");
  }

  function toRecord(
    servers: McpServerSelect[],
  ): Record<string, { config: MCPServerConfig; allowedTools?: string[] }> {
    return servers.reduce(
      (acc, server) => {
        acc[server.name] = {
          config: server.config,
          allowedTools: server.allowedTools,
        };
        return acc;
      },
      {} as Record<string, { config: MCPServerConfig; allowedTools?: string[] }>,
    );
  }

  async function checkAndRefreshClients(): Promise<void> {
    try {
      logger.debug("mcp.config.check", "Checking MCP clients diff");
      const fileConfigs = await readConfigFile();
      const managerClients = await manager.getClients();

      const fileConfigMap = new Map(fileConfigs.map((c) => [c.id, c]));
      const managerConfigMap = new Map(managerClients.map((c) => [c.id, c]));

      // Add/refresh clients from file
      for (const config of fileConfigs) {
        const existing = managerConfigMap.get(config.id);
        if (!existing) {
          logger.debug("mcp.config.add", `Adding MCP client ${config.id}`);
          await manager
            .addClient(config.id, config.name, config.config, config.allowedTools)
            .catch(() => {});
        } else {
          const existingConfig = existing.client.getInfo().config;
          if (JSON.stringify(existingConfig) !== JSON.stringify(config.config)) {
            logger.debug("mcp.config.refresh", `Refreshing MCP client ${config.id}`);
            await manager.refreshClient(config.id).catch(() => {});
          }
          if (
            JSON.stringify(existing.allowedTools ?? []) !==
            JSON.stringify(config.allowedTools ?? [])
          ) {
            manager.setClientAllowedTools(config.id, config.allowedTools);
          }
        }
      }

      // Remove clients not in file
      for (const client of managerClients) {
        if (!fileConfigMap.has(client.id)) {
          logger.debug("mcp.config.remove", `Removing MCP client ${client.id}`);
          await manager.disconnectClient(client.id);
        }
      }
    } catch (err) {
      logger.error("mcp.config.check.error", "Error checking and refreshing clients", {
        error: errorToString(err),
      });
    }
  }

  return {
    async init(_manager: MCPClientsManager): Promise<void> {
      manager = _manager;

      if (watcher) {
        await watcher.close();
        watcher = null;
      }

      try {
        await readConfigFile();
      } catch (err: unknown) {
        const error = err as { code?: string };
        if (error.code === "ENOENT") {
          await writeConfigFile({});
        } else {
          throw err;
        }
      }

      watcher = chokidar.watch(configPath, {
        persistent: true,
        awaitWriteFinish: true,
        ignoreInitial: true,
      });

      watcher.on("change", () => debounce(checkAndRefreshClients, 1000));
    },

    async loadAll(): Promise<McpServerSelect[]> {
      return readConfigFile();
    },

    async save(server: McpServerInsert): Promise<McpServerSelect> {
      const currentConfig = await readConfigFile();
      const record = toRecord(currentConfig);
      record[server.name] = {
        config: server.config,
        allowedTools: server.allowedTools,
      };
      await writeConfigFile(record);
      return {
        id: server.name,
        name: server.name,
        config: server.config,
        allowedTools: server.allowedTools,
      };
    },

    async delete(id: string): Promise<void> {
      const currentConfig = await readConfigFile();
      const newConfig = currentConfig.filter((s) => s.id !== id);
      await writeConfigFile(toRecord(newConfig));
    },

    async has(id: string): Promise<boolean> {
      const currentConfig = await readConfigFile();
      return currentConfig.some((s) => s.id === id);
    },

    async get(id: string): Promise<McpServerSelect | null> {
      const currentConfig = await readConfigFile();
      return currentConfig.find((s) => s.id === id) ?? null;
    },
  };
}

// ============================================================================
// MCP Clients Manager
// ============================================================================

export type VercelAIMcpTool = Tool & {
  _mcpServerName: string;
  _mcpServerId: string;
  _originToolName: string;
};

class MCPClientsManager {
  protected clients = new Map<
    string,
    { client: MCPClient; name: string; allowedTools?: string[] }
  >();
  private initializedLock = new Locker();
  private initialized = false;

  constructor(
    private storage: MCPConfigStorage,
    private autoDisconnectSeconds: number = 60 * 60,
  ) {
    process.on("SIGINT", this.cleanup.bind(this));
    process.on("SIGTERM", this.cleanup.bind(this));
  }

  private async waitInitialized(): Promise<void> {
    if (this.initialized) return;
    if (this.initializedLock.isLocked) {
      await this.initializedLock.wait();
      return;
    }
    await this.init();
  }

  async init(): Promise<void> {
    logger.info("mcp.manager.init", "Initializing MCP clients manager");
    if (this.initializedLock.isLocked) {
      logger.info("mcp.manager.init.waiting", "MCP clients manager already initializing, waiting");
      await this.initializedLock.wait();
      return;
    }
    if (this.initialized) {
      logger.info("mcp.manager.init.skip", "MCP clients manager already initialized");
      return;
    }

    try {
      this.initializedLock.lock();
      await this.storage.init(this);
      const configs = await this.storage.loadAll();
      await Promise.all(
        configs.map(({ id, name, config, allowedTools }) =>
          this.addClient(id, name, config, allowedTools).catch(() => {
            logger.warn("mcp.manager.add.failed", `Failed to add MCP client ${name}`);
          }),
        ),
      );
    } finally {
      this.initializedLock.unlock();
      this.initialized = true;
    }
  }

  async tools(): Promise<Record<string, VercelAIMcpTool>> {
    await this.waitInitialized();
    const result: Record<string, VercelAIMcpTool> = {};

    for (const [id, { client, name: clientName, allowedTools }] of this.clients) {
      if (!client?.toolInfo?.length) continue;

      for (const tool of client.toolInfo) {
        if (allowedTools && !allowedTools.includes(tool.name)) continue;
        const toolId = createMCPToolId(clientName, tool.name);
        const inputSchema = jsonSchema({
          type: "object",
          ...tool.inputSchema,
          properties: tool.inputSchema?.properties ?? {},
          additionalProperties: false,
        } as Parameters<typeof jsonSchema>[0]);

        result[toolId] = {
          description: tool.description,
          inputSchema,
          parameters: inputSchema,
          _originToolName: tool.name,
          _mcpServerName: clientName,
          _mcpServerId: id,
          execute: async (params: unknown, options?: ToolCallOptions) => {
            options?.abortSignal?.throwIfAborted();
            return this.toolCall(id, tool.name, params);
          },
        } as VercelAIMcpTool;
      }
    }

    return result;
  }

  async addClient(
    id: string,
    name: string,
    serverConfig: MCPServerConfig,
    allowedTools?: string[],
  ): Promise<MCPClient> {
    if (this.clients.has(id)) {
      const prevClient = this.clients.get(id)!;
      await prevClient.client.disconnect();
    }
    const client = new MCPClient(id, name, serverConfig, {
      autoDisconnectSeconds: this.autoDisconnectSeconds,
    });
    this.clients.set(id, { client, name, allowedTools });
    await client.connect();
    return client;
  }

  async persistClient(server: McpServerInsert): Promise<{ client: MCPClient; name: string }> {
    const entity = await this.storage.save(server);
    const id = entity.id;

    try {
      await this.addClient(id, server.name, server.config, server.allowedTools);
    } catch (err) {
      if (!server.id) {
        await this.removeClient(id);
      }
      throw err;
    }

    return this.clients.get(id)!;
  }

  async removeClient(id: string): Promise<void> {
    if (await this.storage.has(id)) {
      await this.storage.delete(id);
    }
    await this.disconnectClient(id);
  }

  async disconnectClient(id: string): Promise<void> {
    const client = this.clients.get(id);
    this.clients.delete(id);
    if (client) {
      await client.client.disconnect();
    }
  }

  async refreshClient(id: string): Promise<{ client: MCPClient; name: string }> {
    await this.waitInitialized();
    const server = await this.storage.get(id);
    if (!server) {
      throw new Error(`Client ${id} not found`);
    }
    logger.info("mcp.manager.refresh", `Refreshing client ${server.name}`);
    await this.addClient(id, server.name, server.config, server.allowedTools);
    return this.clients.get(id)!;
  }

  async updateAllowedTools(id: string, allowedTools: string[]): Promise<void> {
    await this.waitInitialized();
    const server = await this.storage.get(id);
    if (!server) {
      throw new Error(`Client ${id} not found`);
    }
    const normalizedTools = normalizeToolList(allowedTools);
    await this.storage.save({
      id: server.id,
      name: server.name,
      config: server.config,
      allowedTools: normalizedTools,
    });
    const entry = this.clients.get(id);
    if (entry) {
      entry.allowedTools = normalizedTools;
    }
  }

  setClientAllowedTools(id: string, allowedTools?: string[]): void {
    const entry = this.clients.get(id);
    if (entry) {
      entry.allowedTools = normalizeToolList(allowedTools);
    }
  }

  async cleanup(): Promise<void> {
    const clients = Array.from(this.clients.values());
    this.clients.clear();
    await Promise.allSettled(clients.map(({ client }) => client.disconnect()));
  }

  async getClients(): Promise<
    Array<{ id: string; client: MCPClient; name: string; allowedTools?: string[] }>
  > {
    await this.waitInitialized();
    return Array.from(this.clients.entries()).map(([id, entry]) => ({
      id,
      client: entry.client,
      name: entry.name,
      allowedTools: entry.allowedTools,
    }));
  }

  async getClient(
    id: string,
  ): Promise<{ client: MCPClient; name: string; allowedTools?: string[] } | undefined> {
    await this.waitInitialized();
    const client = this.clients.get(id);
    if (!client) {
      try {
        return await this.refreshClient(id);
      } catch {
        return undefined;
      }
    }
    return client;
  }

  async toolCallByServerName(
    serverName: string,
    toolName: string,
    input: unknown,
  ): Promise<CallToolResult> {
    const clients = await this.getClients();
    const client = clients.find((c) => c.client.getInfo().name === serverName);
    if (!client) {
      const servers = await this.storage.loadAll();
      const server = servers.find((s) => s.name === serverName);
      if (server) {
        return this.toolCall(server.id, toolName, input);
      }
      throw new Error(`MCP client with name '${serverName}' not found`);
    }
    return this.toolCall(client.id, toolName, input);
  }

  async toolCall(id: string, toolName: string, input: unknown): Promise<CallToolResult> {
    const clientEntry = await this.getClient(id);
    if (!clientEntry) {
      return {
        isError: true,
        content: [{ type: "text", text: `MCP client with ID '${id}' not found` }],
      };
    }
    if (clientEntry.allowedTools && !clientEntry.allowedTools.includes(toolName)) {
      return {
        isError: true,
        content: [
          {
            type: "text",
            text: `Tool '${toolName}' is disabled for MCP server '${clientEntry.client.getInfo().name}'`,
          },
        ],
      };
    }
    return clientEntry.client.callTool(toolName, input);
  }
}

// ============================================================================
// Singleton Instance & Service Functions
// ============================================================================

let mcpClientsManager: MCPClientsManager | null = null;

export async function initMCPService(): Promise<void> {
  if (mcpClientsManager) return;

  const configPath = getMcpConfigPath();
  logger.info("mcp.service.init", `Initializing MCP service with config path: ${configPath}`);

  const storage = createFileBasedMCPConfigStorage(configPath);
  mcpClientsManager = new MCPClientsManager(storage);
  await mcpClientsManager.init();
}

export function getMCPManager(): MCPClientsManager {
  if (!mcpClientsManager) {
    throw new Error("MCP service not initialized. Call initMCPService first.");
  }
  return mcpClientsManager;
}

// ============================================================================
// Service Actions (used by routes)
// ============================================================================

export async function selectMcpClientsAction(): Promise<MCPServerInfoWithId[]> {
  const manager = getMCPManager();
  const list = await manager.getClients();
  return list.map(({ client, id, allowedTools }) => ({
    ...client.getInfo(),
    id,
    allowedTools,
  }));
}

export async function selectMcpClientAction(id: string): Promise<MCPServerInfoWithId> {
  const manager = getMCPManager();
  const client = await manager.getClient(id);
  if (!client) {
    throw new Error("Client not found");
  }
  return {
    ...client.client.getInfo(),
    id,
    allowedTools: client.allowedTools,
  };
}

export async function saveMcpClientAction(server: McpServerInsert): Promise<MCPServerInfoWithId> {
  const nameSchema = z.string().regex(/^[a-zA-Z0-9-]+$/, {
    message: "Name must contain only alphanumeric characters (A-Z, a-z, 0-9) and hyphens (-)",
  });

  const result = nameSchema.safeParse(server.name);
  if (!result.success) {
    throw new Error(
      "Name must contain only alphanumeric characters (A-Z, a-z, 0-9) and hyphens (-)",
    );
  }

  const manager = getMCPManager();
  await manager.persistClient(server);
  const all = await manager.getClients();
  const match = all.find((c) => c.client.getInfo().name === server.name);
  if (!match) {
    throw new Error("Failed to persist MCP client");
  }
  return {
    ...match.client.getInfo(),
    id: match.id,
    allowedTools: match.allowedTools,
  };
}

export async function removeMcpClientAction(id: string): Promise<void> {
  const manager = getMCPManager();
  await manager.removeClient(id);
}

export async function setMcpAllowedToolsAction(id: string, allowedTools: string[]): Promise<void> {
  const manager = getMCPManager();
  await manager.updateAllowedTools(id, allowedTools);
}

export async function refreshMcpClientAction(id: string): Promise<void> {
  const manager = getMCPManager();
  await manager.refreshClient(id);
}

export async function toggleMcpClientConnectionAction(
  id: string,
  status: "connected" | "disconnected" | "loading" | "authorizing",
): Promise<void> {
  const manager = getMCPManager();
  const entry = await manager.getClient(id);
  if (!entry) {
    throw new Error(`Client ${id} not found`);
  }

  const client = entry.client;
  if (status === "connected" || status === "authorizing" || status === "loading") {
    await client.disconnect();
  } else {
    await client.connect();
  }
}

export async function callMcpToolAction(
  id: string,
  toolName: string,
  input: unknown,
): Promise<CallToolResult> {
  const manager = getMCPManager();
  return manager.toolCall(id, toolName, input);
}

export async function callMcpToolByServerNameAction(
  serverName: string,
  toolName: string,
  input: unknown,
): Promise<CallToolResult> {
  const manager = getMCPManager();
  return manager.toolCallByServerName(serverName, toolName, input);
}

export async function getMcpToolsAction(): Promise<Record<string, VercelAIMcpTool>> {
  const manager = getMCPManager();
  return manager.tools();
}
