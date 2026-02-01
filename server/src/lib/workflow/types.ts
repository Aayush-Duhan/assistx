/**
 * Workflow Types for Server
 * Local copy of types since server uses CommonJS without path aliases
 */

// =============================================================================
// Node Kind Enum
// =============================================================================

export enum NodeKind {
  Input = "input",
  LLM = "llm",
  Condition = "condition",
  Note = "note",
  Tool = "tool",
  Http = "http",
  Template = "template",
  Output = "output",
}

// =============================================================================
// Schema Types
// =============================================================================

export interface ObjectJsonSchema7 {
  type: "object";
  properties: Record<string, unknown>;
  required?: string[];
  additionalProperties?: boolean;
}

export interface OutputSchemaSourceKey {
  nodeId: string;
  path: string[];
}

// =============================================================================
// TipTap Types
// =============================================================================

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

// =============================================================================
// Node Data Types
// =============================================================================

export interface BaseWorkflowNodeData {
  id: string;
  name: string;
  description?: string;
  outputSchema: ObjectJsonSchema7;
}

export interface InputNodeData extends BaseWorkflowNodeData {
  kind: NodeKind.Input;
}

export interface OutputNodeData extends BaseWorkflowNodeData {
  kind: NodeKind.Output;
  outputData: Array<{
    key: string;
    source?: OutputSchemaSourceKey;
  }>;
}

export interface NoteNodeData extends BaseWorkflowNodeData {
  kind: NodeKind.Note;
}

export interface MCPToolKey {
  type: "mcp-tool";
  serverId: string;
  serverName: string;
}

export interface AppToolKey {
  type: "app-tool";
}

export interface WorkflowToolKey {
  id: string;
  description: string;
  parameterSchema?: unknown;
  returnSchema?: unknown;
  toolType: MCPToolKey | AppToolKey;
}

export interface ChatModel {
  provider: string;
  modelId: string;
}

export interface ToolNodeData extends BaseWorkflowNodeData {
  kind: NodeKind.Tool;
  tool?: WorkflowToolKey;
  model?: ChatModel;
  message?: TipTapMentionJsonContent;
}

export interface LLMNodeData extends BaseWorkflowNodeData {
  kind: NodeKind.LLM;
  model: ChatModel;
  messages: Array<{
    role: "user" | "assistant" | "system";
    content?: TipTapMentionJsonContent;
  }>;
}

export type ConditionOperator =
  | "equals"
  | "notEquals"
  | "contains"
  | "notContains"
  | "greaterThan"
  | "lessThan"
  | "isEmpty"
  | "isNotEmpty";

export interface ConditionItem {
  id: string;
  field?: OutputSchemaSourceKey;
  operator: ConditionOperator;
  value?: string | number | boolean;
}

export interface ConditionBranch {
  id: string;
  name: string;
  conditions: ConditionItem[];
  logicalOperator: "AND" | "OR";
}

export interface ConditionBranches {
  if: ConditionBranch;
  elseIf: ConditionBranch[];
  else?: { id: string; name: string };
}

export interface ConditionNodeData extends BaseWorkflowNodeData {
  kind: NodeKind.Condition;
  branches: ConditionBranches;
}

export type HttpMethod = "GET" | "POST" | "PUT" | "DELETE" | "PATCH" | "HEAD";
export type HttpValue = string | OutputSchemaSourceKey;

export interface HttpNodeData extends BaseWorkflowNodeData {
  kind: NodeKind.Http;
  url?: HttpValue;
  method: HttpMethod;
  headers: Array<{ key: string; value?: HttpValue }>;
  query: Array<{ key: string; value?: HttpValue }>;
  body?: HttpValue;
  timeout?: number;
}

export interface TemplateNodeData extends BaseWorkflowNodeData {
  kind: NodeKind.Template;
  template: {
    type: "tiptap";
    tiptap: TipTapMentionJsonContent;
  };
}

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

export interface NodeRuntimeHistory {
  id: string;
  nodeId: string;
  name: string;
  startedAt: number;
  endedAt?: number;
  kind: NodeKind;
  error?: string;
  status: "failed" | "running" | "success";
  result?: {
    input?: unknown;
    output?: unknown;
  };
}

export interface WorkflowExecutionContext {
  screenshot?: boolean;
  conversationHistory?: boolean;
  userPreferences?: boolean;
}

// =============================================================================
// Execution Result Types
// =============================================================================

export interface WorkflowExecutionResult {
  workflowId: string;
  status: "success" | "failed";
  startedAt: number;
  endedAt: number;
  result?: unknown;
  error?: { name: string; message: string };
  history: Array<{
    nodeId: string;
    nodeName: string;
    kind: NodeKind;
    status: "success" | "failed" | "skipped";
    startedAt: number;
    endedAt: number;
    input?: unknown;
    output?: unknown;
    error?: string;
  }>;
}
