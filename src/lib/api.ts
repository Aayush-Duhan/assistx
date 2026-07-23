/**
 * @file api.ts
 * HTTP client for server API communication with dynamic port and bearer token auth
 */

let cachedServerConfig: { baseUrl: string; wsUrl: string; token: string } | null = null;

export async function getServerConfig(): Promise<{
  baseUrl: string;
  wsUrl: string;
  token: string;
}> {
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
