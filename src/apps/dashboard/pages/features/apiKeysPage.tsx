import { useState, useEffect } from 'react';
import { LuEye, LuEyeOff, LuCheck, LuX, LuExternalLink, LuClipboardPaste } from 'react-icons/lu';
import { cn } from '@/lib/utils';
import { ModelProviderIcon } from '@/components/ui/model-provider-icon';

const PROVIDERS = [
    { id: 'openai', name: 'OpenAI', docsUrl: 'https://platform.openai.com/api-keys', placeholder: 'sk-...' },
    { id: 'google', name: 'Google Gemini', docsUrl: 'https://aistudio.google.com/apikey', placeholder: 'AIza...' },
    { id: 'anthropic', name: 'Anthropic', docsUrl: 'https://console.anthropic.com/settings/keys', placeholder: 'sk-ant-...' },
    { id: 'xai', name: 'xAI', docsUrl: 'https://console.x.ai', placeholder: 'xai-...' },
    { id: 'groq', name: 'Groq', docsUrl: 'https://console.groq.com/keys', placeholder: 'gsk_...' },
    { id: 'openrouter', name: 'OpenRouter', docsUrl: 'https://openrouter.ai/keys', placeholder: 'sk-or-...' }
];

interface ApiKeyState {
    value: string;
    isVisible: boolean;
    isConfigured: boolean;
}

const ApiKeysPage = () => {
    const [apiKeys, setApiKeys] = useState<Record<string, ApiKeyState>>(() => {
        const initial: Record<string, ApiKeyState> = {};
        PROVIDERS.forEach(p => {
            initial[p.id] = { value: '', isVisible: false, isConfigured: false };
        });
        return initial;
    });

    useEffect(() => {
        try {
            const saved = localStorage.getItem('assistx_api_keys');
            if (saved) {
                const parsed = JSON.parse(saved);
                setApiKeys(prev => {
                    const updated = { ...prev };
                    Object.keys(parsed).forEach(key => {
                        if (updated[key]) {
                            updated[key] = {
                                ...updated[key],
                                value: parsed[key] || '',
                                isConfigured: !!parsed[key]
                            };
                        }
                    });
                    return updated;
                });
            }
        } catch (e) {
            console.error('Failed to load API keys:', e);
        }
    }, []);

    const handleChange = (id: string, value: string) => {
        setApiKeys(prev => ({ ...prev, [id]: { ...prev[id], value } }));
    };

    const toggleVisibility = (id: string) => {
        setApiKeys(prev => ({ ...prev, [id]: { ...prev[id], isVisible: !prev[id].isVisible } }));
    };

    const handlePaste = async (id: string) => {
        try {
            const text = await navigator.clipboard.readText();
            setApiKeys(prev => ({ ...prev, [id]: { ...prev[id], value: text } }));
        } catch (e) {
            console.error('Failed to paste from clipboard:', e);
        }
    };

    const save = (id: string) => {
        const saved = JSON.parse(localStorage.getItem('assistx_api_keys') || '{}');
        saved[id] = apiKeys[id].value;
        localStorage.setItem('assistx_api_keys', JSON.stringify(saved));
        setApiKeys(prev => ({ ...prev, [id]: { ...prev[id], isConfigured: !!prev[id].value } }));
    };

    const clear = (id: string) => {
        const saved = JSON.parse(localStorage.getItem('assistx_api_keys') || '{}');
        delete saved[id];
        localStorage.setItem('assistx_api_keys', JSON.stringify(saved));
        setApiKeys(prev => ({ ...prev, [id]: { value: '', isVisible: false, isConfigured: false } }));
    };



    return (
        <div className="pb-8">
            {/* Header Section */}
            <div className="mb-6">
                <h1 className="text-xl font-semibold text-zinc-100">API Keys</h1>
                <p className="text-sm text-zinc-500">Configure your LLM provider credentials</p>
            </div>

            {/* Provider Cards - Two Column Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                {PROVIDERS.map(provider => {
                    const state = apiKeys[provider.id];
                    return (
                        <div
                            key={provider.id}
                            className={cn(
                                "p-4 rounded-xl border transition-all duration-200",
                                state.isConfigured
                                    ? "bg-zinc-900/30 border-zinc-700/50"
                                    : "bg-zinc-900/20 border-zinc-800/50 hover:border-zinc-700/50"
                            )}
                        >
                            {/* Card Header */}
                            <div className="flex items-center justify-between mb-3">
                                <div className="flex items-center gap-3">
                                    <ModelProviderIcon provider={provider.id} className="w-5 h-5" />
                                    <span className="text-sm font-medium text-zinc-200">{provider.name}</span>
                                    {state.isConfigured ? (
                                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium uppercase tracking-wide bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                                            Active
                                        </span>
                                    ) : (
                                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium uppercase tracking-wide bg-zinc-800/50 text-zinc-500 border border-zinc-700/30">
                                            Not set
                                        </span>
                                    )}
                                </div>
                                <a
                                    href={provider.docsUrl}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium text-blue-400 hover:text-blue-300 hover:bg-blue-500/10 transition-all duration-150"
                                >
                                    <LuExternalLink className="w-3 h-3" />
                                    Get key
                                </a>
                            </div>

                            {/* Input Row */}
                            <div className="flex items-center gap-2">
                                <div className="relative flex-1">
                                    <input
                                        type={state.isVisible ? 'text' : 'password'}
                                        value={state.value}
                                        onChange={(e) => handleChange(provider.id, e.target.value)}
                                        placeholder={provider.placeholder}
                                        className={cn(
                                            "w-full h-10 px-3 pr-20 rounded-lg text-sm font-mono transition-all duration-150",
                                            "bg-zinc-950/50 border text-zinc-300 placeholder-zinc-600",
                                            "focus:outline-none focus:ring-1 focus:ring-zinc-600 focus:border-zinc-600",
                                            state.isConfigured
                                                ? "border-zinc-700/50"
                                                : "border-zinc-800"
                                        )}
                                    />
                                    <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-0.5">
                                        <button
                                            onClick={() => handlePaste(provider.id)}
                                            className="p-1.5 rounded-md text-zinc-500 hover:text-zinc-300 hover:bg-zinc-800 transition-all duration-150"
                                            title="Paste from clipboard"
                                        >
                                            <LuClipboardPaste className="w-4 h-4" />
                                        </button>
                                        <button
                                            onClick={() => toggleVisibility(provider.id)}
                                            className="p-1.5 rounded-md text-zinc-500 hover:text-zinc-300 hover:bg-zinc-800 transition-all duration-150"
                                            title={state.isVisible ? "Hide key" : "Show key"}
                                        >
                                            {state.isVisible ? <LuEyeOff className="w-4 h-4" /> : <LuEye className="w-4 h-4" />}
                                        </button>
                                    </div>
                                </div>

                                {/* Save Button */}
                                <button
                                    onClick={() => save(provider.id)}
                                    disabled={!state.value}
                                    className={cn(
                                        "h-10 px-4 rounded-lg text-sm font-medium transition-all duration-150 flex items-center gap-2",
                                        state.value
                                            ? "bg-zinc-800 text-zinc-200 hover:bg-zinc-700 border border-zinc-700"
                                            : "bg-zinc-900/50 text-zinc-600 cursor-not-allowed border border-zinc-800/50"
                                    )}
                                >
                                    <LuCheck className="w-4 h-4" />
                                    <span>Save</span>
                                </button>

                                {/* Clear Button */}
                                {state.isConfigured && (
                                    <button
                                        onClick={() => clear(provider.id)}
                                        className="h-10 px-3 rounded-lg text-sm font-medium text-zinc-500 hover:text-red-400 hover:bg-red-500/10 border border-transparent hover:border-red-500/20 transition-all duration-150"
                                        title="Remove key"
                                    >
                                        <LuX className="w-4 h-4" />
                                    </button>
                                )}
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
};

export default ApiKeysPage;