import { createFileBasedMCPConfigsStorage } from "./fb-mcp-config-storage";
import {
  createMCPClientsManager,
  type MCPClientsManager,
} from "./create-mcp-clients-manager";
declare global {
  var __mcpClientsManager__: MCPClientsManager;
}

if (!globalThis.__mcpClientsManager__) {
  const storage = createFileBasedMCPConfigsStorage()
  globalThis.__mcpClientsManager__ = createMCPClientsManager(storage);
}

export const initMCPManager = async () => {
  return globalThis.__mcpClientsManager__.init();
};

export const mcpClientsManager = globalThis.__mcpClientsManager__;