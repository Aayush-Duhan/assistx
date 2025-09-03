/// <reference types="vite/client" />

declare global {
  interface Window {
    electron: {
      ipcRenderer: {
        send: (channel: string, ...args: any[]) => void;
        invoke: (channel: string, ...args: any[]) => Promise<any>;
        on: (channel: string, listener: (error: null, ...args: any[]) => void) => void;
        removeListener: (channel: string, listener: (error: null, ...args: any[]) => void) => void;
      };
      process: {
        platform: string;
        env: {
          NODE_ENV?: string;
        };
      };
    };
  }
}
export {};