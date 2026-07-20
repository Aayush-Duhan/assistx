import { useState, useEffect, useCallback, useMemo } from "react";
import {
  LuCheck,
  LuX,
  LuClipboardPaste,
  LuCopy,
  LuClipboardCheck,
  LuArrowUpRight,
} from "react-icons/lu";
import { motion, AnimatePresence, useReducedMotion } from "motion/react";
import { cn } from "@/lib/utils";
import { ModelProviderIcon } from "@/components/ui/model-provider-icon";
import { apiKeysApi } from "@/lib/api";
import apiKeysHero from "@/assets/media/models/api-keys-hero.png";

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

// Single accent for the whole page (shared with the Models page)
const ACCENT = "#ffb366";

const easeOut: [number, number, number, number] = [0.16, 1, 0.3, 1];

interface ApiKeyState {
  value: string;
  isConfigured: boolean;
  isDirty: boolean;
}

const ApiKeysPage = () => {
  const reduceMotion = useReducedMotion();
  const [isLoading, setIsLoading] = useState(true);
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
    } finally {
      setIsLoading(false);
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

  const connectedCount = useMemo(
    () => PROVIDERS.filter((p) => apiKeys[p.id]?.isConfigured).length,
    [apiKeys],
  );

  const sectionReveal = (delay: number) =>
    reduceMotion
      ? {}
      : {
          initial: { opacity: 0, y: 16 },
          animate: { opacity: 1, y: 0 },
          transition: { duration: 0.55, delay, ease: easeOut },
        };

  return (
    <div className="pb-10">
      {/* ============ Hero: image as canvas, type bottom-left ============ */}
      <motion.section
        {...sectionReveal(0)}
        className="relative overflow-hidden rounded-2xl border border-zinc-800 min-h-[240px] md:min-h-[300px] flex"
      >
        <motion.img
          src={apiKeysHero}
          alt=""
          initial={reduceMotion ? undefined : { scale: 1.06 }}
          animate={reduceMotion ? undefined : { scale: 1 }}
          transition={{ duration: 1.6, ease: easeOut }}
          className="absolute inset-0 w-full h-full object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-[#0c0c0d] via-[#0c0c0d]/45 to-transparent" />
        <div className="absolute inset-0 bg-gradient-to-r from-[#0c0c0d]/70 via-transparent to-transparent" />

        <div className="relative z-10 mt-auto w-full flex flex-col md:flex-row md:items-end justify-between gap-6 p-6 md:p-8">
          <div>
            <h1 className="text-4xl md:text-5xl font-semibold tracking-tighter leading-none text-zinc-50">
              API Keys
            </h1>
            <p className="mt-3 text-sm md:text-base text-zinc-400 max-w-[44ch] leading-relaxed">
              Connect a provider with its key to unlock its models.
            </p>
          </div>

          {!isLoading && (
            <div className="hidden sm:block shrink-0">
              <div className="font-mono text-2xl text-zinc-100 leading-none">
                {connectedCount}
                <span className="text-zinc-600">/{PROVIDERS.length}</span>
              </div>
              <div className="mt-1.5 text-[11px] text-zinc-500">providers connected</div>
            </div>
          )}
        </div>
      </motion.section>

      {/* ============ Credentials ledger: one row per provider ============ */}
      <motion.section {...sectionReveal(0.12)} className="mt-8">
        {isLoading ? (
          <div className="rounded-2xl border border-zinc-800/60 bg-zinc-900/30 p-2 space-y-1">
            {PROVIDERS.map((p) => (
              <div key={p.id} className="h-[72px] rounded-xl bg-zinc-800/30 animate-pulse" />
            ))}
          </div>
        ) : (
          <div className="rounded-2xl border border-zinc-800/70 bg-zinc-900/30 p-2 space-y-1">
            {PROVIDERS.map((provider, index) => {
              const state = apiKeys[provider.id];
              const displayValue = getDisplayValue(state);

              return (
                <motion.div
                  key={provider.id}
                  initial={reduceMotion ? false : { opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.4, delay: 0.15 + index * 0.05, ease: easeOut }}
                  className={cn(
                    "rounded-xl px-4 py-4 transition-colors duration-200",
                    "hover:bg-zinc-800/25 focus-within:bg-zinc-800/35",
                  )}
                >
                  <div className="flex flex-col lg:flex-row lg:items-center gap-3 lg:gap-4">
                    {/* Provider identity */}
                    <div className="flex items-center gap-3 lg:w-60 shrink-0">
                      <div
                        className={cn(
                          "w-9 h-9 rounded-lg flex items-center justify-center border",
                          state.isConfigured
                            ? "bg-zinc-800/80 border-zinc-700/60"
                            : "bg-zinc-900/60 border-zinc-800/60",
                        )}
                      >
                        <ModelProviderIcon
                          provider={provider.id}
                          className={cn("w-4.5 h-4.5", !state.isConfigured && "opacity-50")}
                        />
                      </div>
                      <div className="min-w-0">
                        <div
                          className={cn(
                            "text-sm font-medium leading-tight truncate",
                            state.isConfigured ? "text-zinc-100" : "text-zinc-400",
                          )}
                        >
                          {provider.name}
                        </div>
                        <div className="mt-0.5 leading-tight">
                          {state.isConfigured ? (
                            <span
                              className="inline-flex items-center gap-1.5 text-[11px] font-medium"
                              style={{ color: ACCENT }}
                            >
                              <span
                                className="w-1.5 h-1.5 rounded-full"
                                style={{ backgroundColor: ACCENT }}
                              />
                              Connected
                            </span>
                          ) : (
                            <span className="text-[11px] font-medium text-zinc-600">
                              Not connected
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Key input */}
                    <div className="relative flex-1 min-w-0">
                      <input
                        type="password"
                        value={displayValue}
                        onChange={(e) => handleChange(provider.id, e.target.value)}
                        placeholder={provider.placeholder}
                        className={cn(
                          "w-full h-10 px-3 pr-10 rounded-lg text-sm font-mono transition-all duration-150",
                          "bg-zinc-950/60 border text-zinc-300 placeholder-zinc-600",
                          "focus:outline-none focus:ring-1 focus:ring-[#ffb366]/50 focus:border-[#ffb366]/50",
                          state.isConfigured ? "border-zinc-700/50" : "border-zinc-800",
                        )}
                      />
                      <button
                        onClick={() => handlePaste(provider.id)}
                        className="absolute right-1.5 top-1/2 -translate-y-1/2 p-1.5 rounded-md text-zinc-500 hover:text-zinc-300 hover:bg-zinc-800 transition-all duration-150"
                        title="Paste from clipboard"
                      >
                        <LuClipboardPaste className="w-4 h-4" />
                      </button>
                    </div>

                    {/* Actions */}
                    <div className="flex items-center gap-1.5 shrink-0">
                      <AnimatePresence>
                        {state.isDirty && (
                          <motion.button
                            initial={reduceMotion ? { opacity: 0 } : { opacity: 0, scale: 0.92 }}
                            animate={{ opacity: 1, scale: 1 }}
                            exit={reduceMotion ? { opacity: 0 } : { opacity: 0, scale: 0.92 }}
                            transition={{ duration: 0.15, ease: easeOut }}
                            onClick={() => save(provider.id)}
                            className="h-10 px-4 rounded-lg text-sm font-semibold text-zinc-950 flex items-center gap-2 transition-all duration-150 hover:brightness-110 active:scale-[0.98]"
                            style={{ backgroundColor: ACCENT }}
                          >
                            <LuCheck className="w-4 h-4" />
                            <span>Save</span>
                          </motion.button>
                        )}
                      </AnimatePresence>

                      {state.isConfigured && (
                        <button
                          onClick={() => handleCopyKey(provider.id)}
                          className={cn(
                            "h-10 px-3 rounded-lg text-sm font-medium border transition-all duration-150",
                            copiedId === provider.id
                              ? "border-transparent"
                              : "text-zinc-500 hover:text-zinc-300 hover:bg-zinc-800 border-transparent hover:border-zinc-700",
                          )}
                          style={
                            copiedId === provider.id
                              ? { color: ACCENT, backgroundColor: "#ffb3661a" }
                              : undefined
                          }
                          title={copiedId === provider.id ? "Copied!" : "Copy key to clipboard"}
                        >
                          {copiedId === provider.id ? (
                            <LuClipboardCheck className="w-4 h-4" />
                          ) : (
                            <LuCopy className="w-4 h-4" />
                          )}
                        </button>
                      )}

                      {state.isConfigured && (
                        <button
                          onClick={() => clear(provider.id)}
                          className="h-10 px-3 rounded-lg text-sm font-medium text-zinc-500 hover:text-red-400 hover:bg-red-500/10 border border-transparent hover:border-red-500/20 transition-all duration-150"
                          title="Remove key"
                        >
                          <LuX className="w-4 h-4" />
                        </button>
                      )}

                      <a
                        href={provider.docsUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="group h-10 px-3 rounded-lg text-xs font-semibold flex items-center gap-1 text-zinc-500 hover:text-zinc-200 transition-colors duration-150"
                      >
                        Get key
                        <LuArrowUpRight className="w-3.5 h-3.5 transition-transform duration-200 group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
                      </a>
                    </div>
                  </div>
                </motion.div>
              );
            })}
          </div>
        )}
      </motion.section>
    </div>
  );
};

export default ApiKeysPage;
