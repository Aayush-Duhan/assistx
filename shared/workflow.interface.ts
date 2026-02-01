/**
 * Workflow Interface Definitions
 * Port from better-chatbot with adaptations for assistx
 *
 * When adding a new node type:
 * 1. Add the new kind to NodeKind enum
 * 2. Create corresponding NodeData type below
 * 3. Add to WorkflowNodeData union
 * 4. Implement executor in server/src/lib/workflow/executor/
 * 5. Create UI config component in dashboard
 */

import type { JSONSchema7 } from "json-schema";

/**
 * Enum defining all available node types in the workflow system
 */
export enum NodeKind {
  Input = "input", // Entry point of workflow - receives initial data
  LLM = "llm", // Large Language Model interaction node
  Condition = "condition", // Conditional branching node
  Note = "note", // Documentation/annotation node (no execution)
  Tool = "tool", // MCP or built-in tool execution node
  Http = "http", // HTTP request node
  Template = "template", // Template processing node
  Output = "output", // Exit point of workflow - produces final result
}

/**
 * Object JSON Schema for defining structured data
 */
export interface ObjectJsonSchema7 {
  type: "object";
  properties: Record<string, JSONSchema7>;
  required?: string[];
  additionalProperties?: boolean;
}

/**
 * Reference to a field from another node's output
 * Used to create data dependencies between nodes
 */
export interface OutputSchemaSourceKey {
  nodeId: string; // ID of the source node
  path: string[]; // Path to the specific field in the output
}

/**
 * TipTap mention content for rich text with variable references
 */
export interface TipTapMentionJsonContent {
  type: "doc";
  content: Array<{
    type: string;
    attrs?: Record<string, unknown>;
    content?: Array<{
      type: string;
      text?: string;
      attrs?: Record<string, unknown>;
    }>;
  }>;
}

/**
 * Base interface for all workflow node data
 */
export interface BaseWorkflowNodeData {
  id: string;
  name: string; // Unique name within workflow
  description?: string;
  outputSchema: ObjectJsonSchema7;
}

// =============================================================================
// Node-specific Data Types
// =============================================================================

/**
 * Input node: Entry point of the workflow
 */
export interface InputNodeData extends BaseWorkflowNodeData {
  kind: NodeKind.Input;
}

/**
 * Output node: Exit point of the workflow
 */
export interface OutputNodeData extends BaseWorkflowNodeData {
  kind: NodeKind.Output;
  outputData: Array<{
    key: string;
    source?: OutputSchemaSourceKey;
  }>;
}

/**
 * Note node: Documentation only, no execution
 */
export interface NoteNodeData extends BaseWorkflowNodeData {
  kind: NodeKind.Note;
}

/**
 * MCP tool definition
 */
export interface MCPToolKey {
  type: "mcp-tool";
  serverId: string;
  serverName: string;
}

/**
 * Built-in app tool definition
 */
export interface AppToolKey {
  type: "app-tool";
}

/**
 * Workflow tool key
 */
export interface WorkflowToolKey {
  id: string; // Tool name
  description: string;
  parameterSchema?: JSONSchema7;
  returnSchema?: JSONSchema7;
  toolType: MCPToolKey | AppToolKey;
}

/**
 * Chat model reference
 */
export interface ChatModel {
  provider: string;
  modelId: string;
}

/**
 * Tool node: Executes MCP or built-in tools
 */
export interface ToolNodeData extends BaseWorkflowNodeData {
  kind: NodeKind.Tool;
  tool?: WorkflowToolKey;
  model?: ChatModel; // For LLM-based parameter generation
  message?: TipTapMentionJsonContent;
}

/**
 * LLM node: Interacts with Large Language Models
 */
export interface LLMNodeData extends BaseWorkflowNodeData {
  kind: NodeKind.LLM;
  model: ChatModel;
  messages: Array<{
    role: "user" | "assistant" | "system";
    content?: TipTapMentionJsonContent;
  }>;
}

/**
 * Condition comparison operators
 */
export type ConditionOperator =
  | "equals"
  | "notEquals"
  | "contains"
  | "notContains"
  | "greaterThan"
  | "lessThan"
  | "isEmpty"
  | "isNotEmpty";

/**
 * Single condition definition
 */
export interface ConditionItem {
  id: string;
  field?: OutputSchemaSourceKey;
  operator: ConditionOperator;
  value?: string | number | boolean;
}

/**
 * Condition branch with AND/OR logic
 */
export interface ConditionBranch {
  id: string;
  name: string;
  conditions: ConditionItem[];
  logicalOperator: "AND" | "OR";
}

/**
 * All branches in a condition node (if/else-if/else)
 */
export interface ConditionBranches {
  if: ConditionBranch;
  elseIf: ConditionBranch[];
  else?: { id: string; name: string };
}

/**
 * Condition node: Conditional branching
 */
export interface ConditionNodeData extends BaseWorkflowNodeData {
  kind: NodeKind.Condition;
  branches: ConditionBranches;
}

/**
 * HTTP request methods
 */
export type HttpMethod = "GET" | "POST" | "PUT" | "DELETE" | "PATCH" | "HEAD";

/**
 * HTTP value (literal or node reference)
 */
export type HttpValue = string | OutputSchemaSourceKey;

/**
 * HTTP node: Performs HTTP requests
 */
export interface HttpNodeData extends BaseWorkflowNodeData {
  kind: NodeKind.Http;
  url?: HttpValue;
  method: HttpMethod;
  headers: Array<{ key: string; value?: HttpValue }>;
  query: Array<{ key: string; value?: HttpValue }>;
  body?: HttpValue;
  timeout?: number; // Default: 30000ms
}

/**
 * Template node: Text templating with variable substitution
 */
export interface TemplateNodeData extends BaseWorkflowNodeData {
  kind: NodeKind.Template;
  template: {
    type: "tiptap";
    tiptap: TipTapMentionJsonContent;
  };
}

/**
 * Union type of all node data types
 */
export type WorkflowNodeData =
  | InputNodeData
  | OutputNodeData
  | LLMNodeData
  | NoteNodeData
  | ToolNodeData
  | ConditionNodeData
  | HttpNodeData
  | TemplateNodeData;

// =============================================================================
// Runtime Types
// =============================================================================

/**
 * Runtime fields added during workflow execution
 */
export interface NodeRuntimeField {
  isNew?: boolean;
  status?: "fail" | "running" | "success";
}

/**
 * Runtime history record for node execution tracking
 */
export interface NodeRuntimeHistory {
  id: string;
  nodeId: string;
  name: string;
  startedAt: number;
  endedAt?: number;
  kind: NodeKind;
  error?: string;
  status: "fail" | "running" | "success";
  result?: {
    input?: unknown;
    output?: unknown;
  };
}

// =============================================================================
// Execution Context
// =============================================================================

/**
 * Available execution context options
 */
export interface WorkflowExecutionContext {
  screenshot?: boolean; // Include current screen capture
  conversationHistory?: boolean; // Include recent conversation
  userPreferences?: boolean; // Include user settings
}

/**
 * Default object JSON schema
 */
export const defaultObjectJsonSchema: ObjectJsonSchema7 = {
  type: "object",
  properties: {},
  required: [],
};
