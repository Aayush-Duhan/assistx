/**
 * Workflow Executor
 * Main entry point for executing workflows
 *
 * Uses topological sorting for node execution order
 */

import type { WorkflowNode, WorkflowEdge } from "../../../db";
import type {
  WorkflowNodeData,
  WorkflowExecutionContext,
  NodeKind,
  OutputSchemaSourceKey,
  WorkflowExecutionResult,
} from "../types";
import {
  createRuntimeState,
  recordNodeExecution,
  type WorkflowRuntimeState,
} from "./runtime-state";
import { getExecutor, type NodeExecutorContext } from "./node-executor";
import { processTipTapMentions } from "./tiptap-processor";
import { logger } from "../../pino/logger";

/**
 * Build a dependency graph from edges
 */
function buildDependencyGraph(
  nodes: WorkflowNode[],
  edges: WorkflowEdge[],
): {
  nodeMap: Map<string, WorkflowNode>;
  inDegree: Map<string, number>;
  adjacency: Map<string, string[]>;
} {
  const nodeMap = new Map(nodes.map((n) => [n.id, n]));
  const inDegree = new Map<string, number>();
  const adjacency = new Map<string, string[]>();

  // Initialize
  for (const node of nodes) {
    inDegree.set(node.id, 0);
    adjacency.set(node.id, []);
  }

  // Build graph
  for (const edge of edges) {
    const current = inDegree.get(edge.target) ?? 0;
    inDegree.set(edge.target, current + 1);

    const adj = adjacency.get(edge.source) ?? [];
    adj.push(edge.target);
    adjacency.set(edge.source, adj);
  }

  return { nodeMap, inDegree, adjacency };
}

/**
 * Topological sort to get execution order
 */
function getExecutionOrder(nodes: WorkflowNode[], edges: WorkflowEdge[]): string[] {
  const { inDegree, adjacency } = buildDependencyGraph(nodes, edges);

  // Find starting nodes (in-degree 0)
  const queue: string[] = [];
  for (const [nodeId, degree] of inDegree) {
    if (degree === 0) {
      queue.push(nodeId);
    }
  }

  const order: string[] = [];
  const visited = new Set<string>();

  while (queue.length > 0) {
    const nodeId = queue.shift()!;
    if (visited.has(nodeId)) continue;

    visited.add(nodeId);
    order.push(nodeId);

    const neighbors = adjacency.get(nodeId) ?? [];
    for (const neighbor of neighbors) {
      const degree = (inDegree.get(neighbor) ?? 0) - 1;
      inDegree.set(neighbor, degree);
      if (degree === 0) {
        queue.push(neighbor);
      }
    }
  }

  return order;
}

/**
 * Create a reference resolver for a given runtime state
 */
function createReferenceResolver(
  state: WorkflowRuntimeState,
): (ref: OutputSchemaSourceKey) => unknown {
  return (ref: OutputSchemaSourceKey) => {
    const nodeOutput = state.nodeOutputs.get(ref.nodeId);
    if (nodeOutput === undefined) {
      return undefined;
    }

    // Navigate the path
    let value: unknown = nodeOutput;
    for (const key of ref.path) {
      if (value === null || value === undefined) {
        return undefined;
      }
      if (typeof value === "object") {
        value = (value as Record<string, unknown>)[key];
      } else {
        return undefined;
      }
    }

    return value;
  };
}

/**
 * Execute a single node
 */
async function executeNode(
  node: WorkflowNode,
  state: WorkflowRuntimeState,
): Promise<{ output?: unknown; error?: string; branchId?: string }> {
  const startedAt = Date.now();

  try {
    const executor = getExecutor(node.kind as NodeKind);

    // Build node data from config
    const nodeData: WorkflowNodeData = {
      id: node.id,
      name: node.name,
      kind: node.kind as NodeKind,
      description: node.description ?? undefined,
      outputSchema: (node.nodeConfig as Record<string, unknown>)?.outputSchema ?? {
        type: "object",
        properties: {},
        required: [],
      },
      ...(node.nodeConfig as Record<string, unknown>),
    } as WorkflowNodeData;

    const resolveReference = createReferenceResolver(state);

    const ctx: NodeExecutorContext = {
      state,
      node: nodeData,
      resolveReference,
      processMentions: (content) => processTipTapMentions(content, resolveReference),
    };

    const result = await executor(ctx);

    // Record execution
    recordNodeExecution(
      state,
      node.id,
      node.name,
      node.kind as NodeKind,
      {
        input: state.input,
        output: result.output,
        error: result.error,
      },
      startedAt,
    );

    return result;
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);

    recordNodeExecution(
      state,
      node.id,
      node.name,
      node.kind as NodeKind,
      { error: errorMessage },
      startedAt,
    );

    return { error: errorMessage };
  }
}

/**
 * Execute a complete workflow
 */
export async function executeWorkflow(
  workflowId: string,
  nodes: WorkflowNode[],
  edges: WorkflowEdge[],
  inputData: Record<string, unknown> = {},
  context: WorkflowExecutionContext = {},
): Promise<WorkflowExecutionResult> {
  const startedAt = Date.now();
  const state = createRuntimeState(workflowId, inputData, context);

  logger.info("workflow.execute.start", "Starting workflow execution", {
    workflowId,
    nodeCount: nodes.length,
    edgeCount: edges.length,
  });

  try {
    // Get execution order
    const executionOrder = getExecutionOrder(nodes, edges);
    const nodeMap = new Map(nodes.map((n) => [n.id, n]));

    // Build edge map for condition branch handling
    const edgesBySource = new Map<string, WorkflowEdge[]>();
    for (const edge of edges) {
      const existing = edgesBySource.get(edge.source) ?? [];
      existing.push(edge);
      edgesBySource.set(edge.source, existing);
    }

    // Track which branches are active (for condition nodes)
    const skippedNodes = new Set<string>();

    // Execute nodes in order
    for (const nodeId of executionOrder) {
      if (skippedNodes.has(nodeId)) {
        continue;
      }

      const node = nodeMap.get(nodeId);
      if (!node) continue;

      const result = await executeNode(node, state);

      if (result.error) {
        state.error = { nodeId, message: result.error };
        break;
      }

      // Handle condition node branching
      if (node.kind === "condition" && result.branchId) {
        // Mark non-taken branch nodes as skipped
        const outEdges = edgesBySource.get(nodeId) ?? [];
        for (const edge of outEdges) {
          const edgeLabel = (edge.uiConfig as Record<string, unknown>)?.label;
          if (edgeLabel && edgeLabel !== result.branchId) {
            // This edge leads to a branch that wasn't taken
            skippedNodes.add(edge.target);
          }
        }
      }
    }

    const endedAt = Date.now();

    logger.info("workflow.execute.complete", "Workflow execution complete", {
      workflowId,
      status: state.error ? "failed" : "success",
      durationMs: endedAt - startedAt,
    });

    return {
      workflowId,
      status: state.error ? "failed" : "success",
      startedAt,
      endedAt,
      result: state.error ? undefined : state.output,
      error: state.error
        ? { name: "WorkflowExecutionError", message: state.error.message }
        : undefined,
      history: state.history.map((h) => ({
        nodeId: h.nodeId,
        nodeName: h.name,
        kind: h.kind,
        status: h.status === "running" ? "success" : h.status,
        startedAt: h.startedAt,
        endedAt: h.endedAt ?? Date.now(),
        input: h.result?.input,
        output: h.result?.output,
        error: h.error,
      })),
    };
  } catch (error) {
    const endedAt = Date.now();
    const errorMessage = error instanceof Error ? error.message : String(error);

    logger.error(
      error instanceof Error ? error : new Error(errorMessage),
      "workflow.execute.error",
      "Workflow execution failed",
      { workflowId },
    );

    return {
      workflowId,
      status: "failed",
      startedAt,
      endedAt,
      error: { name: "WorkflowExecutionError", message: errorMessage },
      history: state.history.map((h) => ({
        nodeId: h.nodeId,
        nodeName: h.name,
        kind: h.kind,
        status: h.status === "running" ? "success" : h.status,
        startedAt: h.startedAt,
        endedAt: h.endedAt ?? Date.now(),
        input: h.result?.input,
        output: h.result?.output,
        error: h.error,
      })),
    };
  }
}
