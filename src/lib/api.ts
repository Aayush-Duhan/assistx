/**
 * @file api.ts
 * HTTP client for server API communication with dynamic port and bearer token auth
 */

import type {
  WorkflowSummary,
  CreateWorkflowRequest,
  WorkflowWithStructure,
  DBNode,
  DBEdge,
} from "@/shared/workflow.types";

let cachedServerConfig: { baseUrl: string; wsUrl: string; token: string } | null = null;

export async function getServerConfig(): Promise<{ baseUrl: string; wsUrl: string; token: string }> {
  if (cachedServerConfig) {
    return cachedServerConfig;
  }
  if (typeof window !== "undefined" && window.electron?.getServerConfig) {
    try {
      const config = await window.electron.getServerConfig();
      if (config) {
        cachedServerConfig = {
          baseUrl: config.baseUrl,
          wsUrl: config.wsUrl,
          token: config.token,
        };
        return cachedServerConfig;
      }
    } catch (err) {
      console.warn("Failed to get server config from electron:", err);
    }
  }
  const defaultPort = import.meta.env?.VITE_SERVER_PORT || "3000";
  const defaultToken = import.meta.env?.VITE_SERVER_TOKEN || "";
  const fallbackConfig = {
    baseUrl: `http://127.0.0.1:${defaultPort}/api`,
    wsUrl: `ws://127.0.0.1:${defaultPort}/api`,
    token: defaultToken,
  };
  if (typeof window === "undefined" || !window.electron?.getServerConfig) {
    cachedServerConfig = fallbackConfig;
  }
  return fallbackConfig;
}

export async function apiFetch(path: string, options: RequestInit = {}): Promise<Response> {
  const config = await getServerConfig();
  const url = path.startsWith("http")
    ? path
    : `${config.baseUrl}${path.startsWith("/") ? "" : "/"}${path}`;

  const headers = new Headers(options.headers || {});
  if (config.token && !headers.has("Authorization")) {
    headers.set("Authorization", `Bearer ${config.token}`);
  }
  return fetch(url, { ...options, headers });
}

// ============================================================================
// Modes API
// ============================================================================

export interface Mode {
  id: string;
  name: string;
  description: string | null;
  systemPrompt: string;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateModeData {
  name: string;
  description?: string;
  systemPrompt: string;
}

export interface UpdateModeData {
  name?: string;
  description?: string;
  systemPrompt?: string;
  isActive?: boolean;
}

export const modesApi = {
  async list(): Promise<Mode[]> {
    const response = await apiFetch("/modes");
    if (!response.ok) throw new Error("Failed to fetch modes");
    return response.json();
  },

  async create(data: CreateModeData): Promise<{ id: string }> {
    const response = await apiFetch("/modes", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
    if (!response.ok) throw new Error("Failed to create mode");
    return response.json();
  },

  async update(id: string, data: UpdateModeData): Promise<void> {
    const response = await apiFetch(`/modes/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
    if (!response.ok) throw new Error("Failed to update mode");
  },

  async delete(id: string): Promise<void> {
    const response = await apiFetch(`/modes/${id}`, {
      method: "DELETE",
    });
    if (!response.ok) throw new Error("Failed to delete mode");
  },

  async activate(id: string): Promise<void> {
    const response = await apiFetch(`/modes/${id}/activate`, {
      method: "POST",
    });
    if (!response.ok) throw new Error("Failed to activate mode");
  },

  async deactivate(): Promise<void> {
    const response = await apiFetch("/modes/deactivate", {
      method: "POST",
    });
    if (!response.ok) throw new Error("Failed to deactivate modes");
  },
};

// ============================================================================
// Agents API
// ============================================================================

export interface Agent {
  id: string;
  name: string;
  description: string | null;
  role: string | null;
  systemPrompt: string;
  modelId: string | null;
  iconUrl: string | null;
  iconBgColor: string | null;
  toolConfig: unknown;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateAgentData {
  name: string;
  description?: string;
  role?: string;
  systemPrompt: string;
  iconUrl?: string;
  iconBgColor?: string;
}

export interface UpdateAgentData {
  name?: string;
  description?: string;
  role?: string;
  systemPrompt?: string;
  iconUrl?: string;
  iconBgColor?: string;
}

export const agentsApi = {
  async list(): Promise<Agent[]> {
    const response = await apiFetch("/agents");
    if (!response.ok) throw new Error("Failed to fetch agents");
    return response.json();
  },

  async create(data: CreateAgentData): Promise<{ id: string }> {
    const response = await apiFetch("/agents", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
    if (!response.ok) throw new Error("Failed to create agent");
    return response.json();
  },

  async update(id: string, data: UpdateAgentData): Promise<void> {
    const response = await apiFetch(`/agents/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
    if (!response.ok) throw new Error("Failed to update agent");
  },

  async delete(id: string): Promise<void> {
    const response = await apiFetch(`/agents/${id}`, {
      method: "DELETE",
    });
    if (!response.ok) throw new Error("Failed to delete agent");
  },
};

// ============================================================================
// MCP API (Model Context Protocol)
// ============================================================================

export interface MCPToolInfo {
  name: string;
  description: string;
  inputSchema?: {
    type?: string | string[];
    properties?: Record<string, unknown>;
    required?: string[];
  };
}

export type MCPServerStatus = "connected" | "disconnected" | "loading" | "authorizing";

export interface MCPServerInfo {
  id: string;
  name: string;
  config: MCPServerConfig;
  status: MCPServerStatus;
  error?: unknown;
  toolInfo: MCPToolInfo[];
  allowedTools?: string[];
}

export type MCPServerConfig =
  | { url: string; headers?: Record<string, string> }
  | { command: string; args?: string[]; env?: Record<string, string> };

export interface CreateMCPServerData {
  name: string;
  config: MCPServerConfig;
}

export interface MCPToolCallResult {
  content: Array<{ type: string; text?: string; data?: string; mimeType?: string }>;
  isError?: boolean;
}

export interface MCPTool {
  id: string;
  description?: string;
  parameters?: unknown;
  _mcpServerName: string;
  _mcpServerId: string;
  _originToolName: string;
}

export const mcpApi = {
  /**
   * List all MCP servers with their connection status
   */
  async list(): Promise<MCPServerInfo[]> {
    const response = await apiFetch("/mcp");
    if (!response.ok) throw new Error("Failed to fetch MCP servers");
    return response.json();
  },

  /**
   * Get a specific MCP server by ID
   */
  async get(id: string): Promise<MCPServerInfo> {
    const response = await apiFetch(`/mcp/${encodeURIComponent(id)}`);
    if (!response.ok) throw new Error("Failed to fetch MCP server");
    return response.json();
  },

  /**
   * Create a new MCP server
   */
  async create(data: CreateMCPServerData): Promise<MCPServerInfo> {
    const response = await apiFetch("/mcp", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
    if (!response.ok) {
      const error = await response.json().catch(() => ({}));
      throw new Error(error.error || "Failed to create MCP server");
    }
    return response.json();
  },

  /**
   * Delete an MCP server
   */
  async delete(id: string): Promise<void> {
    const response = await apiFetch(`/mcp/${encodeURIComponent(id)}`, {
      method: "DELETE",
    });
    if (!response.ok) throw new Error("Failed to delete MCP server");
  },

  /**
   * Refresh/reconnect an MCP server
   */
  async refresh(id: string): Promise<void> {
    const response = await apiFetch(`/mcp/${encodeURIComponent(id)}/refresh`, {
      method: "POST",
    });
    if (!response.ok) throw new Error("Failed to refresh MCP server");
  },

  /**
   * Toggle MCP server connection (connect/disconnect)
   */
  async toggle(id: string, status: MCPServerStatus): Promise<void> {
    const response = await apiFetch(`/mcp/${encodeURIComponent(id)}/toggle`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status }),
    });
    if (!response.ok) throw new Error("Failed to toggle MCP server");
  },

  /**
   * Update allowed tools for an MCP server
   */
  async setAllowedTools(id: string, allowedTools: string[]): Promise<void> {
    const response = await apiFetch(`/mcp/${encodeURIComponent(id)}/allowed-tools`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ allowedTools }),
    });
    if (!response.ok) throw new Error("Failed to update allowed tools");
  },

  /**
   * Call a tool on an MCP server
   */
  async callTool(id: string, toolName: string, input?: unknown): Promise<MCPToolCallResult> {
    const response = await apiFetch(`/mcp/${encodeURIComponent(id)}/tool`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ toolName, input }),
    });
    if (!response.ok) throw new Error("Failed to call MCP tool");
    return response.json();
  },

  /**
   * Get all available tools from all connected MCP servers
   */
  async listTools(): Promise<MCPTool[]> {
    const response = await apiFetch("/mcp/tools");
    if (!response.ok) throw new Error("Failed to fetch MCP tools");
    return response.json();
  },

  /**
   * Get the MCP configuration file path
   */
  async getConfigPath(): Promise<string> {
    const response = await apiFetch("/mcp/config-path");
    if (!response.ok) throw new Error("Failed to get MCP config path");
    const data = await response.json();
    return data.path;
  },
};

// ============================================================================
// Workflows API
// ============================================================================

export const workflowsApi = {
  list: async (): Promise<WorkflowSummary[]> => {
    const res = await apiFetch("/workflows");
    if (!res.ok) throw new Error("Failed to fetch workflows");
    return res.json();
  },
  get: async (id: string): Promise<WorkflowWithStructure> => {
    const res = await apiFetch(`/workflows/${id}`);
    if (!res.ok) throw new Error("Failed to fetch workflow");
    return res.json();
  },
  create: async (data: CreateWorkflowRequest): Promise<{ id: string }> => {
    const res = await apiFetch("/workflows", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
    if (!res.ok) throw new Error("Failed to create workflow");
    return res.json();
  },
  delete: async (id: string): Promise<void> => {
    const res = await apiFetch(`/workflows/${id}`, {
      method: "DELETE",
    });
    if (!res.ok) throw new Error("Failed to delete workflow");
  },
  togglePublish: async (id: string, isPublished: boolean): Promise<void> => {
    const res = await apiFetch(`/workflows/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ isPublished }),
    });
    if (!res.ok) throw new Error("Failed to update workflow");
  },
  execute: async (id: string): Promise<unknown> => {
    const res = await apiFetch(`/workflows/${id}/execute`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({}),
    });
    if (!res.ok) throw new Error("Failed to execute workflow");
    return res.json();
  },
  saveStructure: async (
    id: string,
    payloadOrNodes:
      | {
          nodes: DBNode[];
          edges: DBEdge[];
          deleteNodes?: string[];
          deleteEdges?: string[];
        }
      | DBNode[],
    edges?: DBEdge[],
  ): Promise<void> => {
    const payload = Array.isArray(payloadOrNodes)
      ? { nodes: payloadOrNodes, edges: edges || [] }
      : payloadOrNodes;
    const res = await apiFetch(`/workflows/${id}/structure`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    if (!res.ok) throw new Error("Failed to save workflow structure");
  },
};
