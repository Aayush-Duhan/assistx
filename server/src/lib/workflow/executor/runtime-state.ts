/**
 * Workflow Runtime State
 * State that's passed through the workflow during execution
 */

import type { WorkflowExecutionContext, NodeRuntimeHistory, NodeKind } from "../types";

/**
 * Runtime state tracked during workflow execution
 */
export interface WorkflowRuntimeState {
  /** Input data passed to the workflow */
  input: Record<string, unknown>;

  /** Accumulated output data from completed nodes */
  output: Record<string, unknown>;

  /** Per-node outputs keyed by node ID */
  nodeOutputs: Map<string, unknown>;

  /** Context options passed at execution time */
  context: WorkflowExecutionContext;

  /** Execution history for debugging/UI */
  history: NodeRuntimeHistory[];

  /** IDs of branches taken in condition nodes */
  activeBranches: Set<string>;

  /** Error if any node failed */
  error?: { nodeId: string; message: string };

  /** Workflow ID being executed */
  workflowId: string;

  /** Execution start time */
  startedAt: number;
}

/**
 * Create initial runtime state for workflow execution
 */
export function createRuntimeState(
  workflowId: string,
  input: Record<string, unknown>,
  context: WorkflowExecutionContext = {},
): WorkflowRuntimeState {
  return {
    input,
    output: {},
    nodeOutputs: new Map(),
    context,
    history: [],
    activeBranches: new Set(),
    workflowId,
    startedAt: Date.now(),
  };
}

/**
 * Record node execution in history
 */
export function recordNodeExecution(
  state: WorkflowRuntimeState,
  nodeId: string,
  nodeName: string,
  kind: NodeKind,
  result: { input?: unknown; output?: unknown; error?: string },
  startedAt: number,
): void {
  const endedAt = Date.now();
  const status = result.error ? "failed" : "success";

  state.history.push({
    id: `${nodeId}-${endedAt}`,
    nodeId,
    name: nodeName,
    kind,
    status,
    startedAt,
    endedAt,
    result: result.error
      ? undefined
      : {
          input: result.input,
          output: result.output,
        },
    error: result.error,
  });

  // Store node output for downstream nodes
  if (result.output !== undefined && !result.error) {
    state.nodeOutputs.set(nodeId, result.output);
  }
}
