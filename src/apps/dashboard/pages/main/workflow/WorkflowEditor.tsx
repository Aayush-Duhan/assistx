import { useState, useEffect, useCallback, useMemo } from "react";
import {
  ReactFlow,
  Background,
  Controls,
  MiniMap,
  addEdge,
  useNodesState,
  useEdgesState,
  type Edge,
  type Connection,
  type NodeTypes,
  type OnNodesChange,
  type OnEdgesChange,
  BackgroundVariant,
  Panel,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import { LuArrowLeft, LuSave, LuPlay, LuPlus, LuRefreshCw } from "react-icons/lu";
import type { WorkflowWithStructure, DBNode, DBEdge } from "@/shared/workflow.types";
import { NodeKind } from "@/shared/workflow.interface";
import WorkflowNodeComponent, { type WorkflowNode, type WorkflowNodeData } from "./WorkflowNode";
import NodeConfigPanel from "./NodeConfigPanel";

// API helpers
const workflowApi = {
  get: async (id: string): Promise<WorkflowWithStructure> => {
    const res = await fetch(`http://localhost:3000/api/workflows/${id}`);
    if (!res.ok) throw new Error("Failed to fetch workflow");
    return res.json();
  },
  saveStructure: async (id: string, nodes: DBNode[], edges: DBEdge[]): Promise<void> => {
    const res = await fetch(`http://localhost:3000/api/workflows/${id}/structure`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ nodes, edges }),
    });
    if (!res.ok) throw new Error("Failed to save workflow");
  },
  execute: async (id: string): Promise<unknown> => {
    const res = await fetch(`http://localhost:3000/api/workflows/${id}/execute`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({}),
    });
    if (!res.ok) throw new Error("Failed to execute workflow");
    return res.json();
  },
};

// Node type config for adding new nodes
const NODE_TYPE_CONFIG: Array<{ kind: NodeKind; label: string; emoji: string; color: string }> = [
  { kind: NodeKind.Input, label: "Input", emoji: "📥", color: "#22c55e" },
  { kind: NodeKind.Output, label: "Output", emoji: "📤", color: "#f97316" },
  { kind: NodeKind.LLM, label: "LLM", emoji: "🤖", color: "#8b5cf6" },
  { kind: NodeKind.Condition, label: "Condition", emoji: "🔀", color: "#eab308" },
  { kind: NodeKind.Tool, label: "Tool", emoji: "🔧", color: "#06b6d4" },
  { kind: NodeKind.Http, label: "HTTP", emoji: "🌐", color: "#ec4899" },
  { kind: NodeKind.Template, label: "Template", emoji: "📝", color: "#64748b" },
  { kind: NodeKind.Note, label: "Note", emoji: "📌", color: "#a1a1aa" },
];

// Layout constants for new node positioning
const NEW_NODE_BASE_X = 250;
const NEW_NODE_BASE_Y = 100;
const NEW_NODE_VERTICAL_SPACING = 100;

// Directional transformers: DB format <-> ReactFlow format
const dbNodeToRFNode = (dbNode: DBNode): WorkflowNode => ({
  id: dbNode.id,
  type: "workflowNode",
  position: dbNode.uiConfig.position ?? { x: 100, y: 100 },
  data: {
    kind: dbNode.kind,
    name: dbNode.name,
    description: dbNode.description,
    nodeConfig: dbNode.nodeConfig,
  },
});

const rfNodeToDBNode = (rfNode: WorkflowNode, workflowId: string): DBNode => ({
  id: rfNode.id,
  workflowId,
  kind: rfNode.data.kind as NodeKind,
  name: rfNode.data.name as string,
  description: rfNode.data.description as string | undefined,
  nodeConfig: rfNode.data.nodeConfig as Record<string, unknown>,
  uiConfig: { position: rfNode.position },
  createdAt: new Date(),
  updatedAt: new Date(),
});

const dbEdgeToRFEdge = (dbEdge: DBEdge): Edge => {
  const uiConfig = (dbEdge.uiConfig ?? {}) as Record<string, unknown>;
  return {
    id: dbEdge.id,
    source: dbEdge.source,
    target: dbEdge.target,
    sourceHandle: uiConfig.sourceHandle as string | undefined,
    targetHandle: uiConfig.targetHandle as string | undefined,
    label: uiConfig.label as string | undefined,
    animated: true,
    style: { stroke: "#525252" },
  };
};

const rfEdgeToDBEdge = (rfEdge: Edge, workflowId: string): DBEdge => ({
  id: rfEdge.id,
  workflowId,
  source: rfEdge.source,
  target: rfEdge.target,
  uiConfig: {
    sourceHandle: rfEdge.sourceHandle ?? undefined,
    targetHandle: rfEdge.targetHandle ?? undefined,
    label: typeof rfEdge.label === "string" ? rfEdge.label : undefined,
  },
  createdAt: new Date(),
});

interface WorkflowEditorProps {
  workflowId: string;
  onClose: () => void;
}

const WorkflowEditor = ({ workflowId, onClose }: WorkflowEditorProps) => {
  const [workflow, setWorkflow] = useState<WorkflowWithStructure | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isRunning, setIsRunning] = useState(false);
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  const [showNodePicker, setShowNodePicker] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);

  // ReactFlow state
  const [nodes, setNodes, onNodesChange] = useNodesState<WorkflowNode>([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState<Edge>([]);

  // Custom node types
  const nodeTypes: NodeTypes = useMemo(
    () => ({
      workflowNode: WorkflowNodeComponent,
    }),
    [],
  );

  // Load workflow
  useEffect(() => {
    const load = async () => {
      try {
        const data = await workflowApi.get(workflowId);
        setWorkflow(data);

        // Convert DB format to ReactFlow format
        const rfNodes: WorkflowNode[] = (data.nodes || []).map(dbNodeToRFNode);
        const rfEdges: Edge[] = (data.edges || []).map(dbEdgeToRFEdge);

        setNodes(rfNodes);
        setEdges(rfEdges);
      } catch (err) {
        console.error("Failed to load workflow:", err);
      } finally {
        setIsLoading(false);
      }
    };
    load();
  }, [workflowId, setNodes, setEdges]);

  // Handle edge connections
  const onConnect = useCallback(
    (connection: Connection) => {
      setEdges((eds) => addEdge({ ...connection, animated: true }, eds));
      setHasChanges(true);
    },
    [setEdges],
  );

  // Mark changes
  const handleNodesChange: OnNodesChange<WorkflowNode> = useCallback(
    (changes) => {
      onNodesChange(changes);
      setHasChanges(true);
    },
    [onNodesChange],
  );

  const handleEdgesChange: OnEdgesChange<Edge> = useCallback(
    (changes) => {
      onEdgesChange(changes);
      setHasChanges(true);
    },
    [onEdgesChange],
  );

  // Add new node
  const addNode = (kind: NodeKind) => {
    const config = NODE_TYPE_CONFIG.find((c) => c.kind === kind)!;
    const id = `node_${Date.now()}`;
    const newNode: WorkflowNode = {
      id,
      type: "workflowNode",
      position: {
        x: NEW_NODE_BASE_X,
        y: NEW_NODE_BASE_Y + nodes.length * NEW_NODE_VERTICAL_SPACING,
      },
      data: {
        kind,
        name: `New ${config.label}`,
        description: "",
        nodeConfig: {},
      },
    };
    setNodes((nds) => [...nds, newNode]);
    setShowNodePicker(false);
    setSelectedNodeId(id);
    setHasChanges(true);
  };

  // Save workflow
  const handleSave = async () => {
    if (!workflow) return;
    setIsSaving(true);
    try {
      // Convert ReactFlow format back to DB format
      const dbNodes: DBNode[] = nodes.map((n) => rfNodeToDBNode(n, workflow.id));
      const dbEdges: DBEdge[] = edges.map((e) => rfEdgeToDBEdge(e, workflow.id));

      await workflowApi.saveStructure(workflow.id, dbNodes, dbEdges);
      setHasChanges(false);
    } catch (err) {
      console.error("Failed to save:", err);
    } finally {
      setIsSaving(false);
    }
  };

  // Run workflow
  const handleRun = async () => {
    if (!workflow) return;
    setIsRunning(true);
    try {
      const result = await workflowApi.execute(workflow.id);
      console.log("Execution result:", result);
    } catch (err) {
      console.error("Execution failed:", err);
    } finally {
      setIsRunning(false);
    }
  };

  // Update node data
  const updateNodeData = useCallback(
    (nodeId: string, data: Partial<WorkflowNodeData>) => {
      setNodes((nds) =>
        nds.map((n) => (n.id === nodeId ? { ...n, data: { ...n.data, ...data } } : n)),
      );
      setHasChanges(true);
    },
    [setNodes],
  );

  // Delete selected node
  const deleteSelectedNode = useCallback(() => {
    if (!selectedNodeId) return;
    setNodes((nds) => nds.filter((n) => n.id !== selectedNodeId));
    setEdges((eds) =>
      eds.filter((e) => e.source !== selectedNodeId && e.target !== selectedNodeId),
    );
    setSelectedNodeId(null);
    setHasChanges(true);
  }, [selectedNodeId, setNodes, setEdges]);

  // Get selected node
  const selectedNode = nodes.find((n) => n.id === selectedNodeId);

  if (isLoading) {
    return (
      <div className="h-full flex items-center justify-center text-zinc-500">
        <LuRefreshCw className="w-5 h-5 animate-spin mr-2" />
        Loading Editor...
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col -m-6">
      {/* Top Bar */}
      <div className="h-12 px-4 flex items-center justify-between border-b border-zinc-800 bg-zinc-900/50">
        <div className="flex items-center gap-3">
          <button
            onClick={onClose}
            className="p-2 rounded-md text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800 transition-all"
          >
            <LuArrowLeft className="w-4 h-4" />
          </button>
          <span className="text-sm font-medium text-zinc-200">
            {workflow?.name || "Workflow Editor"}
          </span>
          {hasChanges && (
            <span className="text-[10px] bg-amber-500/20 text-amber-400 px-1.5 py-0.5 rounded">
              Unsaved
            </span>
          )}
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handleRun}
            disabled={isRunning || nodes.length === 0}
            className="h-8 px-3 rounded-lg text-sm font-medium text-emerald-400 hover:bg-emerald-500/10 transition-all flex items-center gap-2 disabled:opacity-50"
          >
            {isRunning ? (
              <LuRefreshCw className="w-4 h-4 animate-spin" />
            ) : (
              <LuPlay className="w-4 h-4" />
            )}
            Run
          </button>
          <button
            onClick={handleSave}
            disabled={isSaving || !hasChanges}
            className="h-8 px-3 rounded-lg text-sm font-medium bg-white text-black hover:bg-zinc-200 disabled:opacity-50 transition-all flex items-center gap-2"
          >
            {isSaving ? (
              <LuRefreshCw className="w-4 h-4 animate-spin" />
            ) : (
              <LuSave className="w-4 h-4" />
            )}
            Save
          </button>
        </div>
      </div>

      {/* Main Editor */}
      <div className="flex-1 flex min-h-0">
        {/* Canvas */}
        <div className="flex-1 relative">
          <ReactFlow
            nodes={nodes}
            edges={edges}
            onNodesChange={handleNodesChange}
            onEdgesChange={handleEdgesChange}
            onConnect={onConnect}
            nodeTypes={nodeTypes}
            onNodeClick={(_, node) => setSelectedNodeId(node.id)}
            onPaneClick={() => setSelectedNodeId(null)}
            fitView
            proOptions={{ hideAttribution: true }}
            defaultEdgeOptions={{
              animated: true,
              style: { stroke: "#525252", strokeWidth: 2 },
            }}
          >
            <Background variant={BackgroundVariant.Dots} gap={20} size={1} color="#333" />
            <Controls className="!bg-zinc-900 !border-zinc-700 !rounded-lg [&>button]:!bg-zinc-800 [&>button]:!border-zinc-700 [&>button]:!text-zinc-400 [&>button:hover]:!bg-zinc-700" />
            <MiniMap
              className="!bg-zinc-900 !border-zinc-700 !rounded-lg"
              nodeColor="#525252"
              maskColor="rgba(0,0,0,0.5)"
            />

            {/* Add Node Panel */}
            <Panel position="top-left" className="m-2">
              <div className="relative">
                <button
                  onClick={() => setShowNodePicker(!showNodePicker)}
                  className="h-9 px-3 rounded-lg text-sm font-medium bg-zinc-800 text-zinc-300 hover:bg-zinc-700 border border-zinc-700 transition-all flex items-center gap-2"
                >
                  <LuPlus className="w-4 h-4" />
                  Add Node
                </button>

                {showNodePicker && (
                  <div className="absolute top-full left-0 mt-2 w-48 bg-zinc-900 border border-zinc-700 rounded-lg shadow-xl p-2 z-10">
                    {NODE_TYPE_CONFIG.map((config) => (
                      <button
                        key={config.kind}
                        onClick={() => addNode(config.kind)}
                        className="w-full px-3 py-2 text-left text-sm rounded-md hover:bg-zinc-800 transition-colors flex items-center gap-2"
                      >
                        <span>{config.emoji}</span>
                        <span className="text-zinc-300">{config.label}</span>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </Panel>
          </ReactFlow>
        </div>

        {/* Config Panel */}
        {selectedNode && (
          <NodeConfigPanel
            node={selectedNode}
            onUpdate={(data: Partial<WorkflowNodeData>) => updateNodeData(selectedNode.id, data)}
            onDelete={deleteSelectedNode}
            onClose={() => setSelectedNodeId(null)}
          />
        )}
      </div>
    </div>
  );
};

export default WorkflowEditor;
