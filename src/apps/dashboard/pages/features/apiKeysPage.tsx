import { useState, useEffect, useCallback } from "react";
import {
  LuCheck,
  LuX,
  LuExternalLink,
  LuClipboardPaste,
  LuCopy,
  LuClipboardCheck,
} from "react-icons/lu";
import { cn } from "@/lib/utils";
import { ModelProviderIcon } from "@/components/ui/model-provider-icon";
import { apiKeysApi } from "@/lib/api";

const PROVIDERS = [
  {
    id: "openai",
    name: "OpenAI",
    docsUrl: "https://platform.openai.com/api-keys",
    placeholder: "sk-...",
  },
  {
    id: "google",
    name: "Google Gemini",
    docsUrl: "https://aistudio.google.com/apikey",
    placeholder: "AIza...",
  },
  {
    id: "anthropic",
    name: "Anthropic",
    docsUrl: "https://console.anthropic.com/settings/keys",
    placeholder: "sk-ant-...",
  },
  { id: "xai", name: "xAI", docsUrl: "https://console.x.ai", placeholder: "xai-..." },
  { id: "groq", name: "Groq", docsUrl: "https://console.groq.com/keys", placeholder: "gsk_..." },
  {
    id: "openrouter",
    name: "OpenRouter",
    docsUrl: "https://openrouter.ai/keys",
    placeholder: "sk-or-...",
  },
];

/** Masked placeholder shown for configured keys that haven't been edited */
const MASKED_DISPLAY = "••••••••••••••••";

interface ApiKeyState {
  value: string;
  isConfigured: boolean;
  isDirty: boolean;
}

const ApiKeysPage = () => {
  const [apiKeys, setApiKeys] = useState<Record<string, ApiKeyState>>(() => {
    const initial: Record<string, ApiKeyState> = {};
    PROVIDERS.forEach((p) => {
      initial[p.id] = { value: "", isConfigured: false, isDirty: false };
    });
    return initial;
  });

  // Track which provider's key was just copied (for visual feedback)
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // Fetch configured API keys from server
  const fetchApiKeys = useCallback(async () => {
    try {
      const keys = await apiKeysApi.list();
      setApiKeys((prev) => {
        const updated = { ...prev };
        // Reset all to not configured first
        Object.keys(updated).forEach((key) => {
          updated[key] = { ...updated[key], isConfigured: false, isDirty: false };
        });
        // Mark configured ones (no masked value stored - masking is render-time only)
        keys.forEach((keyInfo) => {
          if (updated[keyInfo.provider]) {
            updated[keyInfo.provider] = {
              value: "",
              isConfigured: true,
              isDirty: false,
            };
          }
        });
        return updated;
      });
    } catch (e) {
      console.error("Failed to load API keys:", e);
    }
  }, []);

  useEffect(() => {
    fetchApiKeys();
  }, [fetchApiKeys]);

  const handleChange = (id: string, newValue: string) => {
    setApiKeys((prev) => {
      const currentState = prev[id];
      let effectiveValue = newValue;

      // If transitioning from masked display (configured + not dirty),
      // the input's current value is MASKED_DISPLAY, so the new value
      // might contain mask characters. We need to extract only the
      // characters the user actually typed.
      if (currentState.isConfigured && !currentState.isDirty) {
        // User is starting to edit a configured key - remove mask chars
        effectiveValue = newValue.replace(/•/g, "");
      }

      return {
        ...prev,
        [id]: { ...currentState, value: effectiveValue, isDirty: true },
      };
    });
  };

  const handlePaste = async (id: string) => {
    try {
      const text = await navigator.clipboard.readText();
      setApiKeys((prev) => ({
        ...prev,
        [id]: { ...prev[id], value: text, isDirty: true },
      }));
    } catch (e) {
      console.error("Failed to paste from clipboard:", e);
    }
  };

  const save = async (id: string) => {
    const keyValue = apiKeys[id].value;
    // Only save when we have an actual new key value
    if (!keyValue) return;

    try {
      await apiKeysApi.save(id, keyValue);
      setApiKeys((prev) => ({
        ...prev,
        [id]: {
          value: "", // Clear value after save - never store the key
          isConfigured: true,
          isDirty: false,
        },
      }));
    } catch (e) {
      console.error("Failed to save API key:", e);
    }
  };

  const clear = async (id: string) => {
    try {
      await apiKeysApi.delete(id);
      // Immediately update local state
      setApiKeys((prev) => ({
        ...prev,
        [id]: { value: "", isConfigured: false, isDirty: false },
      }));
      // Refetch to ensure UI is in sync with server
      await fetchApiKeys();
    } catch (e) {
      console.error("Failed to delete API key:", e);
    }
  };

  const handleCopyKey = async (id: string) => {
    try {
      const key = await apiKeysApi.copyKey(id);
      await navigator.clipboard.writeText(key);
      // Show success state
      setCopiedId(id);
      // Reset after 2 seconds
      setTimeout(() => setCopiedId(null), 2000);
    } catch (e) {
      console.error("Failed to copy API key:", e);
    }
  };

  /**
   * Get the display value for the input field.
   * - If dirty, show the actual user-entered value
   * - If configured and not dirty, show masked placeholder
   * - Otherwise show empty string (placeholder will be visible)
   */
  const getDisplayValue = (state: ApiKeyState): string => {
    if (state.isDirty) {
      return state.value;
    }
    if (state.isConfigured) {
      return MASKED_DISPLAY;
    }
    return "";
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
        {PROVIDERS.map((provider) => {
          const state = apiKeys[provider.id];
          const displayValue = getDisplayValue(state);

          return (
            <div
              key={provider.id}
              className={cn(
                "p-4 rounded-xl border transition-all duration-200",
                state.isConfigured
                  ? "bg-zinc-900/30 border-zinc-700/50"
                  : "bg-zinc-900/20 border-zinc-800/50 hover:border-zinc-700/50",
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
                    type="password"
                    value={displayValue}
                    onChange={(e) => handleChange(provider.id, e.target.value)}
                    placeholder={provider.placeholder}
                    className={cn(
                      "w-full h-10 px-3 pr-10 rounded-lg text-sm font-mono transition-all duration-150",
                      "bg-zinc-950/50 border text-zinc-300 placeholder-zinc-600",
                      "focus:outline-none focus:ring-1 focus:ring-zinc-600 focus:border-zinc-600",
                      state.isConfigured ? "border-zinc-700/50" : "border-zinc-800",
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
                  </div>
                </div>

                {/* Save Button - Only rendered when user has made changes */}
                {state.isDirty && (
                  <button
                    onClick={() => save(provider.id)}
                    className="h-10 px-4 rounded-lg text-sm font-medium transition-all duration-150 flex items-center gap-2 bg-zinc-800 text-zinc-200 hover:bg-zinc-700 border border-zinc-700"
                  >
                    <LuCheck className="w-4 h-4" />
                    <span>Save</span>
                  </button>
                )}

                {/* Copy Button - Only visible when key is configured */}
                {state.isConfigured && (
                  <button
                    onClick={() => handleCopyKey(provider.id)}
                    className={cn(
                      "h-10 px-3 rounded-lg text-sm font-medium border transition-all duration-150",
                      copiedId === provider.id
                        ? "text-emerald-400 bg-emerald-500/10 border-emerald-500/20"
                        : "text-zinc-500 hover:text-zinc-300 hover:bg-zinc-800 border-transparent hover:border-zinc-700",
                    )}
                    title={copiedId === provider.id ? "Copied!" : "Copy key to clipboard"}
                  >
                    {copiedId === provider.id ? (
                      <LuClipboardCheck className="w-4 h-4" />
                    ) : (
                      <LuCopy className="w-4 h-4" />
                    )}
                  </button>
                )}

                {/* Clear Button - Only visible when key is configured */}
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
