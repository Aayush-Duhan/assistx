/**
 * Workflow Database and API Types
 * Types for database storage and API communication
 */

import type { NodeKind, WorkflowNodeData, WorkflowExecutionContext } from "./workflow.interface";

// =============================================================================
// Workflow Icon
// =============================================================================

export interface WorkflowIcon {
  type: "emoji";
  value: string;
  style?: Record<string, string>;
}

// =============================================================================
// Database Types
// =============================================================================

/**
 * Workflow record in database
 */
export interface DBWorkflow {
  id: string;
  name: string;
  description?: string;
  version: string;
  icon?: WorkflowIcon;
  isPublished: boolean; // Available as AI tool when published
  isActive: boolean;
  triggerType?: "manual" | "schedule" | "ai";
  executionContext?: WorkflowExecutionContext; // User-configured context
  lastRunAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Workflow node record in database
 */
export interface DBNode {
  id: string;
  workflowId: string;
  kind: NodeKind;
  name: string;
  description?: string;
  nodeConfig: Record<string, unknown>; // Node-specific configuration
  uiConfig: {
    position?: { x: number; y: number };
    [key: string]: unknown;
  };
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Workflow edge record in database
 */
export interface DBEdge {
  id: string;
  workflowId: string;
  source: string; // Source node ID
  target: string; // Target node ID
  uiConfig: {
    sourceHandle?: string;
    targetHandle?: string;
    label?: string; // For condition branches
    [key: string]: unknown;
  };
  createdAt: Date;
}

// =============================================================================
// API Types
// =============================================================================

/**
 * Workflow summary for list views
 */
export interface WorkflowSummary {
  id: string;
  name: string;
  description?: string;
  icon?: WorkflowIcon;
  isPublished: boolean;
  isActive: boolean;
  updatedAt: Date;
}

/**
 * Full workflow with structure for editing
 */
export interface WorkflowWithStructure extends DBWorkflow {
  nodes: DBNode[];
  edges: DBEdge[];
}

/**
 * Create workflow request
 */
export interface CreateWorkflowRequest {
  name: string;
  description?: string;
  icon?: WorkflowIcon;
}

/**
 * Update workflow request
 */
export interface UpdateWorkflowRequest {
  name?: string;
  description?: string;
  icon?: WorkflowIcon;
  isPublished?: boolean;
  isActive?: boolean;
  triggerType?: "manual" | "schedule" | "ai";
  executionContext?: WorkflowExecutionContext;
}

/**
 * Save workflow structure request
 */
export interface SaveWorkflowStructureRequest {
  nodes?: DBNode[];
  edges?: DBEdge[];
  deleteNodes?: string[]; // Node IDs to delete
  deleteEdges?: string[]; // Edge IDs to delete
}

/**
 * Execute workflow request
 */
export interface ExecuteWorkflowRequest {
  inputData?: Record<string, unknown>;
  context?: WorkflowExecutionContext;
}

/**
 * Workflow execution result
 */
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

// =============================================================================
// Export/Import Types
// =============================================================================

/**
 * Workflow export format
 */
export interface WorkflowExport {
  version: "1.0";
  exportedAt: string;
  workflow: {
    name: string;
    description?: string;
    icon?: WorkflowIcon;
    triggerType?: "manual" | "schedule" | "ai";
    executionContext?: WorkflowExecutionContext;
  };
  nodes: Array<{
    id: string;
    kind: NodeKind;
    name: string;
    description?: string;
    nodeConfig: Record<string, unknown>;
    uiConfig: Record<string, unknown>;
  }>;
  edges: Array<{
    id: string;
    source: string;
    target: string;
    uiConfig: Record<string, unknown>;
  }>;
}

/**
 * Workflow import result
 */
export interface WorkflowImportResult {
  success: boolean;
  workflowId?: string;
  errors?: string[];
}

// =============================================================================
// AI Generation Types
// =============================================================================

/**
 * AI workflow generation request
 */
export interface GenerateWorkflowRequest {
  description: string; // Natural language description
  availableTools?: string[]; // Available MCP tool names
}

/**
 * AI-generated workflow structure
 */
export interface GeneratedWorkflow {
  name: string;
  description: string;
  nodes: Array<{
    id: string;
    kind: NodeKind;
    name: string;
    nodeConfig: Partial<WorkflowNodeData>;
    position: { x: number; y: number };
  }>;
  edges: Array<{
    id: string;
    source: string;
    target: string;
  }>;
}
