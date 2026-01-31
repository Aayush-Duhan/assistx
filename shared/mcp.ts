/**
 * @file shared/mcp.ts
 * Shared MCP (Model Context Protocol) types used across electron, server, and frontend
 */

import { z } from "zod";

// ============================================================================
// MCP Server Configuration Types
// ============================================================================

export const MCPRemoteConfigZodSchema = z.object({
  url: z.string().url().describe("The URL of the SSE endpoint"),
  headers: z.record(z.string(), z.string()).optional(),
});

export const MCPStdioConfigZodSchema = z.object({
  command: z.string().min(1).describe("The command to run"),
  args: z.array(z.string()).optional(),
  env: z.record(z.string(), z.string()).optional(),
});

export const AllowedMCPServerZodSchema = z.object({
  tools: z.array(z.string()),
});

export type AllowedMCPServer = z.infer<typeof AllowedMCPServerZodSchema>;
export type MCPRemoteConfig = z.infer<typeof MCPRemoteConfigZodSchema>;
export type MCPStdioConfig = z.infer<typeof MCPStdioConfigZodSchema>;
export type MCPServerConfig = MCPRemoteConfig | MCPStdioConfig;

// ============================================================================
// MCP Tool Types
// ============================================================================

export type MCPToolInfo = {
  name: string;
  description: string;
  inputSchema?: {
    type?: string | string[];
    properties?: Record<string, unknown>;
    required?: string[];
  };
};

// ============================================================================
// MCP Server Info Types
// ============================================================================

export type MCPServerStatus = "connected" | "disconnected" | "loading" | "authorizing";

export type MCPServerInfo = {
  name: string;
  config: MCPServerConfig;
  error?: unknown;
  status: MCPServerStatus;
  toolInfo: MCPToolInfo[];
  allowedTools?: string[];
};

// Alias for consistency with other parts of the app
export type MCPClientInfo = MCPServerInfoWithId;

export type MCPServerInfoWithId = MCPServerInfo & { id: string };

// ============================================================================
// MCP Server CRUD Types
// ============================================================================

export type McpServerInsert = {
  name: string;
  config: MCPServerConfig;
  id?: string;
  allowedTools?: string[];
};

export type McpServerSelect = {
  name: string;
  config: MCPServerConfig;
  id: string;
  allowedTools?: string[];
};

// ============================================================================
// MCP Tool Call Types
// ============================================================================

const TextContent = z.object({
  type: z.literal("text"),
  text: z.string(),
  _meta: z.object({}).passthrough().optional(),
});

const ImageContent = z.object({
  type: z.literal("image"),
  data: z.string(),
  mimeType: z.string(),
  _meta: z.object({}).passthrough().optional(),
});

const AudioContent = z.object({
  type: z.literal("audio"),
  data: z.string(),
  mimeType: z.string(),
  _meta: z.object({}).passthrough().optional(),
});

const ResourceLinkContent = z.object({
  type: z.literal("resource_link"),
  name: z.string(),
  title: z.string().optional(),
  uri: z.string(),
  description: z.string().optional(),
  mimeType: z.string().optional(),
  _meta: z.object({}).passthrough().optional(),
});

const ResourceText = z.object({
  uri: z.string(),
  mimeType: z.string().optional(),
  _meta: z.object({}).passthrough().optional(),
  text: z.string(),
});

const ResourceBlob = z.object({
  uri: z.string(),
  mimeType: z.string().optional(),
  _meta: z.object({}).passthrough().optional(),
  blob: z.string(),
});

const ResourceContent = z.object({
  type: z.literal("resource"),
  resource: z.union([ResourceText, ResourceBlob]),
  _meta: z.object({}).passthrough().optional(),
});

const ContentUnion = z.union([
  TextContent,
  ImageContent,
  AudioContent,
  ResourceLinkContent,
  ResourceContent,
]);

export const CallToolResultSchema = z.object({
  _meta: z.object({}).passthrough().optional(),
  content: z.array(ContentUnion).default([]),
  structuredContent: z.object({}).passthrough().optional(),
  isError: z.boolean().optional(),
});

export type CallToolResult = z.infer<typeof CallToolResultSchema>;

// ============================================================================
// API Request/Response Types
// ============================================================================

export interface CreateMcpServerData {
  name: string;
  config: MCPServerConfig;
}

export interface CallToolData {
  toolName: string;
  input: unknown;
}

export interface ToggleClientData {
  status: MCPServerStatus;
}
