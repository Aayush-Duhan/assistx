"use strict";
import { contextBridge, ipcRenderer } from "electron";
import type { ElectronAPI } from "@/shared/electron";

// Track wrapper functions so off() can remove the exact listener registered by on()
const listenerWrappers = new Map<Function, Function>();

const electronAPI: ElectronAPI = {
  ipcRenderer: {
    send: (channel, ...args) => ipcRenderer.send(channel, ...args),
    invoke: (channel, ...args) => ipcRenderer.invoke(channel, ...args),
    on: (channel, listener) => {
      const wrapper = (_event: unknown, ...args: unknown[]) => listener(null, ...args);
      listenerWrappers.set(listener, wrapper);
      ipcRenderer.on(channel, wrapper as any);
    },
    off: (channel, listener) => {
      const wrapper = listenerWrappers.get(listener);
      if (wrapper) {
        ipcRenderer.removeListener(channel, wrapper as any);
        listenerWrappers.delete(listener);
      }
    },
  },
  process: {
    platform: process.platform,
    env: {
      NODE_ENV: process.env.NODE_ENV,
    },
  },
  mcp: {
    listClients: () => ipcRenderer.invoke("mcp-list-clients", null),
    refreshClient: (id: string) => ipcRenderer.invoke("mcp-refresh-client", { id }),
    toggleClient: (id: string, status: string) =>
      ipcRenderer.invoke("mcp-toggle-client", { id, status }),
    callTool: (id: string, toolName: string, input: unknown) =>
      ipcRenderer.invoke("mcp-call-tool", { id, toolName, input }),
    removeClient: (id: string) => ipcRenderer.invoke("mcp-remove-client", { id }),
    setAllowedTools: (id: string, allowedTools: string[]) =>
      ipcRenderer.invoke("mcp-set-allowed-tools", { id, allowedTools }),
  },
};
try {
  contextBridge.exposeInMainWorld("electron", electronAPI);
} catch (error) {
  console.error(error);
}
