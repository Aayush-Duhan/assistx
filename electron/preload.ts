"use strict";
import { contextBridge,ipcRenderer } from 'electron';

interface ElectronAPI {
  ipcRenderer:{
    send: (channel: string, ...args: any[]) => void;
    invoke: (channel: string, ...args: any[]) => Promise<any>;
    on: (channel: string, listener: (...args: any[]) => void) => void;
    removeListener: (channel: string, listener: (...args: any[]) => void) => void;
  };
  process:{
    platform: NodeJS.Platform;
    env: {
      NODE_ENV: string;
    };
  };
}

const electronAPI: ElectronAPI = {
  ipcRenderer: {
    send: (channel, ...args) => ipcRenderer.send(channel, ...args),
    invoke: (channel, ...args) => ipcRenderer.invoke(channel, ...args),
    on: (channel, listener) => ipcRenderer.on(channel, listener),
    removeListener: (channel, listener) => ipcRenderer.removeListener(channel, listener),
  },
  process: {
    platform: process.platform,
    env: {
      NODE_ENV: process.env.NODE_ENV || 'development',
    },
  },
};
try {
  contextBridge.exposeInMainWorld('electron', electronAPI);
} catch (error) {
  console.error(error);
}