/**
 * MCP Clients Manager.
 * Manages multiple MCP client connections with batched parallel startup,
 * reconnection tracking, and Vercel AI SDK tool integration.
 */

import type {
  MCPServerConfig,
  McpServerInsert,
  McpServerSelect,
} from "@/shared/mcp";
import { VercelAIMcpToolTag } from "../../../types/mcp";
import type { VercelAIMcpTool } from "../../../types/mcp";
import {
  createMCPClient,
  MCPClient,
  clearConnectionCache,
  clearToolInfoCache,
  clearAllConnectionCaches,
} from "./create-mcp-client";
import { errorToString, generateUUID, safeJSONParse } from "../../utils";
import { createMCPToolId } from "./mcp-tool-id";
import globalLogger from "../../logger";
import { jsonSchema } from "ai";
import { createMemoryMCPConfigStorage } from "./memory-mcp-config-storage";
import { colorize } from "consola/utils";

// ============================================================================
// Batched Parallel Startup Constants
// ============================================================================

/** Concurrency for stdio/local MCP servers (process spawning) */
const LOCAL_SERVER_CONCURRENCY = 3;
/** Concurrency for remote HTTP/SSE MCP servers */
const REMOTE_SERVER_CONCURRENCY = 20;

// ============================================================================
// Config Storage Interface
// ============================================================================

/**
 * Interface for storage of MCP server configurations.
 * Implementations should handle persistent storage of server configs.
 */
export interface MCPConfigStorage {
  init(manager: MCPClientsManager): Promise<void>;
  loadAll(): Promise<McpServerSelect[]>;
  save(server: McpServerInsert): Promise<McpServerSelect>;
  delete(id: string): Promise<void>;
  has(id: string): Promise<boolean>;
  get(id: string): Promise<McpServerSelect | null>;
}

// ============================================================================
// Concurrency Utility
// ============================================================================

/**
 * Process items in parallel with a concurrency limit.
 * Inspired by Claude Code's processBatched (backed by p-map).
 */
async function processBatched<T>(
  items: T[],
  concurrency: number,
  processor: (item: T) => Promise<void>,
): Promise<void> {
  const executing = new Set<Promise<void>>();

  for (const item of items) {
    const p = processor(item).then(
      () => { executing.delete(p); },
      () => { executing.delete(p); },
    );
    executing.add(p);

    if (executing.size >= concurrency) {
      await Promise.race(executing);
    }
  }

  await Promise.allSettled(executing);
}

/**
 * Type guard: does the config look like a local (stdio) server?
 */
function isLocalConfig(config: MCPServerConfig): boolean {
  return "command" in config;
}

// ============================================================================
// MCPClientsManager
// ============================================================================

export class MCPClientsManager {
  protected clients = new Map<
    string,
    { client: MCPClient; name: string }
  >();

  private initialized = false;
  private initPromise?: Promise<void>;

  private logger = globalLogger.withDefaults({
    message: colorize("dim", `[${generateUUID().slice(0, 4)}] MCP Manager: `),
  });

  constructor(
    private storage: MCPConfigStorage = createMemoryMCPConfigStorage(),
    private autoDisconnectSeconds: number = 60 * 60,
  ) {
    process.on("SIGINT", this.cleanup.bind(this));
    process.on("SIGTERM", this.cleanup.bind(this));
  }

  // --------------------------------------------------------------------------
  // Initialization
  // --------------------------------------------------------------------------

  private async waitInitialized(): Promise<void> {
    if (this.initialized) return;
    if (this.initPromise) {
      await this.initPromise;
      return;
    }
    await this.init();
  }

  async init(): Promise<void> {
    if (this.initialized) return;
    if (this.initPromise) { await this.initPromise; return; }

    this.logger.info("Initializing MCP clients manager");

    this.initPromise = (async () => {
      try {
        await this.storage.init(this);
        const configs = await this.storage.loadAll();

        // Partition into local and remote for batched startup
        const localServers = configs.filter((c) => isLocalConfig(c.config));
        const remoteServers = configs.filter((c) => !isLocalConfig(c.config));

        this.logger.info(
          `Starting ${localServers.length} local + ${remoteServers.length} remote MCP servers`,
        );

        const connectServer = async ({ id, name, config }: McpServerSelect) => {
          try {
            await this.addClient(id, name, config);
          } catch {
            this.logger.warn(`Failed to connect MCP server "${name}"`);
          }
        };

        // Connect both groups in parallel with different concurrency limits
        await Promise.all([
          processBatched(localServers, LOCAL_SERVER_CONCURRENCY, connectServer),
          processBatched(remoteServers, REMOTE_SERVER_CONCURRENCY, connectServer),
        ]);
      } finally {
        this.initialized = true;
      }
    })();

    await this.initPromise;
  }

  // --------------------------------------------------------------------------
  // Tool Registration (Vercel AI SDK)
  // --------------------------------------------------------------------------

  /**
   * Returns all tools from all connected clients as a flat object,
   * keyed by the fully qualified mcp__server__tool name.
   */
  async tools(): Promise<Record<string, VercelAIMcpTool>> {
    await this.waitInitialized();
    const result: Record<string, VercelAIMcpTool> = {};

    for (const [id, { client, name: clientName }] of this.clients) {
      if (!client?.toolInfo?.length) continue;

      for (const tool of client.toolInfo) {
        const toolId = createMCPToolId(clientName, tool.name);
        const inputSchemaObj = {
          ...tool.inputSchema,
          properties: tool.inputSchema?.properties ?? {},
          additionalProperties: false,
        };

        result[toolId] = VercelAIMcpToolTag.create({
          description: tool.description,
          inputSchema: jsonSchema(inputSchemaObj as Parameters<typeof jsonSchema>[0]),
          _originToolName: tool.name,
          _mcpServerName: clientName,
          _mcpServerId: id,
          execute: (params: unknown, options: { abortSignal?: AbortSignal }) => {
            options?.abortSignal?.throwIfAborted();
            return this.toolCall(id, tool.name, params);
          },
        });
      }
    }

    return result;
  }

  // --------------------------------------------------------------------------
  // Client Lifecycle
  // --------------------------------------------------------------------------

  /**
   * Creates and adds a new client instance to memory only (no storage persistence).
   */
  async addClient(id: string, name: string, serverConfig: MCPServerConfig): Promise<MCPClient> {
    if (this.clients.has(id)) {
      const prevClient = this.clients.get(id)!;
      await prevClient.client.disconnect().catch(() => {});
    }

    const client = createMCPClient(id, name, serverConfig, {
      autoDisconnectSeconds: this.autoDisconnectSeconds,
    });
    this.clients.set(id, { client, name });

    await client.connect();
    return client;
  }

  /**
   * Persists a new client configuration to storage and adds the client instance.
   */
  async persistClient(server: McpServerInsert): Promise<{ client: MCPClient; name: string }> {
    let id = server.name;
    if (this.storage) {
      const entity = await this.storage.save(server);
      id = entity.id;
    }

    try {
      await this.addClient(id, server.name, server.config);
    } catch (err) {
      if (!server.id) {
        await this.removeClient(id).catch(() => {});
      }
      throw err;
    }

    return this.clients.get(id)!;
  }

  /**
   * Removes a client by ID, disposing resources and removing from storage.
   */
  async removeClient(id: string): Promise<void> {
    if (this.storage && await this.storage.has(id)) {
      await this.storage.delete(id);
    }
    await this.disconnectClient(id);
  }

  /**
   * Disconnects a client without removing from storage.
   */
  async disconnectClient(id: string): Promise<void> {
    const entry = this.clients.get(id);
    this.clients.delete(id);
    if (entry) {
      await entry.client.disconnect().catch(() => {});
    }
  }

  /**
   * Full reconnect: disconnect, clear cache, and re-establish connection.
   */
  async reconnectClient(id: string): Promise<{ client: MCPClient; name: string }> {
    await this.waitInitialized();

    const server = await this.storage.get(id);
    if (!server) throw new Error(`Client ${id} not found`);

    this.logger.info(`Reconnecting client "${server.name}"`);

    // Clear the connection and tool info caches
    const existing = this.clients.get(id);
    if (existing) {
      clearConnectionCache(server.name, server.config);
      clearToolInfoCache(server.name);
      await existing.client.disconnect().catch(() => {});
    }

    await this.addClient(id, server.name, server.config);
    return this.clients.get(id)!;
  }

  /**
   * Refreshes an existing client (alias for reconnectClient for backward compat).
   */
  async refreshClient(id: string): Promise<{ client: MCPClient; name: string }> {
    return this.reconnectClient(id);
  }

  /**
   * Cleanup all connections.
   */
  async cleanup(): Promise<void> {
    const clients = Array.from(this.clients.values());
    this.clients.clear();
    clearAllConnectionCaches();
    await Promise.allSettled(clients.map(({ client }) => client.disconnect()));
  }

  // --------------------------------------------------------------------------
  // Query
  // --------------------------------------------------------------------------

  async getClients(): Promise<Array<{ id: string; client: MCPClient }>> {
    await this.waitInitialized();
    return Array.from(this.clients.entries()).map(([id, { client }]) => ({
      id,
      client,
    }));
  }

  async getClient(id: string): Promise<{ client: MCPClient; name: string } | undefined> {
    await this.waitInitialized();
    const entry = this.clients.get(id);
    if (!entry) {
      // Attempt to load from storage and connect
      try {
        const result = await this.refreshClient(id);
        return result;
      } catch {
        return undefined;
      }
    }
    return entry;
  }

  // --------------------------------------------------------------------------
  // Tool Calls
  // --------------------------------------------------------------------------

  async toolCallByServerName(serverName: string, toolName: string, input: unknown): Promise<unknown> {
    const clients = await this.getClients();
    const client = clients.find((c) => c.client.getInfo().name === serverName);

    if (!client) {
      if (this.storage) {
        const servers = await this.storage.loadAll();
        const server = servers.find((s) => s.name === serverName);
        if (server) return this.toolCall(server.id, toolName, input);
      }
      throw new Error(`MCP client with name '${serverName}' not found`);
    }

    return this.toolCall(client.id, toolName, input);
  }

  async toolCall(id: string, toolName: string, input: unknown): Promise<unknown> {
    try {
      const entry = await this.getClient(id);
      if (!entry) throw new Error(`MCP client with ID '${id}' not found`);

      const result = await entry.client.callTool(toolName, input);

      // Parse JSON in text content
      if (result && typeof result === "object" && "content" in result) {
        const resultObj = result as { content?: unknown[]; isError?: boolean };
        if (Array.isArray(resultObj.content)) {
          return {
            ...resultObj,
            content: resultObj.content.map((c: unknown) => {
              const item = c as { type?: string; text?: string };
              if (item?.type === "text" && item?.text) {
                const parsed = safeJSONParse(item.text);
                return {
                  type: "text",
                  text: parsed.success ? parsed.value : item.text,
                };
              }
              return c;
            }),
          };
        }
      }

      return result;
    } catch (err: unknown) {
      return {
        isError: true,
        error: {
          message: errorToString(err),
          name: (err as Error)?.name || "ERROR",
        },
        content: [],
      };
    }
  }
}

// ============================================================================
// Factory
// ============================================================================

export function createMCPClientsManager(
  storage?: MCPConfigStorage,
  autoDisconnectSeconds: number = 60 * 60,
): MCPClientsManager {
  return new MCPClientsManager(storage, autoDisconnectSeconds);
}
