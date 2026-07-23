import { createStore, useStore } from "zustand";
import { apiFetch } from "@/lib/api";

export interface ProviderConnection {
  id: string;
  provider: string;
  authType: string;
  name?: string;
  email?: string;
  priority?: number;
  isActive: boolean;
  apiKey?: string;
  providerSpecificData?: any;
  createdAt: string;
  updatedAt: string;
}

export interface ProviderNode {
  id: string;
  type: string;
  name: string;
  prefix?: string;
  apiType?: string;
  baseUrl?: string;
  createdAt: string;
  updatedAt: string;
}

interface ProviderStoreState {
  connections: ProviderConnection[];
  nodes: ProviderNode[];
  providerModels: Record<string, any[]>;
  isLoading: boolean;
  error: string | null;
}

interface ProviderStoreActions {
  fetchConnections: () => Promise<void>;
  fetchNodes: () => Promise<void>;
  fetchModels: () => Promise<void>;
  addConnection: (data: any) => Promise<any>;
  updateConnection: (id: string, data: any) => Promise<any>;
  deleteConnection: (id: string) => Promise<boolean>;
  addNode: (data: any) => Promise<any>;
  updateNode: (id: string, data: any) => Promise<any>;
  deleteNode: (id: string) => Promise<any>;
  validateConnection: (data: { provider: string; apiKey?: string; providerSpecificData?: any }) => Promise<{ valid: boolean; error?: string }>;
}

type ProviderStore = ProviderStoreState & ProviderStoreActions;

export const providerStore = createStore<ProviderStore>((set, get) => ({
  connections: [],
  nodes: [],
  providerModels: {},
  isLoading: false,
  error: null,

  fetchConnections: async () => {
    set({ isLoading: true });
    try {
      const res = await apiFetch("/providers");
      if (!res.ok) throw new Error("Failed to fetch connections");
      const data = await res.json();
      set({ connections: data.connections || [], error: null });
    } catch (e) {
      set({ error: e instanceof Error ? e.message : String(e) });
    } finally {
      set({ isLoading: false });
    }
  },

  fetchNodes: async () => {
    try {
      const res = await apiFetch("/providers/nodes");
      if (!res.ok) throw new Error("Failed to fetch nodes");
      const data = await res.json();
      set({ nodes: data.nodes || [] });
    } catch (e) {
      console.error("Failed to fetch nodes:", e);
    }
  },

  fetchModels: async () => {
    try {
      const res = await apiFetch("/providers/models");
      if (!res.ok) throw new Error("Failed to fetch provider models");
      const data = await res.json();
      set({ providerModels: data.providerModels || {} });
    } catch (e) {
      console.error("Failed to fetch models:", e);
    }
  },

  addConnection: async (data) => {
    const res = await apiFetch("/providers", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
    if (!res.ok) {
      const errData = await res.json();
      throw new Error(errData.error || "Failed to create connection");
    }
    const result = await res.json();
    await get().fetchConnections();
    return result.connection;
  },

  updateConnection: async (id, data) => {
    const res = await apiFetch(`/providers/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
    if (!res.ok) {
      const errData = await res.json();
      throw new Error(errData.error || "Failed to update connection");
    }
    const result = await res.json();
    await get().fetchConnections();
    return result.connection;
  },

  deleteConnection: async (id) => {
    const res = await apiFetch(`/providers/${id}`, {
      method: "DELETE",
    });
    if (!res.ok) return false;
    await get().fetchConnections();
    return true;
  },

  addNode: async (data) => {
    const res = await apiFetch("/providers/nodes", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
    if (!res.ok) {
      const errData = await res.json();
      throw new Error(errData.error || "Failed to create node");
    }
    const result = await res.json();
    await get().fetchNodes();
    return result.node;
  },

  updateNode: async (id, data) => {
    const res = await apiFetch(`/providers/nodes/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
    if (!res.ok) {
      const errData = await res.json();
      throw new Error(errData.error || "Failed to update node");
    }
    const result = await res.json();
    await get().fetchNodes();
    return result.node;
  },

  deleteNode: async (id) => {
    const res = await apiFetch(`/providers/nodes/${id}`, {
      method: "DELETE",
    });
    if (!res.ok) throw new Error("Failed to delete node");
    const result = await res.json();
    await get().fetchNodes();
    return result.node;
  },

  validateConnection: async (data) => {
    const res = await apiFetch("/providers/validate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
    if (!res.ok) {
      const errData = await res.json();
      return { valid: false, error: errData.error || "Validation request failed" };
    }
    return res.json();
  },
}));

export function useProviderStore<T>(selector: (state: ProviderStore) => T): T {
  return useStore(providerStore, selector);
}
