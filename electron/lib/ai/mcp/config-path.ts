import { join } from "node:path";
import { app } from "electron";

export const MCP_CONFIG_PATH = join(app.getPath("userData"), ".mcp-config.json");
