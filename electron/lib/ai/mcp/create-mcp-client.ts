/**
 * MCP Client with memoized connection pattern.
 * Inspired by Claude Code's connectToServer architecture.
 *
 * Key design:
 * - Connection is memoized by (name, configHash) — same config => same connection
 * - On transport close, cache is invalidated so next operation triggers fresh connect
 * - Tool calls go through ensureConnectedClient for lazy reconnection
 * - Graceful process termination: SIGINT → SIGTERM → SIGKILL escalation
 */

import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import {
  StdioClientTransport,
  getDefaultEnvironment,
} from "@modelcontextprotocol/sdk/client/stdio.js";
import { SSEClientTransport } from "@modelcontextprotocol/sdk/client/sse.js";
import { StreamableHTTPClientTransport } from "@modelcontextprotocol/sdk/client/streamableHttp.js";
import type { Transport } from "@modelcontextprotocol/sdk/shared/transport.js";
import { UnauthorizedError } from "@modelcontextprotocol/sdk/client/auth.js";
import { shell } from "electron";

import type {
  MCPServerConfig,
  MCPToolInfo,
  MCPServerInfo,
  MCPServerStatus,
  MCPServerCapabilities,
} from "@/shared/mcp";
import { MCPRemoteConfigZodSchema, MCPStdioConfigZodSchema } from "@/shared/mcp";
import { isMaybeRemoteConfig, isMaybeStdioConfig } from "./is-mcp-config";
import { expandConfigEnvVars } from "./env-expansion";
import { hashMcpConfig } from "./mcp-config-diff";
import { PgOAuthClientProvider } from "./pg-oauth-provider";
import { onMcpOAuthCallback } from "../../../protocol-handler";
import logger from "../../logger";
import type { ConsolaInstance } from "consola";
import { colorize } from "consola/utils";

// ============================================================================
// Constants
// ============================================================================

const CONNECTION_TIMEOUT_MS = parseInt(process.env.MCP_TIMEOUT || "", 10) || 30_000;
const MCP_MAX_TOTAL_TIMEOUT = process.env.MCP_MAX_TOTAL_TIMEOUT
  ? parseInt(process.env.MCP_MAX_TOTAL_TIMEOUT, 10)
  : undefined;
// Max consecutive transport errors before triggering reconnect
const MAX_CONSECUTIVE_ERRORS = 3;
const STDERR_MAX_BYTES = 64 * 1024 * 1024; // 64MB cap on stderr accumulation

// ============================================================================
// Error Detection Utilities
// ============================================================================

/**
 * Detects whether an error is an MCP "Session not found" error (HTTP 404 + JSON-RPC code -32001).
 * The SDK returns 404 when a session ID is no longer valid.
 */
function isMcpSessionExpiredError(error: Error): boolean {
  const httpStatus =
    "code" in error ? (error as Error & { code?: number }).code : undefined;
  if (httpStatus !== 404) return false;
  return (
    error.message.includes('"code":-32001') ||
    error.message.includes('"code": -32001')
  );
}

/** Check if an error message indicates a terminal connection failure */
function isTerminalConnectionError(msg: string): boolean {
  return (
    msg.includes("ECONNRESET") ||
    msg.includes("ETIMEDOUT") ||
    msg.includes("EPIPE") ||
    msg.includes("EHOSTUNREACH") ||
    msg.includes("ECONNREFUSED") ||
    msg.includes("Body Timeout Error") ||
    msg.includes("terminated") ||
    msg.includes("SSE stream disconnected") ||
    msg.includes("Failed to reconnect SSE stream")
  );
}

function isUnauthorized(error: unknown): boolean {
  if (error instanceof UnauthorizedError) return true;
  const err = error as { status?: number; message?: string };
  return (
    err?.status === 401 ||
    err?.message?.includes("401") === true ||
    err?.message?.includes("Unauthorized") === true ||
    err?.message?.includes("HTTP 401") === true
  );
}

function errorToString(error: unknown): string {
  if (error instanceof Error) return error.message;
  if (typeof error === "string") return error;
  return JSON.stringify(error);
}

// ============================================================================
// Connection Cache (Memoization)
// ============================================================================

type CachedConnection = {
  client: Client;
  transport: Transport;
  capabilities: MCPServerCapabilities;
  serverInfo?: { name: string; version: string };
  instructions?: string;
  cleanup: () => Promise<void>;
};

/** Global connection cache keyed by (name + configHash) */
const connectionCache = new Map<string, CachedConnection | Promise<CachedConnection>>();

/** Build cache key for a server connection */
function getCacheKey(name: string, config: MCPServerConfig): string {
  return `${name}::${hashMcpConfig(config)}`;
}

/** Clear a server's cached connection (triggers reconnect on next access) */
export function clearConnectionCache(name: string, config: MCPServerConfig): void {
  const key = getCacheKey(name, config);
  const entry = connectionCache.get(key);
  connectionCache.delete(key);

  // If already resolved, run cleanup
  if (entry && !(entry instanceof Promise)) {
    entry.cleanup().catch(() => {});
  }
}

/** Clear all cached connections */
export function clearAllConnectionCaches(): void {
  for (const [key, entry] of connectionCache) {
    if (entry && !(entry instanceof Promise)) {
      entry.cleanup().catch(() => {});
    }
    connectionCache.delete(key);
  }
}

// ============================================================================
// Tool Info Cache
// ============================================================================

const toolInfoCache = new Map<string, MCPToolInfo[]>();

/** Clear tool info cache for a server */
export function clearToolInfoCache(name: string): void {
  toolInfoCache.delete(name);
}

// ============================================================================
// MCPClient Class
// ============================================================================

type ClientOptions = {
  autoDisconnectSeconds?: number;
};

class OAuthAuthorizationRequiredError extends Error {
  constructor(public authorizationUrl: URL) {
    super("OAuth user authorization required");
    this.name = "OAuthAuthorizationRequiredError";
  }
}

/**
 * Client class for Model Context Protocol (MCP) server connections.
 * Uses a memoization-based connection pattern where connections are cached
 * by (name, configHash). On transport close, the cache entry is deleted
 * so the next operation triggers a fresh connect.
 */
export class MCPClient {
  private _log: ConsolaInstance;
  private error?: unknown;
  private authorizationUrl?: URL;
  private oauthProvider?: PgOAuthClientProvider;
  private needOauthProvider = false;
  private inProgressToolCallIds: string[] = [];
  private unsubscribeProtocol?: () => void;
  private _disconnectTimer?: ReturnType<typeof setTimeout>;
  private reconnectAttempt = 0;

  // Tool info is stored per-client and cached
  toolInfo: MCPToolInfo[] = [];

  constructor(
    private id: string,
    private name: string,
    private serverConfig: MCPServerConfig,
    private options: ClientOptions = {},
  ) {
    this._log = logger.withDefaults({
      message: colorize("cyan", `[${this.id.slice(0, 4)}] MCP Client ${this.name}: `),
    });
    this.ensureProtocolSubscription();
  }

  get status(): MCPServerStatus {
    const key = getCacheKey(this.name, this.serverConfig);
    const cached = connectionCache.get(key);

    if (this.authorizationUrl) return "needs-auth";
    if (cached instanceof Promise) return "pending";
    if (cached) return "connected";
    if (this.error) return "failed";
    return "disconnected";
  }

  get hasActiveToolCalls(): boolean {
    return this.inProgressToolCallIds.length > 0;
  }

  getAuthorizationUrl(): URL | undefined {
    return this.authorizationUrl;
  }

  getInfo(): MCPServerInfo {
    const key = getCacheKey(this.name, this.serverConfig);
    const cached = connectionCache.get(key);
    const conn = cached instanceof Promise ? undefined : cached;

    return {
      name: this.name,
      config: this.serverConfig,
      status: this.status,
      error: this.error ? errorToString(this.error) : undefined,
      toolInfo: this.toolInfo,
      capabilities: conn?.capabilities,
      serverVersion: conn?.serverInfo?.version,
      reconnectAttempt: this.reconnectAttempt > 0 ? this.reconnectAttempt : undefined,
    };
  }

  // --------------------------------------------------------------------------
  // Connection
  // --------------------------------------------------------------------------

  /**
   * Connect to the MCP server. Uses the connection cache — if a connection
   * already exists for this (name, config), returns it. Otherwise creates
   * a new one.
   */
  async connect(oauthState?: string): Promise<Client | undefined> {
    const key = getCacheKey(this.name, this.serverConfig);
    const existing = connectionCache.get(key);

    // Already connected — return the client
    if (existing && !(existing instanceof Promise)) {
      this.scheduleAutoDisconnect();
      return existing.client;
    }

    // Currently connecting — wait for it
    if (existing instanceof Promise) {
      try {
        const conn = await existing;
        this.scheduleAutoDisconnect();
        return conn.client;
      } catch {
        return undefined;
      }
    }

    // Create a new connection
    this.error = undefined;
    this.authorizationUrl = undefined;

    const connectPromise = this.doConnect(oauthState);
    connectionCache.set(key, connectPromise);

    try {
      const conn = await connectPromise;
      connectionCache.set(key, conn);
      this.reconnectAttempt = 0;
      this.scheduleAutoDisconnect();

      // Update tool info after connecting
      await this.updateToolInfo();

      return conn.client;
    } catch (err) {
      connectionCache.delete(key);
      this.error = err;
      throw err;
    }
  }

  private async doConnect(oauthState?: string): Promise<CachedConnection> {
    const startedAt = Date.now();
    this._log.info("Connecting to MCP server");

    // Expand environment variables in config
    const { expanded: expandedConfig, missingVars } = expandConfigEnvVars(this.serverConfig);
    if (missingVars.length > 0) {
      this._log.warn(`Missing environment variables: ${missingVars.join(", ")}`);
    }

    const client = new Client({
      name: `assistx-${this.name}`,
      version: "1.0.0",
    });

    let transport: Transport;
    let stderrOutput = "";
    let stderrHandler: ((data: Buffer) => void) | undefined;

    // Create appropriate transport based on server config type
    if (isMaybeStdioConfig(expandedConfig)) {
      const config = MCPStdioConfigZodSchema.parse(expandedConfig);
      const defaultEnv = getDefaultEnvironment();
      transport = new StdioClientTransport({
        command: config.command,
        args: config.args,
        env: Object.entries({ ...defaultEnv, ...config.env }).reduce(
          (acc, [key, value]) => {
            if (value !== undefined) acc[key] = value;
            return acc;
          },
          {} as Record<string, string>,
        ),
        cwd: process.cwd(),
        stderr: "pipe",
      });

      // Set up stderr capture before connecting (aids debugging failed connections)
      const stdioTransport = transport as StdioClientTransport;
      if (stdioTransport.stderr) {
        stderrHandler = (data: Buffer) => {
          if (stderrOutput.length < STDERR_MAX_BYTES) {
            try {
              stderrOutput += data.toString();
            } catch {
              // Ignore errors from exceeding max string length
            }
          }
        };
        stdioTransport.stderr.on("data", stderrHandler);
      }
    } else if (isMaybeRemoteConfig(expandedConfig)) {
      const config = MCPRemoteConfigZodSchema.parse(expandedConfig);
      const url = new URL(config.url);

      try {
        transport = new StreamableHTTPClientTransport(url, {
          requestInit: {
            headers: config.headers,
          },
          authProvider: this.createOAuthProvider(oauthState),
        });
      } catch {
        // Fallback to SSE
        transport = new SSEClientTransport(url, {
          requestInit: {
            headers: config.headers,
          },
          authProvider: this.createOAuthProvider(oauthState),
        });
      }
    } else {
      throw new Error("Unsupported server configuration format");
    }

    // Connect with timeout
    const connectPromise = client.connect(transport, {
      maxTotalTimeout: MCP_MAX_TOTAL_TIMEOUT,
    });
    const timeoutPromise = new Promise<never>((_, reject) => {
      const timeoutId = setTimeout(() => {
        transport.close().catch(() => {});
        reject(new Error(`MCP server "${this.name}" connection timed out after ${CONNECTION_TIMEOUT_MS}ms`));
      }, CONNECTION_TIMEOUT_MS);
      connectPromise.then(
        () => clearTimeout(timeoutId),
        () => clearTimeout(timeoutId),
      );
    });

    try {
      await Promise.race([connectPromise, timeoutPromise]);
    } catch (error) {
      if (stderrOutput) {
        this._log.error(`Server stderr: ${stderrOutput}`);
      }

      // Handle OAuth / auth errors for remote servers
      if (isMaybeRemoteConfig(expandedConfig) && error instanceof Error) {
        if (isUnauthorized(error) && !this.needOauthProvider) {
          this._log.info("OAuth authentication required, retrying with OAuth provider");
          this.needOauthProvider = true;
          return this.doConnect(oauthState);
        }
        if (error instanceof OAuthAuthorizationRequiredError) {
          this.authorizationUrl = error.authorizationUrl;
          // Don't throw — client is in "needs-auth" state
          return {
            client,
            transport,
            capabilities: {},
            cleanup: async () => {
              try { await client.close(); } catch {}
            },
          };
        }
      }

      transport.close().catch(() => {});
      throw error;
    }

    if (stderrOutput) {
      this._log.error(`Server stderr: ${stderrOutput}`);
      stderrOutput = "";
    }

    // Extract server info
    const capabilities: MCPServerCapabilities = {};
    const serverCaps = client.getServerCapabilities();
    if (serverCaps?.tools) capabilities.tools = true;
    if (serverCaps?.prompts) capabilities.prompts = true;
    if (serverCaps?.resources) capabilities.resources = true;

    const serverVersion = client.getServerVersion() ?? undefined;

    const elapsed = Date.now() - startedAt;
    this._log.info(`Connected in ${(elapsed / 1000).toFixed(2)}s, capabilities: ${JSON.stringify(capabilities)}`);

    // Set up error and close handlers for automatic reconnection
    const cacheKey = getCacheKey(this.name, this.serverConfig);
    let consecutiveErrors = 0;
    let hasTriggeredClose = false;

    const closeAndInvalidate = (reason: string) => {
      if (hasTriggeredClose) return;
      hasTriggeredClose = true;
      this._log.info(`Closing transport: ${reason}`);
      connectionCache.delete(cacheKey);
      toolInfoCache.delete(this.name);
      client.close().catch(() => {});
    };

    client.onerror = (error: Error) => {
      this._log.error(`Connection error: ${error.message}`);

      // Session expiry detection for HTTP transports
      if (isMaybeRemoteConfig(this.serverConfig) && isMcpSessionExpiredError(error)) {
        this._log.info("Session expired, triggering reconnection");
        closeAndInvalidate("session expired");
        return;
      }

      // Track consecutive terminal errors for remote transports
      if (isMaybeRemoteConfig(this.serverConfig)) {
        if (error.message.includes("Maximum reconnection attempts")) {
          closeAndInvalidate("SSE reconnection exhausted");
          return;
        }
        if (isTerminalConnectionError(error.message)) {
          consecutiveErrors++;
          if (consecutiveErrors >= MAX_CONSECUTIVE_ERRORS) {
            consecutiveErrors = 0;
            closeAndInvalidate("max consecutive terminal errors");
          }
        } else {
          consecutiveErrors = 0;
        }
      }
    };

    client.onclose = () => {
      this._log.info("Transport closed, invalidating cache for reconnection");
      connectionCache.delete(cacheKey);
      toolInfoCache.delete(this.name);
    };

    // Build cleanup function with graceful process termination
    const cleanup = async () => {
      // Remove stderr listener
      if (stderrHandler && isMaybeStdioConfig(this.serverConfig)) {
        const stdioTransport = transport as StdioClientTransport;
        stdioTransport.stderr?.off("data", stderrHandler);
      }

      // Graceful process termination for stdio servers (SIGINT → SIGTERM → SIGKILL)
      if (isMaybeStdioConfig(this.serverConfig)) {
        const stdioTransport = transport as StdioClientTransport;
        const childPid = stdioTransport.pid;
        if (childPid) {
          await this.gracefulKillProcess(childPid);
        }
      }

      try {
        await client.close();
      } catch {
        // Ignore close errors
      }
    };

    return {
      client,
      transport,
      capabilities,
      serverInfo: serverVersion ? { name: serverVersion.name, version: serverVersion.version } : undefined,
      instructions: client.getInstructions(),
      cleanup,
    };
  }

  // --------------------------------------------------------------------------
  // Graceful Process Termination
  // --------------------------------------------------------------------------

  private async gracefulKillProcess(pid: number): Promise<void> {
    const isAlive = () => {
      try { process.kill(pid, 0); return true; } catch { return false; }
    };
    const sleep = (ms: number) => new Promise<void>(r => setTimeout(r, ms));

    // 1. SIGINT (100ms grace)
    try { process.kill(pid, "SIGINT"); } catch { return; }
    await sleep(100);
    if (!isAlive()) { this._log.info("Process exited after SIGINT"); return; }

    // 2. SIGTERM (400ms grace)
    this._log.info("SIGINT failed, sending SIGTERM");
    try { process.kill(pid, "SIGTERM"); } catch { return; }
    await sleep(400);
    if (!isAlive()) { this._log.info("Process exited after SIGTERM"); return; }

    // 3. SIGKILL (force)
    this._log.info("SIGTERM failed, sending SIGKILL");
    try { process.kill(pid, "SIGKILL"); } catch { /* already dead */ }
  }

  // --------------------------------------------------------------------------
  // OAuth
  // --------------------------------------------------------------------------

  private createOAuthProvider(oauthState?: string): PgOAuthClientProvider | undefined {
    if (!isMaybeRemoteConfig(this.serverConfig) || !this.needOauthProvider) {
      return undefined;
    }

    this._log.info("Creating OAuth provider");
    if (this.oauthProvider) {
      if (oauthState && oauthState !== this.oauthProvider.state()) {
        this.oauthProvider.adoptState(oauthState);
      }
      return this.oauthProvider;
    }

    this.oauthProvider = new PgOAuthClientProvider({
      name: this.name,
      mcpServerId: this.id,
      serverUrl: this.serverConfig.url,
      state: oauthState,
      _clientMetadata: {
        client_name: `assistx-${this.name}`,
        grant_types: ["authorization_code", "refresh_token"],
        response_types: ["code"],
        token_endpoint_auth_method: "none",
        scope: "mcp:tools",
        redirect_uris: [`${process.env.ASSISTX_PROTOCOL || "assistx"}://mcp/oauth/callback`],
        software_id: "assistx",
        software_version: "1.0.0",
      },
      onRedirectToAuthorization: async (authorizationUrl: URL) => {
        this._log.info("OAuth authorization required");
        this.authorizationUrl = authorizationUrl;
        try {
          await shell.openExternal(authorizationUrl.toString());
        } catch (e) {
          this._log.warn("Failed to open browser for OAuth", e);
        }
        throw new OAuthAuthorizationRequiredError(authorizationUrl);
      },
    });

    return this.oauthProvider;
  }

  async finishAuth(code: string, state: string): Promise<void> {
    if (!isMaybeRemoteConfig(this.serverConfig)) {
      throw new Error("OAuth is only supported for remote MCP servers");
    }

    if (this.oauthProvider && this.oauthProvider.state() !== state) {
      await this.oauthProvider.adoptState(state);
    }

    const key = getCacheKey(this.name, this.serverConfig);
    const cached = connectionCache.get(key);
    const conn = cached instanceof Promise ? undefined : cached;
    const finish = (conn?.transport as StreamableHTTPClientTransport)?.finishAuth;

    if (!finish) throw new Error("finishAuth not available");

    this._log.info("Exchanging OAuth code for token");
    await finish.call(conn?.transport, code);
    this.authorizationUrl = undefined;
    this._log.info("OAuth token exchange completed");
  }

  async ensureOAuthState(state: string): Promise<void> {
    if (!state) return;
    await this.oauthProvider?.adoptState(state);
  }

  // --------------------------------------------------------------------------
  // Disconnect
  // --------------------------------------------------------------------------

  async disconnect(): Promise<void> {
    this._log.info("Disconnecting");
    if (this._disconnectTimer) {
      clearTimeout(this._disconnectTimer);
      this._disconnectTimer = undefined;
    }
    if (this.unsubscribeProtocol) {
      this.unsubscribeProtocol();
      this.unsubscribeProtocol = undefined;
    }

    const key = getCacheKey(this.name, this.serverConfig);
    const cached = connectionCache.get(key);
    connectionCache.delete(key);
    toolInfoCache.delete(this.name);

    if (cached && !(cached instanceof Promise)) {
      await cached.cleanup();
    }
  }

  // --------------------------------------------------------------------------
  // Tool Info
  // --------------------------------------------------------------------------

  async updateToolInfo(): Promise<void> {
    const key = getCacheKey(this.name, this.serverConfig);
    const cached = connectionCache.get(key);
    if (!cached || cached instanceof Promise) return;

    // Check cache first
    const cachedInfo = toolInfoCache.get(this.name);
    if (cachedInfo) {
      this.toolInfo = cachedInfo;
      return;
    }

    try {
      const toolResponse = await cached.client.listTools();
      this.toolInfo = toolResponse.tools.map((tool) => ({
        name: tool.name,
        description: tool.description ?? "",
        inputSchema: tool.inputSchema,
      }));
      toolInfoCache.set(this.name, this.toolInfo);
    } catch (err) {
      this._log.error("Failed to fetch tools", err);
    }
  }

  // --------------------------------------------------------------------------
  // Tool Calls
  // --------------------------------------------------------------------------

  async callTool(toolName: string, input?: unknown): Promise<unknown> {
    const id = crypto.randomUUID();
    this.inProgressToolCallIds.push(id);

    try {
      const client = await this.ensureConnected();
      if (this.status === "needs-auth") {
        throw new Error("OAuth authorization required. Refresh the MCP client to initiate authorization.");
      }

      this.scheduleAutoDisconnect();
      const result = await client.callTool({
        name: toolName,
        arguments: input as Record<string, unknown>,
      });

      if (!result) {
        throw new Error("Tool call returned unexpected null response");
      }

      this.scheduleAutoDisconnect();
      return result;
    } catch (err: unknown) {
      const errMsg = err instanceof Error ? err.message : "";

      // Auto-reconnect on transport closed
      if (errMsg.includes("Transport is closed")) {
        this._log.info("Transport closed, reconnecting");
        clearConnectionCache(this.name, this.serverConfig);
        const client = await this.ensureConnected();
        return client.callTool({
          name: toolName,
          arguments: input as Record<string, unknown>,
        });
      }

      this._log.error("Tool call failed", toolName, err);
      return {
        isError: true,
        error: { message: errorToString(err), name: (err as Error)?.name || "ERROR" },
        content: [],
      };
    } finally {
      this.inProgressToolCallIds = this.inProgressToolCallIds.filter((tid) => tid !== id);
    }
  }

  /**
   * Ensure we have a valid connected client.
   * If the connection cache is empty (invalidated by onclose), reconnects.
   */
  private async ensureConnected(): Promise<Client> {
    const client = await this.connect();
    if (!client) throw new Error(`MCP server "${this.name}" is not connected`);
    return client;
  }

  // --------------------------------------------------------------------------
  // Auto-disconnect
  // --------------------------------------------------------------------------

  private scheduleAutoDisconnect(): void {
    if (!this.options.autoDisconnectSeconds) return;

    if (this._disconnectTimer) clearTimeout(this._disconnectTimer);
    this._disconnectTimer = setTimeout(() => {
      if (this.inProgressToolCallIds.length === 0) {
        this.disconnect();
      } else {
        this._log.info(`Skipping auto-disconnect: ${this.inProgressToolCallIds.length} calls in progress`);
        this.scheduleAutoDisconnect();
      }
    }, this.options.autoDisconnectSeconds * 1000);
  }

  // --------------------------------------------------------------------------
  // Protocol subscription (OAuth callbacks)
  // --------------------------------------------------------------------------

  private ensureProtocolSubscription(): void {
    if (this.unsubscribeProtocol) return;
    this.unsubscribeProtocol = onMcpOAuthCallback(async ({ code, state }: { code: string; state: string }) => {
      try {
        await this.ensureOAuthState(state);
        if (this.status !== "needs-auth") return;
        await this.finishAuth(code, state);
        await this.connect(state);
      } catch (e) {
        this._log.error("OAuth callback failed", e);
      }
    });
  }
}

// ============================================================================
// Factory
// ============================================================================

export const createMCPClient = (
  id: string,
  name: string,
  serverConfig: MCPServerConfig,
  options: ClientOptions = {},
): MCPClient => new MCPClient(id, name, serverConfig, options);
