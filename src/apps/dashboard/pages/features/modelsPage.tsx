import { useState, useEffect } from 'react';
import { LuPlus, LuTrash2, LuX, LuCheck, LuChevronDown } from 'react-icons/lu';
import { FiEdit } from "react-icons/fi";
import { cn } from '@/lib/utils';
import { ModelProviderIcon } from '@/components/ui/model-provider-icon';

// Built-in models from the app (mirroring models.ts structure for display)
const BUILT_IN_MODELS: Record<string, string[]> = {
    openai: ['gpt-4.1', 'gpt-4.1-mini', 'o4-mini', 'o3', 'gpt-5', 'gpt-5-mini', 'gpt-5-nano'],
    google: ['gemini-2.5-flash-lite', 'gemini-2.5-flash', 'gemini-2.5-pro'],
    anthropic: ['claude-4-sonnet', 'claude-4-opus', 'claude-3-7-sonnet'],
    xai: ['grok-4', 'grok-3', 'grok-3-mini'],
    groq: ['kimi-k2-instruct', 'llama-4-scout-17b', 'gpt-oss-20b', 'gpt-oss-120b', 'qwen3-32b'],
    openRouter: ['qwen3-coder:free', 'deepseek-v3:free'],
};

const PROVIDERS = [
    { id: 'openai', name: 'OpenAI' },
    { id: 'google', name: 'Google Gemini' },
    { id: 'anthropic', name: 'Anthropic' },
    { id: 'xai', name: 'xAI' },
    { id: 'groq', name: 'Groq' },
    { id: 'openRouter', name: 'OpenRouter' },
];

interface CustomModel {
    id: string;
    name: string;
    provider: string;
    modelId: string;
}

const ModelsPage = () => {
    const [customModels, setCustomModels] = useState<CustomModel[]>([]);
    const [isAddingModel, setIsAddingModel] = useState(false);
    const [editingModelId, setEditingModelId] = useState<string | null>(null);
    const [addingToProvider, setAddingToProvider] = useState<string | null>(null);

    // Form state
    const [formName, setFormName] = useState('');
    const [formProvider, setFormProvider] = useState('openai');
    const [formModelId, setFormModelId] = useState('');
    const [showProviderDropdown, setShowProviderDropdown] = useState(false);

    // Load custom models from localStorage
    useEffect(() => {
        try {
            const saved = localStorage.getItem('assistx_custom_models');
            if (saved) {
                setCustomModels(JSON.parse(saved));
            }
        } catch (e) {
            console.error('Failed to load custom models:', e);
        }
    }, []);

    // Save custom models to localStorage
    const saveCustomModels = (models: CustomModel[]) => {
        localStorage.setItem('assistx_custom_models', JSON.stringify(models));
        setCustomModels(models);
    };

    const resetForm = () => {
        setFormName('');
        setFormProvider('openai');
        setFormModelId('');
        setIsAddingModel(false);
        setEditingModelId(null);
        setAddingToProvider(null);
    };

    const handleAddModel = () => {
        if (!formName.trim() || !formModelId.trim()) return;

        const newModel: CustomModel = {
            id: Date.now().toString(),
            name: formName.trim(),
            provider: formProvider,
            modelId: formModelId.trim(),
        };

        saveCustomModels([...customModels, newModel]);
        resetForm();
    };

    const handleUpdateModel = () => {
        if (!formName.trim() || !formModelId.trim() || !editingModelId) return;

        const updated = customModels.map(m =>
            m.id === editingModelId
                ? { ...m, name: formName.trim(), provider: formProvider, modelId: formModelId.trim() }
                : m
        );

        saveCustomModels(updated);
        resetForm();
    };

    const handleDeleteModel = (id: string) => {
        saveCustomModels(customModels.filter(m => m.id !== id));
    };

    const startEditing = (model: CustomModel) => {
        setFormName(model.name);
        setFormProvider(model.provider);
        setFormModelId(model.modelId);
        setEditingModelId(model.id);
        setIsAddingModel(true);
        setAddingToProvider(null);
    };

    const startAddingToProvider = (providerId: string) => {
        setFormProvider(providerId);
        setAddingToProvider(providerId);
        setIsAddingModel(true);
    };

    const getProviderName = (id: string) => {
        return PROVIDERS.find(p => p.id === id)?.name || id;
    };

    // Get custom models for a specific provider
    const getCustomModelsForProvider = (providerId: string) => {
        return customModels.filter(m => m.provider === providerId);
    };

    // Check if provider has API key configured
    const checkApiKeyConfigured = (providerId: string) => {
        try {
            const saved = localStorage.getItem('assistx_api_keys');
            if (saved) {
                const keys = JSON.parse(saved);
                return !!keys[providerId];
            }
        } catch (e) {
            console.error('Failed to check API keys:', e);
        }
        return false;
    };

    return (
        <div className="pb-8">
            {/* Header Section */}
            <div className="flex items-center justify-between mb-6">
                <div>
                    <h1 className="text-xl font-semibold text-zinc-100">Models</h1>
                    <p className="text-sm text-zinc-500">Browse available models and create custom configurations</p>
                </div>
                {!isAddingModel && (
                    <button
                        onClick={() => setIsAddingModel(true)}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-zinc-300 bg-zinc-800 hover:bg-zinc-700 border border-zinc-700 transition-all duration-150"
                    >
                        <LuPlus className="w-3.5 h-3.5" />
                        Add Custom Model
                    </button>
                )}
            </div>

            {/* Modal for Add/Edit Custom Model */}
            {isAddingModel && (
                <div className="fixed inset-0 z-50 flex items-center justify-center">
                    {/* Backdrop */}
                    <div
                        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
                        onClick={resetForm}
                    />

                    {/* Modal Content */}
                    <div className="relative z-10 w-full max-w-lg mx-4 p-5 rounded-2xl bg-zinc-900 border border-zinc-700/50 shadow-2xl">
                        <div className="flex items-center justify-between mb-5">
                            <span className="text-base font-semibold text-zinc-100">
                                {editingModelId ? 'Edit Custom Model' : 'Add Custom Model'}
                            </span>
                            <button
                                onClick={resetForm}
                                className="p-1.5 rounded-lg text-zinc-500 hover:text-zinc-300 hover:bg-zinc-800 transition-all duration-150"
                            >
                                <LuX className="w-5 h-5" />
                            </button>
                        </div>

                        <div className="space-y-4 mb-5">
                            {/* Model Name */}
                            <div>
                                <label className="block text-xs text-zinc-400 mb-1.5">Display Name</label>
                                <input
                                    type="text"
                                    value={formName}
                                    onChange={(e) => setFormName(e.target.value)}
                                    placeholder="My Custom Model"
                                    className="w-full h-10 px-3 rounded-lg text-sm bg-zinc-950 border border-zinc-800 text-zinc-300 placeholder-zinc-600 focus:outline-none focus:ring-1 focus:ring-zinc-600 focus:border-zinc-600 transition-all duration-150"
                                    autoFocus
                                />
                            </div>

                            {/* Provider Dropdown */}
                            <div className="relative">
                                <label className="block text-xs text-zinc-400 mb-1.5">Provider</label>
                                <button
                                    type="button"
                                    onClick={() => setShowProviderDropdown(!showProviderDropdown)}
                                    disabled={!!addingToProvider}
                                    className={cn(
                                        "w-full h-10 px-3 rounded-lg text-sm bg-zinc-950 border border-zinc-800 text-zinc-300 focus:outline-none focus:ring-1 focus:ring-zinc-600 focus:border-zinc-600 transition-all duration-150 flex items-center justify-between",
                                        addingToProvider && "opacity-60 cursor-not-allowed"
                                    )}
                                >
                                    <div className="flex items-center gap-2">
                                        <ModelProviderIcon provider={formProvider} className="w-4 h-4" />
                                        <span>{getProviderName(formProvider)}</span>
                                    </div>
                                    {!addingToProvider && (
                                        <LuChevronDown className={cn("w-4 h-4 text-zinc-500 transition-transform", showProviderDropdown && "rotate-180")} />
                                    )}
                                </button>
                                {showProviderDropdown && !addingToProvider && (
                                    <div className="absolute z-10 mt-1 w-full bg-zinc-900 border border-zinc-700 rounded-lg shadow-xl overflow-hidden">
                                        {PROVIDERS.map(provider => (
                                            <button
                                                key={provider.id}
                                                onClick={() => {
                                                    setFormProvider(provider.id);
                                                    setShowProviderDropdown(false);
                                                }}
                                                className={cn(
                                                    "w-full px-3 py-2.5 text-sm text-left flex items-center gap-2 hover:bg-zinc-800 transition-colors",
                                                    formProvider === provider.id && "bg-zinc-800"
                                                )}
                                            >
                                                <ModelProviderIcon provider={provider.id} className="w-4 h-4" />
                                                <span className="text-zinc-300">{provider.name}</span>
                                                {formProvider === provider.id && (
                                                    <LuCheck className="w-4 h-4 ml-auto text-emerald-400" />
                                                )}
                                            </button>
                                        ))}
                                    </div>
                                )}
                            </div>

                            {/* Model ID */}
                            <div>
                                <label className="block text-xs text-zinc-400 mb-1.5">Model ID</label>
                                <input
                                    type="text"
                                    value={formModelId}
                                    onChange={(e) => setFormModelId(e.target.value)}
                                    placeholder="gpt-4-turbo-preview"
                                    className="w-full h-10 px-3 rounded-lg text-sm font-mono bg-zinc-950 border border-zinc-800 text-zinc-300 placeholder-zinc-600 focus:outline-none focus:ring-1 focus:ring-zinc-600 focus:border-zinc-600 transition-all duration-150"
                                />
                            </div>
                        </div>

                        <div className="flex justify-end gap-2 pt-2 border-t border-zinc-800">
                            <button
                                onClick={resetForm}
                                className="px-4 py-2 rounded-lg text-sm font-medium text-zinc-400 hover:text-zinc-300 hover:bg-zinc-800 transition-all duration-150"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={editingModelId ? handleUpdateModel : handleAddModel}
                                disabled={!formName.trim() || !formModelId.trim()}
                                className={cn(
                                    "px-4 py-2 rounded-lg text-sm font-medium flex items-center gap-2 transition-all duration-150",
                                    formName.trim() && formModelId.trim()
                                        ? "bg-blue-600 text-white hover:bg-blue-500"
                                        : "bg-zinc-800 text-zinc-600 cursor-not-allowed"
                                )}
                            >
                                <LuCheck className="w-4 h-4" />
                                {editingModelId ? 'Update' : 'Add Model'}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Models Grid - Built-in + Custom merged */}
            <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-4">
                {PROVIDERS.map(({ id: providerId, name: providerName }) => {
                    const builtInModels = BUILT_IN_MODELS[providerId] || [];
                    const providerCustomModels = getCustomModelsForProvider(providerId);
                    const hasApiKey = checkApiKeyConfigured(providerId);

                    return (
                        <div
                            key={providerId}
                            className={cn(
                                "p-4 rounded-xl border transition-all duration-200",
                                hasApiKey
                                    ? "bg-zinc-900/30 border-zinc-700/50"
                                    : "bg-zinc-900/20 border-zinc-800/50"
                            )}
                        >
                            {/* Provider Header */}
                            <div className="flex items-center gap-2 mb-3 pb-2 border-b border-zinc-800/50">
                                <ModelProviderIcon provider={providerId} className="w-4 h-4" />
                                <span className="text-sm font-medium text-zinc-200">{providerName}</span>
                                {hasApiKey ? (
                                    <span className="ml-auto inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium uppercase tracking-wide bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                                        Active
                                    </span>
                                ) : (
                                    <span className="ml-auto inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium uppercase tracking-wide bg-zinc-800/50 text-zinc-500 border border-zinc-700/30">
                                        No Key
                                    </span>
                                )}
                            </div>

                            {/* Models List */}
                            <div className="space-y-1.5">
                                {/* Built-in models */}
                                {builtInModels.map(model => (
                                    <div
                                        key={model}
                                        className={cn(
                                            "px-2.5 py-1.5 rounded-lg text-xs font-mono transition-colors",
                                            hasApiKey
                                                ? "bg-zinc-800/40 text-zinc-300"
                                                : "bg-zinc-900/40 text-zinc-500"
                                        )}
                                    >
                                        {model}
                                    </div>
                                ))}

                                {/* Custom models for this provider */}
                                {providerCustomModels.map(model => (
                                    <div
                                        key={model.id}
                                        className={cn(
                                            "px-2.5 py-1.5 rounded-lg text-xs font-mono transition-colors flex items-center justify-between group",
                                            hasApiKey
                                                ? "bg-zinc-800/40 text-zinc-300"
                                                : "bg-zinc-900/40 text-zinc-500"
                                        )}
                                    >
                                        <div className="flex items-center gap-2 min-w-0">
                                            <span className="truncate">{model.name}</span>
                                            <span className="text-[10px] text-zinc-500 truncate">({model.modelId})</span>
                                            <span className="text-[9px] text-zinc-600 px-1 py-0.5 rounded bg-zinc-800/50">custom</span>
                                        </div>
                                        <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0 ml-2">
                                            <button
                                                onClick={() => startEditing(model)}
                                                className="p-1 rounded text-zinc-500 hover:text-zinc-300 hover:bg-zinc-700 transition-all"
                                                title="Edit model"
                                            >
                                                <FiEdit className="w-3 h-3" />
                                            </button>
                                            <button
                                                onClick={() => handleDeleteModel(model.id)}
                                                className="p-1 rounded text-zinc-500 hover:text-red-400 hover:bg-red-500/20 transition-all"
                                                title="Delete model"
                                            >
                                                <LuTrash2 className="w-3 h-3" />
                                            </button>
                                        </div>
                                    </div>
                                ))}
                            </div>

                            {/* Add custom model button for this provider */}
                            {!isAddingModel && (
                                <button
                                    onClick={() => startAddingToProvider(providerId)}
                                    className="mt-3 w-full flex items-center justify-center gap-1.5 px-2.5 py-1.5 rounded-lg text-[11px] font-medium text-zinc-500 hover:text-zinc-400 bg-zinc-800/20 hover:bg-zinc-800/40 border border-dashed border-zinc-700/30 hover:border-zinc-600/50 transition-all duration-150"
                                >
                                    <LuPlus className="w-3 h-3" />
                                    Add custom model
                                </button>
                            )}
                        </div>
                    );
                })}
            </div>
        </div>
    );
};

export default ModelsPage;