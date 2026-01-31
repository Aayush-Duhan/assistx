"use strict";
import { contextBridge, ipcRenderer } from "electron";
import type { ElectronAPI } from "../shared/electron";

const electronAPI: ElectronAPI = {
  ipcRenderer: {
    send: (channel, ...args) => ipcRenderer.send(channel, ...args),
    invoke: (channel, ...args) => ipcRenderer.invoke(channel, ...args),
    on: (channel, listener) =>
      ipcRenderer.on(channel, (_event, ...args) => listener(null, ...args)),
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
