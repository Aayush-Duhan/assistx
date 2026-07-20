export interface ServerConfig {
  port: number;
  host: string;
  baseUrl: string;
  wsUrl: string;
  token: string;
}

let serverConfig: ServerConfig | null = null;

export function setServerConfig(config: ServerConfig): void {
  serverConfig = config;
  process.env.ASSISTX_SERVER_PORT = String(config.port);
  process.env.ASSISTX_SERVER_TOKEN = config.token;
}

export function getServerConfig(): ServerConfig | null {
  return serverConfig;
}
