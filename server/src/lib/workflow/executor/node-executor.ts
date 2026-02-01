/**
 * Node Executor Interface and Implementations
 * Each node type has an executor that defines how it processes data
 */

import type {
  NodeKind,
  WorkflowNodeData,
  InputNodeData,
  OutputNodeData,
  LLMNodeData,
  ConditionNodeData,
  ToolNodeData,
  HttpNodeData,
  TemplateNodeData,
  NoteNodeData,
  OutputSchemaSourceKey,
  TipTapMentionJsonContent,
} from "../types";
import type { WorkflowRuntimeState } from "./runtime-state";

/**
 * Context provided to node executors
 */
export interface NodeExecutorContext {
  /** Current runtime state */
  state: WorkflowRuntimeState;

  /** Node configuration from database */
  node: WorkflowNodeData;

  /** Resolve a reference to another node's output */
  resolveReference: (ref: OutputSchemaSourceKey) => unknown;

  /** Process TipTap mention content into string */
  processMentions: (content: TipTapMentionJsonContent) => string;
}

/**
 * Result from node execution
 */
export interface NodeExecutionResult {
  /** Output data from this node */
  output?: unknown;

  /** Error message if execution failed */
  error?: string;

  /** For condition nodes: which branch was taken */
  branchId?: string;

  /** Whether to skip downstream nodes (for condition branches not taken) */
  skipDownstream?: boolean;
}

/**
 * Node executor function type
 */
export type NodeExecutor<T extends WorkflowNodeData = WorkflowNodeData> = (
  ctx: NodeExecutorContext & { node: T },
) => Promise<NodeExecutionResult> | NodeExecutionResult;

// =============================================================================
// Input Node Executor
// =============================================================================

export const inputNodeExecutor: NodeExecutor<InputNodeData> = (ctx) => ({
  output: ctx.state.input,
});

// =============================================================================
// Output Node Executor
// =============================================================================

export const outputNodeExecutor: NodeExecutor<OutputNodeData> = (ctx) => {
  const { node, resolveReference } = ctx;

  // Collect outputs from specified source nodes
  const result: Record<string, unknown> = {};

  if (node.outputData) {
    for (const item of node.outputData) {
      if (item.source) {
        result[item.key] = resolveReference(item.source);
      }
    }
  }

  // Store in state.output for final result
  ctx.state.output = { ...ctx.state.output, ...result };

  return {
    output: result,
  };
};

// =============================================================================
// Note Node Executor
// =============================================================================

export const noteNodeExecutor: NodeExecutor<NoteNodeData> = () => ({
  output: undefined,
  skipDownstream: false,
});

// =============================================================================
// LLM Node Executor
// =============================================================================

import { generateLLMResponse } from "../ai-service";

interface ParsedModel {
  provider: string;
  modelId: string;
}

// Parse model configuration from various input formats
const parseModelConfig = (rawModel: unknown): ParsedModel | null => {
  if (rawModel && typeof rawModel === "object") {
    const provider = (rawModel as { provider?: unknown }).provider;
    const modelId = (rawModel as { modelId?: unknown }).modelId;
    if (typeof provider === "string" && typeof modelId === "string") {
      return { provider, modelId };
    }
  }

  if (typeof rawModel === "string") {
    if (rawModel.includes("/")) {
      const [provider, ...rest] = rawModel.split("/");
      return { provider, modelId: rest.join("/") };
    }
    return { provider: "openai", modelId: rawModel };
  }

  return null;
};

export const llmNodeExecutor: NodeExecutor<LLMNodeData> = async (ctx) => {
  const { node, processMentions, state } = ctx;

  // Build messages array from node configuration
  const messages = (node.messages || [])
    .map((msg) => {
      const rawContent = msg.content as unknown;
      let content: string;

      if (typeof rawContent === "string") {
        content = rawContent;
      } else if (rawContent) {
        content = processMentions(rawContent as TipTapMentionJsonContent);
      } else {
        content = "";
      }

      return {
        role: msg.role,
        content: content.trim(),
      };
    })
    .filter((msg) => msg.content);

  // Build fallback messages from system prompt and workflow input
  const fallbackMessages = () => {
    const result: Array<{ role: "system" | "user"; content: string }> = [];

    // Add system prompt if present
    const systemPrompt = (node as unknown as Record<string, unknown>).systemPrompt;
    if (typeof systemPrompt === "string" && systemPrompt.trim()) {
      result.push({ role: "system", content: systemPrompt });
    }

    // Add user input if present and non-empty
    const input = state.input;
    if (input === null || input === undefined) return result;
    if (typeof input === "object" && Object.keys(input as Record<string, unknown>).length === 0)
      return result;

    const inputText = typeof input === "string" ? input : JSON.stringify(input, null, 2);
    result.push({ role: "user", content: inputText });

    return result;
  };

  let resolvedMessages = messages.length > 0 ? messages : fallbackMessages();
  resolvedMessages = resolvedMessages.filter((msg) => msg.content.trim());

  if (resolvedMessages.length === 0) {
    resolvedMessages = [{ role: "user", content: "Provide a response." }];
  } else if (!resolvedMessages.some((msg) => msg.role === "user")) {
    resolvedMessages = [...resolvedMessages, { role: "user", content: "Provide a response." }];
  }

  if (resolvedMessages.length === 0) {
    return { error: "LLM node has no messages configured" };
  }

  const rawModel = (node as unknown as Record<string, unknown>).model;
  const parsedModel = parseModelConfig(rawModel);

  if (!parsedModel?.provider || !parsedModel?.modelId) {
    return { error: "LLM node has no model configured" };
  }

  // Generate LLM response using AI service
  const result = await generateLLMResponse({
    model: {
      provider: parsedModel.provider,
      modelId: parsedModel.modelId,
    },
    messages: resolvedMessages,
  });

  if (!result.success) {
    return { error: result.error ?? "LLM generation failed" };
  }

  return {
    output: {
      response: result.response,
      model: `${parsedModel.provider}/${parsedModel.modelId}`,
      usage: result.usage,
    },
  };
};

// =============================================================================
// Condition Node Executor
// =============================================================================

export const conditionNodeExecutor: NodeExecutor<ConditionNodeData> = (ctx) => {
  const { node, resolveReference } = ctx;
  const { branches } = node;

  // Helper to evaluate a single condition
  const evaluateCondition = (condition: (typeof branches.if.conditions)[0]): boolean => {
    if (!condition.field) return false;

    const value = resolveReference(condition.field);
    const compareValue = condition.value;

    switch (condition.operator) {
      case "equals":
        return value === compareValue;
      case "notEquals":
        return value !== compareValue;
      case "contains":
        return String(value).includes(String(compareValue));
      case "notContains":
        return !String(value).includes(String(compareValue));
      case "greaterThan":
        return Number(value) > Number(compareValue);
      case "lessThan":
        return Number(value) < Number(compareValue);
      case "isEmpty":
        return value === null || value === undefined || value === "";
      case "isNotEmpty":
        return value !== null && value !== undefined && value !== "";
      default:
        return false;
    }
  };

  // Helper to evaluate a branch (all conditions with AND/OR logic)
  const evaluateBranch = (branch: typeof branches.if): boolean => {
    if (branch.conditions.length === 0) return false;

    if (branch.logicalOperator === "AND") {
      return branch.conditions.every(evaluateCondition);
    } else {
      return branch.conditions.some(evaluateCondition);
    }
  };

  // Check if branch
  if (evaluateBranch(branches.if)) {
    ctx.state.activeBranches.add(branches.if.id);
    return {
      output: { branch: branches.if.name },
      branchId: branches.if.id,
    };
  }

  // Check else-if branches
  for (const elseIfBranch of branches.elseIf || []) {
    if (evaluateBranch(elseIfBranch)) {
      ctx.state.activeBranches.add(elseIfBranch.id);
      return {
        output: { branch: elseIfBranch.name },
        branchId: elseIfBranch.id,
      };
    }
  }

  // Fall through to else branch
  if (branches.else) {
    ctx.state.activeBranches.add(branches.else.id);
    return {
      output: { branch: branches.else.name },
      branchId: branches.else.id,
    };
  }

  return {
    output: { branch: null },
  };
};

// =============================================================================
// Tool Node Executor
// =============================================================================

import { executeMCPTool } from "../mcp-service";

export const toolNodeExecutor: NodeExecutor<ToolNodeData> = async (ctx) => {
  const { node, processMentions } = ctx;

  if (!node.tool) {
    return { error: "Tool node has no tool configured" };
  }

  const { tool } = node;
  const toolType = tool.toolType.type;

  // App (built-in) tools - screenshot, js-execute, etc.
  if (toolType === "app-tool") {
    const message = node.message ? processMentions(node.message) : "";
    return {
      output: {
        toolId: tool.id,
        toolType: "app-tool",
        message,
        result: `[App Tool Placeholder] ${tool.description || tool.id}`,
      },
    };
  }

  // MCP tool execution
  if (toolType === "mcp-tool") {
    const mcpConfig = tool.toolType as { type: "mcp-tool"; serverId: string; serverName: string };
    const serverName = mcpConfig.serverName;
    const toolName = tool.id;

    // Get message content for input
    const message = node.message ? processMentions(node.message) : undefined;
    const input: Record<string, unknown> = {};
    if (message) {
      input.message = message;
    }

    const result = await executeMCPTool({
      serverName,
      toolName,
      input,
    });

    if (!result.success) {
      return { error: result.error ?? "MCP tool execution failed" };
    }

    return {
      output: {
        toolId: tool.id,
        toolType: "mcp-tool",
        serverName,
        result: result.result,
      },
    };
  }

  return { error: `Unknown tool type: ${toolType}` };
};

// =============================================================================
// HTTP Node Executor
// =============================================================================

export const httpNodeExecutor: NodeExecutor<HttpNodeData> = async (ctx) => {
  const { node, resolveReference } = ctx;

  // Resolve dynamic values
  const resolveValue = (val: string | OutputSchemaSourceKey | undefined): string => {
    if (!val) return "";
    if (typeof val === "string") return val;
    return String(resolveReference(val) ?? "");
  };

  const url = resolveValue(node.url);
  if (!url) {
    return { error: "HTTP node has no URL configured" };
  }

  // Build headers
  const headers: Record<string, string> = {};
  for (const header of node.headers || []) {
    if (header.key) {
      headers[header.key] = resolveValue(header.value);
    }
  }

  // Build query params
  const queryParams = new URLSearchParams();
  for (const param of node.query || []) {
    if (param.key) {
      queryParams.set(param.key, resolveValue(param.value));
    }
  }

  const fullUrl = queryParams.toString()
    ? `${url}${url.includes("?") ? "&" : "?"}${queryParams.toString()}`
    : url;

  try {
    const response = await fetch(fullUrl, {
      method: node.method || "GET",
      headers,
      body: node.method !== "GET" && node.method !== "HEAD" ? resolveValue(node.body) : undefined,
      signal: AbortSignal.timeout(node.timeout || 30000),
    });

    const contentType = response.headers.get("content-type") || "";
    let data: unknown;

    if (contentType.includes("application/json")) {
      data = await response.json();
    } else {
      data = await response.text();
    }

    return {
      output: {
        status: response.status,
        statusText: response.statusText,
        headers: Object.fromEntries(response.headers.entries()),
        data,
      },
    };
  } catch (error) {
    return {
      error: error instanceof Error ? error.message : String(error),
    };
  }
};

// =============================================================================
// Template Node Executor
// =============================================================================

export const templateNodeExecutor: NodeExecutor<TemplateNodeData> = (ctx) => {
  const { node, processMentions } = ctx;

  const template = (node as unknown as Record<string, unknown>).template;
  if (!template) {
    return { error: "Template node has no template configured" };
  }

  if (typeof template === "string") {
    return { output: { text: template } };
  }

  if (typeof template === "object") {
    const tiptap = (template as { tiptap?: unknown }).tiptap;
    if (tiptap) {
      const result = processMentions(tiptap as TipTapMentionJsonContent);
      return { output: { text: result } };
    }
  }

  return { error: "Template node has no template configured" };
};

// =============================================================================
// Executor Registry
// =============================================================================

const executorRegistry: Record<NodeKind, NodeExecutor> = {
  input: inputNodeExecutor as NodeExecutor,
  output: outputNodeExecutor as NodeExecutor,
  note: noteNodeExecutor as NodeExecutor,
  llm: llmNodeExecutor as NodeExecutor,
  condition: conditionNodeExecutor as NodeExecutor,
  tool: toolNodeExecutor as NodeExecutor,
  http: httpNodeExecutor as NodeExecutor,
  template: templateNodeExecutor as NodeExecutor,
};

/**
 * Get the executor for a given node kind
 */
export function getExecutor(kind: NodeKind): NodeExecutor {
  const executor = executorRegistry[kind];
  if (!executor) {
    throw new Error(`No executor found for node kind: ${kind}`);
  }
  return executor;
}
