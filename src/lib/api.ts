/**
 * @file api.ts
 * HTTP client for server API communication
 */

const API_BASE_URL = "http://localhost:3000/api";

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
    const response = await fetch(`${API_BASE_URL}/modes`);
    if (!response.ok) throw new Error("Failed to fetch modes");
    return response.json();
  },

  async create(data: CreateModeData): Promise<{ id: string }> {
    const response = await fetch(`${API_BASE_URL}/modes`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
    if (!response.ok) throw new Error("Failed to create mode");
    return response.json();
  },

  async update(id: string, data: UpdateModeData): Promise<void> {
    const response = await fetch(`${API_BASE_URL}/modes/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
    if (!response.ok) throw new Error("Failed to update mode");
  },

  async delete(id: string): Promise<void> {
    const response = await fetch(`${API_BASE_URL}/modes/${id}`, {
      method: "DELETE",
    });
    if (!response.ok) throw new Error("Failed to delete mode");
  },

  async activate(id: string): Promise<void> {
    const response = await fetch(`${API_BASE_URL}/modes/${id}/activate`, {
      method: "POST",
    });
    if (!response.ok) throw new Error("Failed to activate mode");
  },

  async deactivate(): Promise<void> {
    const response = await fetch(`${API_BASE_URL}/modes/deactivate`, {
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
    const response = await fetch(`${API_BASE_URL}/agents`);
    if (!response.ok) throw new Error("Failed to fetch agents");
    return response.json();
  },

  async create(data: CreateAgentData): Promise<{ id: string }> {
    const response = await fetch(`${API_BASE_URL}/agents`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
    if (!response.ok) throw new Error("Failed to create agent");
    return response.json();
  },

  async update(id: string, data: UpdateAgentData): Promise<void> {
    const response = await fetch(`${API_BASE_URL}/agents/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
    if (!response.ok) throw new Error("Failed to update agent");
  },

  async delete(id: string): Promise<void> {
    const response = await fetch(`${API_BASE_URL}/agents/${id}`, {
      method: "DELETE",
    });
    if (!response.ok) throw new Error("Failed to delete agent");
  },
};

// ============================================================================
// API Keys API
// ============================================================================

export interface ApiKeyInfo {
  provider: string;
  name: string;
  isConfigured: boolean;
  isValid: boolean;
  updatedAt: Date;
}

export const apiKeysApi = {
  async list(): Promise<ApiKeyInfo[]> {
    const response = await fetch(`${API_BASE_URL}/api-keys`);
    if (!response.ok) throw new Error("Failed to fetch API keys");
    return response.json();
  },

  async checkProvider(provider: string): Promise<{ provider: string; isConfigured: boolean }> {
    const response = await fetch(`${API_BASE_URL}/api-keys/${provider}/status`);
    if (!response.ok) throw new Error("Failed to check API key status");
    return response.json();
  },

  async save(provider: string, key: string): Promise<void> {
    const response = await fetch(`${API_BASE_URL}/api-keys`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ provider, key }),
    });
    if (!response.ok) throw new Error("Failed to save API key");
  },

  async delete(provider: string): Promise<void> {
    const response = await fetch(`${API_BASE_URL}/api-keys/${provider}`, {
      method: "DELETE",
    });
    if (!response.ok) throw new Error("Failed to delete API key");
  },

  async copyKey(provider: string): Promise<string> {
    const response = await fetch(`${API_BASE_URL}/api-keys/${provider}/copy`);
    if (!response.ok) throw new Error("Failed to retrieve API key");
    const data = await response.json();
    return data.key;
  },
};

// ============================================================================
// Models API
// ============================================================================

export interface ProviderModels {
  providerId: string;
  displayName: string;
  hasApiKey: boolean;
  builtInModels: AIModel[];
  customModels: AIModel[];
}

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

// Alias for backwards compatibility
export type CustomModel = AIModel;

export interface CreateModelData {
  providerId: string;
  modelId: string;
  displayName: string;
  contextWindow?: number;
  maxOutputTokens?: number;
  supportsVision?: boolean;
  supportsTools?: boolean;
}

export interface UpdateModelData {
  providerId?: string;
  modelId?: string;
  displayName?: string;
  contextWindow?: number;
  maxOutputTokens?: number;
  supportsVision?: boolean;
  supportsTools?: boolean;
  isEnabled?: boolean;
}

export const modelsApi = {
  async list(): Promise<ProviderModels[]> {
    const response = await fetch(`${API_BASE_URL}/models`);
    if (!response.ok) throw new Error("Failed to fetch models");
    return response.json();
  },

  async listCustom(): Promise<CustomModel[]> {
    const response = await fetch(`${API_BASE_URL}/models/custom`);
    if (!response.ok) throw new Error("Failed to fetch custom models");
    return response.json();
  },

  async create(data: CreateModelData): Promise<{ id: string }> {
    const response = await fetch(`${API_BASE_URL}/models`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
    if (!response.ok) throw new Error("Failed to create model");
    return response.json();
  },

  async update(id: string, data: UpdateModelData): Promise<void> {
    const response = await fetch(`${API_BASE_URL}/models/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
    if (!response.ok) throw new Error("Failed to update model");
  },

  async delete(id: string): Promise<void> {
    const response = await fetch(`${API_BASE_URL}/models/${id}`, {
      method: "DELETE",
    });
    if (!response.ok) throw new Error("Failed to delete model");
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
    const response = await fetch(`${API_BASE_URL}/mcp`);
    if (!response.ok) throw new Error("Failed to fetch MCP servers");
    return response.json();
  },

  /**
   * Get a specific MCP server by ID
   */
  async get(id: string): Promise<MCPServerInfo> {
    const response = await fetch(`${API_BASE_URL}/mcp/${encodeURIComponent(id)}`);
    if (!response.ok) throw new Error("Failed to fetch MCP server");
    return response.json();
  },

  /**
   * Create a new MCP server
   */
  async create(data: CreateMCPServerData): Promise<MCPServerInfo> {
    const response = await fetch(`${API_BASE_URL}/mcp`, {
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
    const response = await fetch(`${API_BASE_URL}/mcp/${encodeURIComponent(id)}`, {
      method: "DELETE",
    });
    if (!response.ok) throw new Error("Failed to delete MCP server");
  },

  /**
   * Refresh/reconnect an MCP server
   */
  async refresh(id: string): Promise<void> {
    const response = await fetch(`${API_BASE_URL}/mcp/${encodeURIComponent(id)}/refresh`, {
      method: "POST",
    });
    if (!response.ok) throw new Error("Failed to refresh MCP server");
  },

  /**
   * Toggle MCP server connection (connect/disconnect)
   */
  async toggle(id: string, status: MCPServerStatus): Promise<void> {
    const response = await fetch(`${API_BASE_URL}/mcp/${encodeURIComponent(id)}/toggle`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status }),
    });
    if (!response.ok) throw new Error("Failed to toggle MCP server");
  },

  /**
   * Call a tool on an MCP server
   */
  async callTool(id: string, toolName: string, input?: unknown): Promise<MCPToolCallResult> {
    const response = await fetch(`${API_BASE_URL}/mcp/${encodeURIComponent(id)}/tool`, {
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
    const response = await fetch(`${API_BASE_URL}/mcp/tools`);
    if (!response.ok) throw new Error("Failed to fetch MCP tools");
    return response.json();
  },

  /**
   * Get the MCP configuration file path
   */
  async getConfigPath(): Promise<string> {
    const response = await fetch(`${API_BASE_URL}/mcp/config-path`);
    if (!response.ok) throw new Error("Failed to get MCP config path");
    const data = await response.json();
    return data.path;
  },
};
