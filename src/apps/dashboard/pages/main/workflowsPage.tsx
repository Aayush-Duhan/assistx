import React, { useState, useEffect, useCallback, useRef, type ChangeEvent } from "react";
import {
  LuPlus,
  LuRefreshCw,
  LuSearch,
  LuPlay,
  LuPencil,
  LuTrash2,
  LuGlobe,
  LuArrowRightLeft,
  LuCheck,
  LuX,
  LuUpload,
} from "react-icons/lu";
import { cn } from "@/lib/utils";
import type {
  WorkflowSummary,
  WorkflowIcon,
  CreateWorkflowRequest,
  DBNode,
  DBEdge,
  WorkflowWithStructure,
} from "@/shared/workflow.types";
import WorkflowEditor from "./workflow/WorkflowEditor";

// API helpers
const workflowsApi = {
  list: async (): Promise<WorkflowSummary[]> => {
    const res = await fetch("http://localhost:3000/api/workflows");
    if (!res.ok) throw new Error("Failed to fetch workflows");
    return res.json();
  },
  get: async (id: string): Promise<WorkflowWithStructure> => {
    const res = await fetch(`http://localhost:3000/api/workflows/${id}`);
    if (!res.ok) throw new Error("Failed to fetch workflow");
    return res.json();
  },
  create: async (data: CreateWorkflowRequest): Promise<{ id: string }> => {
    const res = await fetch("http://localhost:3000/api/workflows", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
    if (!res.ok) throw new Error("Failed to create workflow");
    return res.json();
  },
  delete: async (id: string): Promise<void> => {
    const res = await fetch(`http://localhost:3000/api/workflows/${id}`, {
      method: "DELETE",
    });
    if (!res.ok) throw new Error("Failed to delete workflow");
  },
  togglePublish: async (id: string, isPublished: boolean): Promise<void> => {
    const res = await fetch(`http://localhost:3000/api/workflows/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ isPublished }),
    });
    if (!res.ok) throw new Error("Failed to update workflow");
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
  saveStructure: async (
    id: string,
    payload: {
      nodes: DBNode[];
      edges: DBEdge[];
      deleteNodes?: string[];
      deleteEdges?: string[];
    }
  ): Promise<void> => {
    const res = await fetch(`http://localhost:3000/api/workflows/${id}/structure`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    if (!res.ok) throw new Error("Failed to save workflow structure");
  },
};

const generateImportId = () => {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }
  return `import_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;
};

// ============================================================================
// Import Helpers
// ============================================================================

interface ImportFileData {
  workflowMeta: { name: string; description?: string; icon?: WorkflowIcon };
  nodes: unknown[];
  edges: unknown[];
}

const validateImportFile = (data: unknown): ImportFileData | null => {
  if (!data || typeof data !== "object") return null;

  const workflowMeta =
    (data as { workflow?: unknown }).workflow &&
    typeof (data as { workflow: unknown }).workflow === "object"
      ? (data as { workflow: { name: string; description?: string; icon?: WorkflowIcon } }).workflow
      : (data as { name: string; description?: string; icon?: WorkflowIcon });

  if (!workflowMeta?.name || !Array.isArray((data as { nodes?: unknown }).nodes) || !Array.isArray((data as { edges?: unknown }).edges)) {
    return null;
  }

  const importedName = String(workflowMeta.name).trim();
  if (!importedName) return null;

  return {
    workflowMeta: { ...workflowMeta, name: importedName },
    nodes: (data as { nodes: unknown[] }).nodes,
    edges: (data as { edges: unknown[] }).edges,
  };
};

const transformImportedNodes = (
  nodes: unknown[],
  workflowId: string,
  nodeIdMap: Map<string, string>
): DBNode[] => {
  return nodes.map((n) => {
    const originalId = typeof (n as { id?: unknown }).id === "string" ? (n as { id: string }).id : generateImportId();
    const newId = generateImportId();
    nodeIdMap.set(originalId, newId);

    const uiConfig =
      (n as { uiConfig?: unknown }).uiConfig && typeof (n as { uiConfig: unknown }).uiConfig === "object"
        ? { ...(n as { uiConfig: Record<string, unknown> }).uiConfig }
        : {};

    if (!uiConfig.position && (n as { position?: unknown }).position && typeof (n as { position: unknown }).position === "object") {
      uiConfig.position = (n as { position: { x: number; y: number } }).position;
    }

    let nodeConfig =
      (n as { nodeConfig?: unknown }).nodeConfig && typeof (n as { nodeConfig: unknown }).nodeConfig === "object"
        ? { ...(n as { nodeConfig: Record<string, unknown> }).nodeConfig }
        : {};

    if (Array.isArray((nodeConfig as { outputData?: unknown }).outputData)) {
      const outputData = (nodeConfig as { outputData: Array<{ source?: { nodeId?: string } }> }).outputData.map((item) => {
        if (item && typeof item === "object" && item.source && typeof item.source === "object") {
          const sourceNodeId = item.source.nodeId;
          if (typeof sourceNodeId === "string" && nodeIdMap.has(sourceNodeId)) {
            return { ...item, source: { ...item.source, nodeId: nodeIdMap.get(sourceNodeId) } };
          }
        }
        return item;
      });
      nodeConfig = { ...nodeConfig, outputData };
    }

    return { ...(n as Record<string, unknown>), id: newId, workflowId, nodeConfig, uiConfig } as DBNode;
  });
};

const transformImportedEdges = (
  edges: unknown[],
  workflowId: string,
  nodeIdMap: Map<string, string>
): DBEdge[] => {
  return edges.map((edge) => {
    const sourceId = typeof (edge as { source?: unknown }).source === "string" ? (edge as { source: string }).source : "";
    const targetId = typeof (edge as { target?: unknown }).target === "string" ? (edge as { target: string }).target : "";
    const uiConfig =
      (edge as { uiConfig?: unknown }).uiConfig && typeof (edge as { uiConfig: unknown }).uiConfig === "object"
        ? (edge as { uiConfig: Record<string, unknown> }).uiConfig
        : {};

    return {
      ...(edge as Record<string, unknown>),
      id: generateImportId(),
      workflowId,
      source: nodeIdMap.get(sourceId) ?? sourceId,
      target: nodeIdMap.get(targetId) ?? targetId,
      uiConfig,
    } as DBEdge;
  });
};

// Background colors for workflow icons
const BG_COLORS = [
  "oklch(87% 0 0)",
  "oklch(20.5% 0 0)",
  "oklch(80.8% 0.114 19.571)",
  "oklch(83.7% 0.128 66.29)",
  "oklch(84.5% 0.143 164.978)",
  "oklch(82.8% 0.111 230.318)",
  "oklch(78.5% 0.115 274.713)",
  "oklch(81% 0.117 11.638)",
];

const DEFAULT_ICON: WorkflowIcon = {
  type: "emoji",
  value: "🔄",
  style: { backgroundColor: BG_COLORS[5] },
};

// Lightweight Modal wrapper - handles overlay and container structure
interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  children: React.ReactNode;
  maxWidth?: string;
  className?: string;
}

const Modal = ({ isOpen, onClose, children, maxWidth = "max-w-md", className = "" }: ModalProps) => {
  if (!isOpen) return null;
  const containerClasses = className || `w-full ${maxWidth} bg-[#111] border border-zinc-800 rounded-xl p-6 shadow-xl`;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div className={`relative z-10 ${containerClasses}`}>
        {children}
      </div>
    </div>
  );
};

// Workflow Card Component
const WorkflowCard = ({
  workflow,
  onEdit,
  onDelete,
  onRun,
  onTogglePublish,
}: {
  workflow: WorkflowSummary;
  onEdit: () => void;
  onDelete: () => void;
  onRun: () => void;
  onTogglePublish: () => void;
}) => {
  const [isRunning, setIsRunning] = useState(false);

  const handleRun = async () => {
    setIsRunning(true);
    try {
      await onRun();
    } finally {
      setIsRunning(false);
    }
  };

  return (
    <div
      className={cn(
        "p-4 rounded-xl border transition-all duration-200 group",
        workflow.isPublished
          ? "bg-zinc-900/30 border-emerald-500/20"
          : "bg-zinc-900/20 border-zinc-800/50 hover:border-zinc-700/50"
      )}
    >
      {/* Card Header */}
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-3">
          <div
            className="w-10 h-10 rounded-lg flex items-center justify-center text-lg"
            style={{ backgroundColor: workflow.icon?.style?.backgroundColor || BG_COLORS[5] }}
          >
            {workflow.icon?.value || "🔄"}
          </div>
          <div>
            <span className="text-sm font-medium text-zinc-200">{workflow.name}</span>
            {workflow.isPublished && (
              <span className="ml-2 text-[10px] bg-emerald-500/20 text-emerald-400 px-1.5 py-0.5 rounded-full">
                Published
              </span>
            )}
            <p className="text-xs text-zinc-500 mt-0.5 line-clamp-1">
              {workflow.description || "No description"}
            </p>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-1 opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity">
          <button
            onClick={handleRun}
            disabled={isRunning}
            className="p-2 rounded-md text-emerald-500 hover:bg-emerald-500/10 transition-all disabled:opacity-50"
            title="Run workflow"
          >
            {isRunning ? (
              <LuRefreshCw className="w-4 h-4 animate-spin" />
            ) : (
              <LuPlay className="w-4 h-4" />
            )}
          </button>
          <button
            onClick={onEdit}
            className="p-2 rounded-md text-zinc-500 hover:text-zinc-300 hover:bg-zinc-800 transition-all"
            title="Edit workflow"
          >
            <LuPencil className="w-4 h-4" />
          </button>
          <button
            onClick={onTogglePublish}
            className={cn(
              "p-2 rounded-md transition-all",
              workflow.isPublished
                ? "text-emerald-500 hover:bg-emerald-500/10"
                : "text-zinc-500 hover:text-zinc-300 hover:bg-zinc-800"
            )}
            title={workflow.isPublished ? "Unpublish" : "Publish as AI tool"}
          >
            <LuGlobe className="w-4 h-4" />
          </button>
          <button
            onClick={onDelete}
            className="p-2 rounded-md text-zinc-500 hover:text-red-400 hover:bg-red-500/10 transition-all"
            title="Delete workflow"
          >
            <LuTrash2 className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Footer */}
      <div className="pt-2 border-t border-white/5 flex items-center justify-between">
        <span className="text-[10px] text-zinc-500">
          Updated {new Date(workflow.updatedAt).toLocaleDateString()}
        </span>
        <button
          onClick={onEdit}
          className="text-xs text-blue-400 hover:text-blue-300 transition-colors"
        >
          Open Editor →
        </button>
      </div>
    </div>
  );
};

// Main Page Component
const WorkflowsPage = () => {
  const [workflows, setWorkflows] = useState<WorkflowSummary[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [editingWorkflowId, setEditingWorkflowId] = useState<string | null>(null);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);

  // Create form state
  const [newName, setNewName] = useState("");
  const [newDescription, setNewDescription] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const fetchWorkflows = useCallback(async () => {
    try {
      const data = await workflowsApi.list();
      setWorkflows(data);
    } catch (err) {
      console.error("Failed to fetch workflows:", err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchWorkflows();
  }, [fetchWorkflows]);

  const handleCreate = async () => {
    if (!newName.trim()) return;
    setIsSaving(true);
    try {
      const result = await workflowsApi.create({
        name: newName.trim(),
        description: newDescription.trim() || undefined,
        icon: DEFAULT_ICON,
      });
      setNewName("");
      setNewDescription("");
      setIsCreateDialogOpen(false);
      // Open editor for new workflow
      setEditingWorkflowId(result.id);
      fetchWorkflows();
    } catch (err) {
      console.error("Failed to create workflow:", err);
    } finally {
      setIsSaving(false);
    }
  };

  const handleImport = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      // 1. Parse and validate file
      const text = await file.text();
      const parsedData = JSON.parse(text);
      const validated = validateImportFile(parsedData);

      if (!validated) {
        alert("Invalid workflow file format. Must contain name, nodes, and edges.");
        return;
      }

      // 2. Create workflow
      const result = await workflowsApi.create({
        name: `${validated.workflowMeta.name} (Imported)`,
        description: validated.workflowMeta.description,
        icon: validated.workflowMeta.icon || DEFAULT_ICON,
      });

      // 3. Get existing structure for deletion
      const existing = await workflowsApi.get(result.id);
      const deleteNodes = existing.nodes.map((n) => n.id);
      const deleteEdges = existing.edges.map((e) => e.id);

      // 4. Transform imported data
      const nodeIdMap = new Map<string, string>();
      const nodes = transformImportedNodes(validated.nodes, result.id, nodeIdMap);
      const edges = transformImportedEdges(validated.edges, result.id, nodeIdMap);

      // 5. Save structure
      await workflowsApi.saveStructure(result.id, {
        nodes,
        edges,
        deleteNodes,
        deleteEdges,
      });

      await fetchWorkflows();
      setEditingWorkflowId(result.id);
    } catch (err) {
      console.error("Import failed:", err);
      alert("Failed to import workflow");
    } finally {
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const handleDelete = async () => {
    if (!deleteConfirmId) return;
    try {
      await workflowsApi.delete(deleteConfirmId);
      setWorkflows((prev) => prev.filter((w) => w.id !== deleteConfirmId));
    } catch (err) {
      console.error("Failed to delete workflow:", err);
    }
    setDeleteConfirmId(null);
  };

  const handleTogglePublish = async (id: string, currentState: boolean) => {
    try {
      await workflowsApi.togglePublish(id, !currentState);
      setWorkflows((prev) =>
        prev.map((w) => (w.id === id ? { ...w, isPublished: !currentState } : w))
      );
    } catch (err) {
      console.error("Failed to toggle publish:", err);
    }
  };

  const handleRun = async (id: string) => {
    try {
      const result = await workflowsApi.execute(id);
      console.log("Workflow executed:", result);
      // TODO: Show result in a toast or modal
    } catch (err) {
      console.error("Workflow execution failed:", err);
    }
  };

  // Filter workflows
  const filteredWorkflows = workflows.filter((w) => {
    if (!searchQuery) return true;
    const query = searchQuery.toLowerCase();
    return (
      w.name.toLowerCase().includes(query) ||
      w.description?.toLowerCase().includes(query)
    );
  });

  // If editing a workflow, show the editor
  if (editingWorkflowId) {
    return (
      <WorkflowEditor
        workflowId={editingWorkflowId}
        onClose={() => {
          setEditingWorkflowId(null);
          fetchWorkflows();
        }}
      />
    );
  }

  if (isLoading) {
    return (
      <div className="h-full flex items-center justify-center text-zinc-500">
        <LuRefreshCw className="w-5 h-5 animate-spin mr-2" />
        Loading Workflows...
      </div>
    );
  }

  return (
    <div className="pb-8">
      {/* Header */}
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-zinc-100">Workflows</h1>
          <p className="text-sm text-zinc-500">
            Build and automate multi-step AI workflows
          </p>
        </div>
        <div className="flex items-center gap-2">
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleImport}
            className="hidden"
            accept=".json"
          />
          <button
            onClick={() => fileInputRef.current?.click()}
            className="h-9 px-3 rounded-lg text-sm font-medium text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800 transition-all flex items-center gap-2"
          >
            <LuUpload className="w-4 h-4" />
            Import
          </button>
          <button
            onClick={() => setIsCreateDialogOpen(true)}
            className="h-9 px-4 rounded-lg text-sm font-medium transition-all flex items-center gap-2 bg-white text-black hover:bg-zinc-200"
          >
            <LuPlus className="w-4 h-4" />
            New Workflow
          </button>
        </div>
      </div>

      {/* Search */}
      <div className="relative mb-6">
        <LuSearch className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Search workflows..."
          className="w-full h-10 pl-10 pr-4 rounded-lg text-sm bg-zinc-900/50 border border-zinc-800 text-zinc-300 placeholder-zinc-600 focus:outline-none focus:ring-1 focus:ring-zinc-600 transition-all"
        />
      </div>

      {/* Empty State */}
      {workflows.length === 0 && (
        <div className="border border-dashed border-zinc-800 rounded-xl p-12 flex flex-col items-center justify-center text-center">
          <div className="w-12 h-12 rounded-full bg-zinc-900 flex items-center justify-center mb-4 text-zinc-400">
            <LuArrowRightLeft className="w-6 h-6" />
          </div>
          <h3 className="font-semibold text-zinc-100 mb-1">No Workflows Yet</h3>
          <p className="text-sm text-zinc-500 max-w-xs mb-6">
            Create visual workflows to automate multi-step AI tasks. Workflows can be published as tools for the AI agent.
          </p>
          <button
            onClick={() => setIsCreateDialogOpen(true)}
            className="h-9 px-4 rounded-lg text-sm font-medium border border-zinc-700 text-zinc-300 hover:bg-zinc-800 hover:text-white transition-all flex items-center gap-2"
          >
            <LuPlus className="w-4 h-4" />
            Create Your First Workflow
          </button>
        </div>
      )}

      {/* Workflow Grid */}
      {filteredWorkflows.length > 0 && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {filteredWorkflows.map((workflow) => (
            <WorkflowCard
              key={workflow.id}
              workflow={workflow}
              onEdit={() => setEditingWorkflowId(workflow.id)}
              onDelete={() => setDeleteConfirmId(workflow.id)}
              onRun={() => handleRun(workflow.id)}
              onTogglePublish={() => handleTogglePublish(workflow.id, workflow.isPublished)}
            />
          ))}
        </div>
      )}

      {/* Create Dialog */}
      <Modal isOpen={isCreateDialogOpen} onClose={() => setIsCreateDialogOpen(false)} maxWidth="max-w-md">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-zinc-100">New Workflow</h2>
          <button
            onClick={() => setIsCreateDialogOpen(false)}
            className="p-1 text-zinc-500 hover:text-zinc-300"
          >
            <LuX className="w-5 h-5" />
          </button>
        </div>
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-zinc-400 mb-1.5">Workflow Name</label>
            <input
              type="text"
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              placeholder="e.g., Email Summarizer"
              className="w-full h-10 px-3 rounded-lg text-sm bg-zinc-950/50 border border-zinc-800 text-zinc-300 placeholder-zinc-600 focus:outline-none focus:ring-1 focus:ring-zinc-600"
              autoFocus
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-zinc-400 mb-1.5">Description (optional)</label>
            <textarea
              value={newDescription}
              onChange={(e) => setNewDescription(e.target.value)}
              placeholder="What does this workflow do?"
              rows={3}
              className="w-full px-3 py-2 rounded-lg text-sm bg-zinc-950/50 border border-zinc-800 text-zinc-300 placeholder-zinc-600 focus:outline-none focus:ring-1 focus:ring-zinc-600 resize-none"
            />
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <button
              onClick={() => setIsCreateDialogOpen(false)}
              className="h-9 px-4 rounded-lg text-sm font-medium text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800 transition-all"
            >
              Cancel
            </button>
            <button
              onClick={handleCreate}
              disabled={isSaving || !newName.trim()}
              className="h-9 px-4 rounded-lg text-sm font-medium bg-white text-black hover:bg-zinc-200 disabled:opacity-50 transition-all flex items-center gap-2"
            >
              {isSaving ? <LuRefreshCw className="w-4 h-4 animate-spin" /> : <LuCheck className="w-4 h-4" />}
              Create
            </button>
          </div>
        </div>
      </Modal>

      {/* Delete Confirmation */}
      <Modal
        isOpen={!!deleteConfirmId}
        onClose={() => setDeleteConfirmId(null)}
        className="w-full max-w-sm mx-4 p-5 rounded-2xl bg-zinc-900 border border-zinc-700/50 shadow-2xl"
      >
        <div className="flex items-center gap-3 mb-4">
          <div className="p-2.5 rounded-lg bg-red-500/20 text-red-400">
            <LuTrash2 className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-base font-semibold text-zinc-100">Delete Workflow?</h3>
            <p className="text-xs text-zinc-500 mt-0.5">This action cannot be undone</p>
          </div>
        </div>
        <p className="text-sm text-zinc-400 mb-5">
          Are you sure you want to delete this workflow? All nodes and connections will be permanently removed.
        </p>
        <div className="flex justify-end gap-2">
          <button
            onClick={() => setDeleteConfirmId(null)}
            className="px-4 py-2 rounded-lg text-sm font-medium text-zinc-400 hover:text-zinc-300 hover:bg-zinc-800 transition-all"
          >
            Cancel
          </button>
          <button
            onClick={handleDelete}
            className="px-4 py-2 rounded-lg text-sm font-medium bg-red-600 text-white hover:bg-red-500 transition-all flex items-center gap-2"
          >
            <LuTrash2 className="w-4 h-4" />
            Delete
          </button>
        </div>
      </Modal>
    </div>
  );
};

export default WorkflowsPage;
