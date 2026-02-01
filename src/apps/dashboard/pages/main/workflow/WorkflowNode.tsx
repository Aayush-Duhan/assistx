import { memo, type ReactNode } from "react";
import { Handle, Position, type Node } from "@xyflow/react";
import {
  LuArrowDownToLine,
  LuArrowUpFromLine,
  LuBot,
  LuSplit,
  LuWrench,
  LuGlobe,
  LuFileText,
  LuStickyNote,
} from "react-icons/lu";
import { cn } from "@/lib/utils";
import { NodeKind } from "@/shared/workflow.interface";

// Node data type - same as in WorkflowEditor
// Index signature required by ReactFlow's Node type
interface WorkflowNodeData extends Record<string, unknown> {
  kind: NodeKind;
  name: string;
  description?: string;
  nodeConfig: Record<string, unknown>;
}

// Full node type
type WorkflowNode = Node<WorkflowNodeData>;

// Props for the custom node component
interface WorkflowNodeProps {
  data: WorkflowNodeData;
  selected?: boolean;
}

// Node icon mapping
const NODE_ICONS: Record<NodeKind, ReactNode> = {
  [NodeKind.Input]: <LuArrowDownToLine className="w-4 h-4" />,
  [NodeKind.Output]: <LuArrowUpFromLine className="w-4 h-4" />,
  [NodeKind.LLM]: <LuBot className="w-4 h-4" />,
  [NodeKind.Condition]: <LuSplit className="w-4 h-4" />,
  [NodeKind.Tool]: <LuWrench className="w-4 h-4" />,
  [NodeKind.Http]: <LuGlobe className="w-4 h-4" />,
  [NodeKind.Template]: <LuFileText className="w-4 h-4" />,
  [NodeKind.Note]: <LuStickyNote className="w-4 h-4" />,
};

// Node colors
const NODE_COLORS: Record<NodeKind, { bg: string; border: string; icon: string }> = {
  [NodeKind.Input]: {
    bg: "bg-emerald-500/10",
    border: "border-emerald-500/30",
    icon: "text-emerald-500",
  },
  [NodeKind.Output]: {
    bg: "bg-orange-500/10",
    border: "border-orange-500/30",
    icon: "text-orange-500",
  },
  [NodeKind.LLM]: {
    bg: "bg-violet-500/10",
    border: "border-violet-500/30",
    icon: "text-violet-500",
  },
  [NodeKind.Condition]: {
    bg: "bg-yellow-500/10",
    border: "border-yellow-500/30",
    icon: "text-yellow-500",
  },
  [NodeKind.Tool]: { bg: "bg-cyan-500/10", border: "border-cyan-500/30", icon: "text-cyan-500" },
  [NodeKind.Http]: { bg: "bg-pink-500/10", border: "border-pink-500/30", icon: "text-pink-500" },
  [NodeKind.Template]: {
    bg: "bg-slate-500/10",
    border: "border-slate-500/30",
    icon: "text-slate-400",
  },
  [NodeKind.Note]: { bg: "bg-zinc-500/10", border: "border-zinc-500/30", icon: "text-zinc-400" },
};

// Node label mapping
const NODE_LABELS: Record<NodeKind, string> = {
  [NodeKind.Input]: "Input",
  [NodeKind.Output]: "Output",
  [NodeKind.LLM]: "LLM",
  [NodeKind.Condition]: "Condition",
  [NodeKind.Tool]: "Tool",
  [NodeKind.Http]: "HTTP",
  [NodeKind.Template]: "Template",
  [NodeKind.Note]: "Note",
};

// Helper to safely extract typed properties from data
type NodeConfig = Record<string, unknown>;

const getStringConfigValue = (config: NodeConfig, key: string) => {
  const value = config[key];
  return typeof value === "string" ? value : undefined;
};

const getModelLabel = (config: NodeConfig) => {
  const value = config.model;
  if (typeof value === "string") {
    return value;
  }
  if (value && typeof value === "object") {
    const provider = (value as { provider?: unknown }).provider;
    const modelId = (value as { modelId?: unknown }).modelId;
    if (typeof provider === "string" && typeof modelId === "string") {
      return `${provider}/${modelId}`;
    }
  }
  return undefined;
};

const getToolName = (config: NodeConfig) => {
  const toolKey = config.toolKey;
  if (typeof toolKey === "string") {
    return toolKey;
  }

  if (toolKey && typeof toolKey === "object" && "name" in toolKey) {
    const name = (toolKey as { name?: unknown }).name;
    return typeof name === "string" ? name : undefined;
  }

  return undefined;
};

const getNodeDisplayData = (data: WorkflowNodeProps["data"]) => {
  return {
    kind: (data.kind ?? NodeKind.Note) as NodeKind,
    name: typeof data.name === "string" ? data.name : "",
    description: typeof data.description === "string" ? data.description : undefined,
    nodeConfig: (data.nodeConfig ?? {}) as NodeConfig,
  };
};

// Get node styling with fallback to Note type for unknown kinds
const getNodeStyle = (kind: NodeKind) => {
  return {
    colors: NODE_COLORS[kind] ?? NODE_COLORS[NodeKind.Note],
    icon: NODE_ICONS[kind] ?? NODE_ICONS[NodeKind.Note],
    label: NODE_LABELS[kind] ?? "Node",
  };
};

const WorkflowNodeComponent = memo(({ data, selected }: WorkflowNodeProps) => {
  const { kind, name, description, nodeConfig } = getNodeDisplayData(data);
  const model = getModelLabel(nodeConfig);
  const url = getStringConfigValue(nodeConfig, "url");
  const method = getStringConfigValue(nodeConfig, "method");
  const toolName = getToolName(nodeConfig);
  const { colors, icon, label } = getNodeStyle(kind);

  // Determine handles based on node type
  const showTopHandle = kind !== NodeKind.Input;
  const showBottomHandle = kind !== NodeKind.Output && kind !== NodeKind.Note;

  // Condition nodes have multiple output handles
  const isCondition = kind === NodeKind.Condition;

  return (
    <div
      className={cn(
        "min-w-[180px] rounded-xl border-2 transition-all duration-150",
        colors.bg,
        colors.border,
        selected && "ring-2 ring-blue-500 ring-offset-2 ring-offset-zinc-900",
      )}
    >
      {/* Input Handle */}
      {showTopHandle && (
        <Handle
          type="target"
          position={Position.Top}
          className="!w-3 !h-3 !bg-zinc-600 !border-2 !border-zinc-400 hover:!bg-blue-500 hover:!border-blue-400 transition-colors"
        />
      )}

      {/* Node Content */}
      <div className="p-3">
        {/* Header */}
        <div className="flex items-center gap-2 mb-1">
          <div className={cn("p-1.5 rounded-md", colors.bg, colors.icon)}>{icon}</div>
          <div className="flex-1 min-w-0">
            <div className="text-xs font-medium text-zinc-300 truncate">
              {name || `Untitled ${label}`}
            </div>
            <div className="text-[10px] text-zinc-500">{label}</div>
          </div>
        </div>

        {/* Description */}
        {description && (
          <p className="text-[10px] text-zinc-500 mt-1 line-clamp-2">{description}</p>
        )}

        {/* Config Preview */}
        {kind === NodeKind.LLM && model && (
          <div className="mt-2 text-[10px] bg-black/20 rounded px-2 py-1 text-zinc-400 truncate">
            Model: {model}
          </div>
        )}
        {kind === NodeKind.Tool && toolName && (
          <div className="mt-2 text-[10px] bg-black/20 rounded px-2 py-1 text-zinc-400 truncate">
            Tool: {toolName}
          </div>
        )}
        {kind === NodeKind.Http && url && (
          <div className="mt-2 text-[10px] bg-black/20 rounded px-2 py-1 text-zinc-400 truncate">
            {method ?? "GET"}: {url}
          </div>
        )}
      </div>

      {/* Output Handle(s) */}
      {showBottomHandle && !isCondition && (
        <Handle
          type="source"
          position={Position.Bottom}
          className="!w-3 !h-3 !bg-zinc-600 !border-2 !border-zinc-400 hover:!bg-blue-500 hover:!border-blue-400 transition-colors"
        />
      )}

      {/* Condition node has multiple outputs */}
      {isCondition && (
        <>
          <Handle
            type="source"
            position={Position.Bottom}
            id="true"
            className="!w-3 !h-3 !bg-emerald-600 !border-2 !border-emerald-400 hover:!bg-emerald-500 transition-colors"
            style={{ left: "30%" }}
          />
          <Handle
            type="source"
            position={Position.Bottom}
            id="false"
            className="!w-3 !h-3 !bg-red-600 !border-2 !border-red-400 hover:!bg-red-500 transition-colors"
            style={{ left: "70%" }}
          />
          <div className="flex justify-between px-4 pb-2 text-[9px] text-zinc-500">
            <span>True</span>
            <span>False</span>
          </div>
        </>
      )}
    </div>
  );
});

WorkflowNodeComponent.displayName = "WorkflowNodeComponent";

export default WorkflowNodeComponent;
export type { WorkflowNode, WorkflowNodeData };
