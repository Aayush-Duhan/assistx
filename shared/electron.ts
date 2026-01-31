export type ElectronAPI = {
  ipcRenderer: {
    send: (channel: string, ...args: unknown[]) => void;
    invoke: (channel: string, ...args: unknown[]) => Promise<unknown>;
    // doesn't expose the event, as event.sender gives access to the ipc renderer instance
    on: (channel: string, listener: (event: unknown, ...args: unknown[]) => void) => void;
  };
  process: {
    platform: NodeJS.Platform;
    // only exposes relevant environment variables
    env: {
      NODE_ENV: string | undefined;
    };
  };
  mcp: {
    listClients: () => Promise<import("./mcp").MCPClientInfo[]>;
    refreshClient: (id: string) => Promise<void>;
    toggleClient: (id: string, status: "connected" | "disconnected") => Promise<void>;
    callTool: (id: string, toolName: string, input: unknown) => Promise<unknown>;
    removeClient: (id: string) => Promise<void>;
    setAllowedTools: (id: string, allowedTools: string[]) => Promise<void>;
  };
};

declare global {
  interface Window {
    electron: ElectronAPI;
  }
}
