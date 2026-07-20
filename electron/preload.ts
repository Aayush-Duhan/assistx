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
  getServerConfig: () => ipcRenderer.invoke("get-server-config"),
};
try {
  contextBridge.exposeInMainWorld("electron", electronAPI);
} catch (error) {
  console.error(error);
}
