import { useState, useEffect } from "react";
import { LuX, LuTrash2, LuChevronDown, LuChevronUp } from "react-icons/lu";
import { modelsApi } from "@/lib/api";
import { NodeKind } from "@/shared/workflow.interface";
import type { WorkflowNode, WorkflowNodeData } from "./WorkflowNode";

interface NodeConfigPanelProps {
    node: WorkflowNode;
    onUpdate: (data: Partial<WorkflowNodeData>) => void;
    onDelete: () => void;
    onClose: () => void;
}

// Node kind labels
const KIND_LABELS: Record<NodeKind, string> = {
    [NodeKind.Input]: "Input Node",
    [NodeKind.Output]: "Output Node",
    [NodeKind.LLM]: "LLM Node",
    [NodeKind.Condition]: "Condition Node",
    [NodeKind.Tool]: "Tool Node",
    [NodeKind.Http]: "HTTP Request Node",
    [NodeKind.Template]: "Template Node",
    [NodeKind.Note]: "Note Node",
};

const NodeConfigPanel = ({ node, onUpdate, onDelete, onClose }: NodeConfigPanelProps) => {
    const [showAdvanced, setShowAdvanced] = useState(false);
    const kind = node.data.kind as NodeKind;
    const nodeConfig = (node.data.nodeConfig || {}) as Record<string, unknown>;
    const [availableModels, setAvailableModels] = useState<
        Array<{
            value: string;
            label: string;
            providerId: string;
            modelId: string;
        }>
    >([]);
    const [isModelsLoading, setIsModelsLoading] = useState(false);

    // Local state for JSON text fields (allows typing even when invalid JSON)
    const [schemaText, setSchemaText] = useState("");
    const [headersText, setHeadersText] = useState("");
    const [advancedText, setAdvancedText] = useState("");

    // Sync local state when node changes
    useEffect(() => {
        setSchemaText(
            typeof nodeConfig.inputSchema === "object"
                ? JSON.stringify(nodeConfig.inputSchema, null, 2)
                : ""
        );
        setHeadersText(
            typeof nodeConfig.headers === "object"
                ? JSON.stringify(nodeConfig.headers, null, 2)
                : ""
        );
        setAdvancedText(JSON.stringify(nodeConfig, null, 2));
    }, [node.id]); // Only reset when switching nodes

    useEffect(() => {
        if (kind !== NodeKind.LLM) return;
        let isMounted = true;
        const loadModels = async () => {
            setIsModelsLoading(true);
            try {
                const providers = await modelsApi.list();
                if (!isMounted) return;
                const flattened = providers.flatMap((provider) => {
                    const models = [...provider.builtInModels, ...provider.customModels];
                    return models
                        .filter((model) => model.isEnabled !== false)
                        .map((model) => ({
                            value: `${model.providerId}/${model.modelId}`,
                            label: `${provider.displayName} • ${model.displayName}`,
                            providerId: model.providerId,
                            modelId: model.modelId,
                        }));
                });
                setAvailableModels(flattened);
            } catch (error) {
                console.error("Failed to load models:", error);
                setAvailableModels([]);
            } finally {
                if (isMounted) setIsModelsLoading(false);
            }
        };
        loadModels();
        return () => {
            isMounted = false;
        };
    }, [kind]);

    const updateConfig = (key: string, value: unknown) => {
        onUpdate({
            nodeConfig: { ...nodeConfig, [key]: value },
        });
    };

    const getSelectedModelValue = () => {
        const model = nodeConfig.model;
        if (typeof model === "string") return model;
        if (model && typeof model === "object") {
            const provider = (model as { provider?: unknown }).provider;
            const modelId = (model as { modelId?: unknown }).modelId;
            if (typeof provider === "string" && typeof modelId === "string") {
                return `${provider}/${modelId}`;
            }
        }
        return "";
    };

    // Factory for JSON blur handlers - prevents copy-paste errors
    const createJsonBlurHandler = (
        getText: () => string,
        onValid: (parsed: unknown) => void
    ) => {
        return () => {
            try {
                const text = getText().trim();
                if (!text) return;
                onValid(JSON.parse(text));
            } catch {
                // Keep local state, don't save invalid JSON
            }
        };
    };


    const handleSchemaBlur = createJsonBlurHandler(
        () => schemaText,
        (parsed) => updateConfig("inputSchema", parsed)
    );

    const handleHeadersBlur = createJsonBlurHandler(
        () => headersText,
        (parsed) => updateConfig("headers", parsed)
    );

    const handleAdvancedBlur = createJsonBlurHandler(
        () => advancedText,
        (parsed) => onUpdate({ nodeConfig: parsed as Record<string, unknown> })
    );

    return (
        <div className="w-80 border-l border-zinc-800 bg-zinc-900/50 flex flex-col">
            {/* Header */}
            <div className="h-12 px-4 flex items-center justify-between border-b border-zinc-800">
                <span className="text-sm font-medium text-zinc-200">
                    {KIND_LABELS[kind] || "Node Config"}
                </span>
                <button
                    onClick={onClose}
                    className="p-1 text-zinc-500 hover:text-zinc-300 transition-colors"
                >
                    <LuX className="w-4 h-4" />
                </button>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
                {/* Basic Info */}
                <div>
                    <label className="block text-xs font-medium text-zinc-400 mb-1.5">Name</label>
                    <input
                        type="text"
                        value={String(node.data.name || "")}
                        onChange={(e) => onUpdate({ name: e.target.value })}
                        className="w-full h-9 px-3 rounded-lg text-sm bg-zinc-800 border border-zinc-700 text-zinc-300 focus:outline-none focus:ring-1 focus:ring-zinc-600"
                    />
                </div>

                <div>
                    <label className="block text-xs font-medium text-zinc-400 mb-1.5">Description</label>
                    <textarea
                        value={String(node.data.description || "")}
                        onChange={(e) => onUpdate({ description: e.target.value })}
                        rows={2}
                        className="w-full px-3 py-2 rounded-lg text-sm bg-zinc-800 border border-zinc-700 text-zinc-300 focus:outline-none focus:ring-1 focus:ring-zinc-600 resize-none"
                        placeholder="What does this node do?"
                    />
                </div>

                {/* Node-specific config */}
                {kind === NodeKind.Input && (
                    <div className="space-y-4 pt-2 border-t border-zinc-800">
                        <h4 className="text-xs font-medium text-zinc-300">Input Configuration</h4>
                        <div>
                            <label className="block text-xs font-medium text-zinc-400 mb-1.5">
                                Schema (JSON)
                            </label>
                            <textarea
                                value={schemaText}
                                onChange={(e) => setSchemaText(e.target.value)}
                                onBlur={handleSchemaBlur}
                                rows={4}
                                className="w-full px-3 py-2 rounded-lg text-xs font-mono bg-zinc-800 border border-zinc-700 text-zinc-300 focus:outline-none focus:ring-1 focus:ring-zinc-600 resize-none"
                                placeholder='{ "type": "object", "properties": {} }'
                            />
                        </div>
                    </div>
                )}

                {kind === NodeKind.LLM && (
                    <div className="space-y-4 pt-2 border-t border-zinc-800">
                        <h4 className="text-xs font-medium text-zinc-300">LLM Configuration</h4>
                        <div>
                            <label className="block text-xs font-medium text-zinc-400 mb-1.5">Model</label>
                            <select
                                value={getSelectedModelValue()}
                                onChange={(e) => {
                                    const selected = availableModels.find((m) => m.value === e.target.value);
                                    if (!selected) {
                                        updateConfig("model", "");
                                        return;
                                    }
                                    updateConfig("model", {
                                        provider: selected.providerId,
                                        modelId: selected.modelId,
                                    });
                                }}
                                className="w-full h-9 px-3 rounded-lg text-sm bg-zinc-800 border border-zinc-700 text-zinc-300 focus:outline-none focus:ring-1 focus:ring-zinc-600"
                                disabled={isModelsLoading}
                            >
                                <option value="">
                                    {isModelsLoading ? "Loading models..." : "Select a model..."}
                                </option>
                                {availableModels.map((model) => (
                                    <option key={model.value} value={model.value}>
                                        {model.label}
                                    </option>
                                ))}
                            </select>
                        </div>
                        <div>
                            <label className="block text-xs font-medium text-zinc-400 mb-1.5">
                                System Prompt
                            </label>
                            <textarea
                                value={String(nodeConfig.systemPrompt || "")}
                                onChange={(e) => updateConfig("systemPrompt", e.target.value)}
                                rows={4}
                                className="w-full px-3 py-2 rounded-lg text-sm bg-zinc-800 border border-zinc-700 text-zinc-300 focus:outline-none focus:ring-1 focus:ring-zinc-600 resize-none"
                                placeholder="You are a helpful assistant..."
                            />
                        </div>
                        <div>
                            <label className="block text-xs font-medium text-zinc-400 mb-1.5">
                                Temperature
                            </label>
                            <input
                                type="number"
                                min="0"
                                max="2"
                                step="0.1"
                                value={Number(nodeConfig.temperature) || 0.7}
                                onChange={(e) => updateConfig("temperature", parseFloat(e.target.value))}
                                className="w-full h-9 px-3 rounded-lg text-sm bg-zinc-800 border border-zinc-700 text-zinc-300 focus:outline-none focus:ring-1 focus:ring-zinc-600"
                            />
                        </div>
                    </div>
                )}

                {kind === NodeKind.Http && (
                    <div className="space-y-4 pt-2 border-t border-zinc-800">
                        <h4 className="text-xs font-medium text-zinc-300">HTTP Configuration</h4>
                        <div>
                            <label className="block text-xs font-medium text-zinc-400 mb-1.5">Method</label>
                            <select
                                value={String(nodeConfig.method || "GET")}
                                onChange={(e) => updateConfig("method", e.target.value)}
                                className="w-full h-9 px-3 rounded-lg text-sm bg-zinc-800 border border-zinc-700 text-zinc-300 focus:outline-none focus:ring-1 focus:ring-zinc-600"
                            >
                                <option value="GET">GET</option>
                                <option value="POST">POST</option>
                                <option value="PUT">PUT</option>
                                <option value="DELETE">DELETE</option>
                                <option value="PATCH">PATCH</option>
                            </select>
                        </div>
                        <div>
                            <label className="block text-xs font-medium text-zinc-400 mb-1.5">URL</label>
                            <input
                                type="text"
                                value={String(nodeConfig.url || "")}
                                onChange={(e) => updateConfig("url", e.target.value)}
                                className="w-full h-9 px-3 rounded-lg text-sm bg-zinc-800 border border-zinc-700 text-zinc-300 focus:outline-none focus:ring-1 focus:ring-zinc-600"
                                placeholder="https://api.example.com/endpoint"
                            />
                        </div>
                        <div>
                            <label className="block text-xs font-medium text-zinc-400 mb-1.5">
                                Headers (JSON)
                            </label>
                            <textarea
                                value={headersText}
                                onChange={(e) => setHeadersText(e.target.value)}
                                onBlur={handleHeadersBlur}
                                rows={3}
                                className="w-full px-3 py-2 rounded-lg text-xs font-mono bg-zinc-800 border border-zinc-700 text-zinc-300 focus:outline-none focus:ring-1 focus:ring-zinc-600 resize-none"
                                placeholder='{ "Authorization": "Bearer ..." }'
                            />
                        </div>
                    </div>
                )}

                {kind === NodeKind.Template && (
                    <div className="space-y-4 pt-2 border-t border-zinc-800">
                        <h4 className="text-xs font-medium text-zinc-300">Template Configuration</h4>
                        <div>
                            <label className="block text-xs font-medium text-zinc-400 mb-1.5">
                                Template
                            </label>
                            <textarea
                                value={String(nodeConfig.template || "")}
                                onChange={(e) => updateConfig("template", e.target.value)}
                                rows={6}
                                className="w-full px-3 py-2 rounded-lg text-sm bg-zinc-800 border border-zinc-700 text-zinc-300 focus:outline-none focus:ring-1 focus:ring-zinc-600 resize-none font-mono"
                                placeholder="Hello {{name}}, your order {{orderId}} is ready."
                            />
                            <p className="text-[10px] text-zinc-500 mt-1">
                                Use {"{{variable}}"} syntax to reference input data
                            </p>
                        </div>
                    </div>
                )}

                {kind === NodeKind.Condition && (
                    <div className="space-y-4 pt-2 border-t border-zinc-800">
                        <h4 className="text-xs font-medium text-zinc-300">Condition Configuration</h4>
                        <p className="text-xs text-zinc-500">
                            Define branches in the advanced JSON config below. Each branch can have multiple conditions.
                        </p>
                    </div>
                )}

                {kind === NodeKind.Note && (
                    <div className="space-y-4 pt-2 border-t border-zinc-800">
                        <h4 className="text-xs font-medium text-zinc-300">Note Content</h4>
                        <div>
                            <textarea
                                value={String(nodeConfig.content || "")}
                                onChange={(e) => updateConfig("content", e.target.value)}
                                rows={6}
                                className="w-full px-3 py-2 rounded-lg text-sm bg-zinc-800 border border-zinc-700 text-zinc-300 focus:outline-none focus:ring-1 focus:ring-zinc-600 resize-none"
                                placeholder="Add notes about this part of the workflow..."
                            />
                        </div>
                    </div>
                )}

                {/* Advanced Config */}
                <div className="pt-2 border-t border-zinc-800">
                    <button
                        onClick={() => setShowAdvanced(!showAdvanced)}
                        className="w-full flex items-center justify-between text-xs text-zinc-400 hover:text-zinc-300 transition-colors"
                    >
                        <span>Advanced Configuration</span>
                        {showAdvanced ? <LuChevronUp className="w-4 h-4" /> : <LuChevronDown className="w-4 h-4" />}
                    </button>

                    {showAdvanced && (
                        <div className="mt-3">
                            <textarea
                                value={advancedText}
                                onChange={(e) => setAdvancedText(e.target.value)}
                                onBlur={handleAdvancedBlur}
                                rows={8}
                                className="w-full px-3 py-2 rounded-lg text-xs font-mono bg-zinc-800 border border-zinc-700 text-zinc-300 focus:outline-none focus:ring-1 focus:ring-zinc-600 resize-none"
                            />
                        </div>
                    )}
                </div>
            </div>

            {/* Footer */}
            <div className="p-4 border-t border-zinc-800">
                <button
                    onClick={onDelete}
                    className="w-full h-9 rounded-lg text-sm font-medium text-red-400 hover:bg-red-500/10 transition-all flex items-center justify-center gap-2"
                >
                    <LuTrash2 className="w-4 h-4" />
                    Delete Node
                </button>
            </div>
        </div>
    );
};

export default NodeConfigPanel;
