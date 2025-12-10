"use strict";
import { contextBridge, ipcRenderer } from 'electron';
import type { ElectronAPI } from '../shared/electron';

const electronAPI: ElectronAPI = {
  ipcRenderer: {
    send: (channel, ...args) => ipcRenderer.send(channel, ...args),
    invoke: (channel, ...args) => ipcRenderer.invoke(channel, ...args),
    on: (channel, listener) => ipcRenderer.on(channel, (_event, ...args) => listener(null, ...args)),
  },
  process: {
    platform: process.platform,
    env: {
      NODE_ENV: process.env.NODE_ENV,
    },
  },
};
try {
  contextBridge.exposeInMainWorld('electron', electronAPI);
} catch (error) {
  console.error(error);
}