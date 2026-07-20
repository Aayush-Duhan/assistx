export interface ServerConfig {
  port: number;
  host: string;
  baseUrl: string;
  wsUrl: string;
  token: string;
}

export type ElectronAPI = {
  ipcRenderer: {
    send: (channel: string, ...args: unknown[]) => void;
    invoke: (channel: string, ...args: unknown[]) => Promise<unknown>;
    // doesn't expose the event, as event.sender gives access to the ipc renderer instance
    on: (channel: string, listener: (event: unknown, ...args: unknown[]) => void) => void;
    off: (channel: string, listener: (event: unknown, ...args: unknown[]) => void) => void;
  };
  process: {
    platform: NodeJS.Platform;
    // only exposes relevant environment variables
    env: {
      NODE_ENV: string | undefined;
    };
  };
  getServerConfig: () => Promise<ServerConfig | null>;
};

declare global {
  interface Window {
    electron: ElectronAPI;
  }
}
