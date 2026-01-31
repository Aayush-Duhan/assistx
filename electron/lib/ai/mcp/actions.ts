import { z } from "zod/v3";
import { mcpClientsManager } from "./mcp-manager";
import { jsonMcpOAuthRepository as mcpOAuthRepository } from "../../db/json/mcp-oauth-repository.json";
import type { McpServerInsert } from "../../../types/mcp";

export async function selectMcpClientsAction() {
  const list = await mcpClientsManager.getClients();
  return list.map(({ client, id }) => ({
    ...client.getInfo(),
    id,
  }));
}

export async function selectMcpClientAction(id: string) {
  const client = await mcpClientsManager.getClient(id);
  if (!client) {
    throw new Error("Client not found");
  }
  return {
    ...client.client.getInfo(),
    id,
  };
}

export async function saveMcpClientAction(server: McpServerInsert) {
  if (process.env.NOT_ALLOW_ADD_MCP_SERVERS) {
    throw new Error("Not allowed to add MCP servers");
  }

  const nameSchema = z.string().regex(/^[a-zA-Z0-9]+$/, {
    message: "Name must contain only alphanumeric characters (A-Z, a-z, 0-9) and hyphens (-)",
  });

  const result = nameSchema.safeParse(server.name);
  if (!result.success) {
    throw new Error(
      "Name must contain only alphanumeric characters (A-Z, a-z, 0-9) and hyphens (-)",
    );
  }

  await mcpClientsManager.persistClient(server);
  const all = await mcpClientsManager.getClients();
  const match = all.find((c) => c.client.getInfo().name === server.name);
  if (!match) {
    throw new Error("Failed to persist MCP client");
  }
  return {
    ...match.client.getInfo(),
    id: match.id,
  };
}

export async function existMcpClientByServerNameAction(serverName: string) {
  const all = await mcpClientsManager.getClients();
  return all.some((c) => c.client.getInfo().name === serverName);
}

export async function removeMcpClientAction(id: string) {
  await mcpClientsManager.removeClient(id);
}

export async function refreshMcpClientAction(id: string) {
  await mcpClientsManager.refreshClient(id);
}

export async function authorizeMcpClientAction(id: string) {
  await refreshMcpClientAction(id);
  const client = await mcpClientsManager.getClient(id);
  if (!client || client.client.status != "authorizing") {
    throw new Error("Authorization URL not available");
  }
  return client.client.getAuthorizationUrl()?.toString();
}

export async function toggleMcpClientConnectionAction(
  id: string,
  status: "connected" | "disconnected" | "loading" | "authorizing",
) {
  const entry = await mcpClientsManager.getClient(id);
  if (!entry) {
    throw new Error(`Client ${id} not found`);
  }

  const client = entry.client;
  if (status === "connected" || status === "authorizing" || status === "loading") {
    await client.disconnect();
  } else {
    await client.connect();
  }
}

export async function checkTokenMcpClientAction(id: string) {
  const session = await mcpOAuthRepository.getAuthenticatedSession(id);
  await mcpClientsManager.getClient(id).catch(() => null);
  return !!session?.tokens;
}

export async function callMcpToolAction(id: string, toolName: string, input: unknown) {
  return mcpClientsManager.toolCall(id, toolName, input);
}

export async function callMcpToolByServerNameAction(
  serverName: string,
  toolName: string,
  input: unknown,
) {
  return mcpClientsManager.toolCallByServerName(serverName, toolName, input);
}
