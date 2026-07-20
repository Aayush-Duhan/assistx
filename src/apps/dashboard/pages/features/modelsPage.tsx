import { useState, useEffect, useCallback, useMemo } from "react";
import {
  LuPlus,
  LuTrash2,
  LuX,
  LuCheck,
  LuChevronDown,
  LuPencil,
  LuArrowUpRight,
  LuBoxes,
} from "react-icons/lu";
import { motion, AnimatePresence, useReducedMotion } from "motion/react";
import { cn } from "@/lib/utils";
import { ModelProviderIcon } from "@/components/ui/model-provider-icon";
import { modelsApi, type ProviderModels, type AIModel } from "@/lib/api";
import modelsHero from "@/assets/media/models/models-hero.png";
import customModelArt from "@/assets/media/models/custom-model.png";

// Provider list for dropdown (fallback used when no API data)
const PROVIDERS = [
  { id: "openai", name: "OpenAI" },
  { id: "google", name: "Google Gemini" },
  { id: "anthropic", name: "Anthropic" },
  { id: "xai", name: "xAI" },
  { id: "groq", name: "Groq" },
  { id: "openrouter", name: "OpenRouter" },
];

// Single accent for the whole page
const ACCENT = "#ffb366";

interface CustomModel {
  id: string;
  name: string;
  provider: string;
  modelId: string;
}

const easeOut: [number, number, number, number] = [0.16, 1, 0.3, 1];

const ModelsPage = () => {
  const reduceMotion = useReducedMotion();
  const [providerData, setProviderData] = useState<ProviderModels[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [customModels, setCustomModels] = useState<CustomModel[]>([]);
  const [selectedProvider, setSelectedProvider] = useState<string>(PROVIDERS[0].id);
  const [isAddingModel, setIsAddingModel] = useState(false);
  const [editingModelId, setEditingModelId] = useState<string | null>(null);

  // Form state
  const [formName, setFormName] = useState("");
  const [formProvider, setFormProvider] = useState("openai");
  const [formModelId, setFormModelId] = useState("");
  const [showProviderDropdown, setShowProviderDropdown] = useState(false);

  // Fetch models from API
  const fetchModels = useCallback(async () => {
    try {
      const data = await modelsApi.list();
      setProviderData(data);

      // Extract custom models from provider data (non-built-in models)
      const allCustom: CustomModel[] = [];
      data.forEach((p) => {
        p.customModels.forEach((m: AIModel) => {
          allCustom.push({
            id: m.id,
            name: m.displayName,
            provider: m.providerId,
            modelId: m.modelId,
          });
        });
      });
      setCustomModels(allCustom);

      // Land on the first connected provider so the detail panel opens alive
      const firstConnected = PROVIDERS.find(
        (p) => data.find((d) => d.providerId === p.id)?.hasApiKey,
      );
      if (firstConnected) setSelectedProvider(firstConnected.id);
    } catch (e) {
      console.error("Failed to load models:", e);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchModels();
  }, [fetchModels]);

  const resetForm = () => {
    setFormName("");
    setFormProvider("openai");
    setFormModelId("");
    setIsAddingModel(false);
    setEditingModelId(null);
    setShowProviderDropdown(false);
  };

  const handleAddModel = async () => {
    if (!formName.trim() || !formModelId.trim()) return;

    try {
      const result = await modelsApi.create({
        providerId: formProvider,
        modelId: formModelId.trim(),
        displayName: formName.trim(),
      });

      const newModel: CustomModel = {
        id: result.id,
        name: formName.trim(),
        provider: formProvider,
        modelId: formModelId.trim(),
      };

      setCustomModels([...customModels, newModel]);
      resetForm();
    } catch (e) {
      console.error("Failed to add model:", e);
      await fetchModels();
    }
  };

  const handleUpdateModel = async () => {
    if (!formName.trim() || !formModelId.trim() || !editingModelId) return;

    try {
      await modelsApi.update(editingModelId, {
        providerId: formProvider,
        modelId: formModelId.trim(),
        displayName: formName.trim(),
      });

      const updated = customModels.map((m) =>
        m.id === editingModelId
          ? { ...m, name: formName.trim(), provider: formProvider, modelId: formModelId.trim() }
          : m,
      );

      setCustomModels(updated);
      resetForm();
    } catch (e) {
      console.error("Failed to update model:", e);
      await fetchModels();
    }
  };

  const handleDeleteModel = async (id: string) => {
    try {
      await modelsApi.delete(id);
      setCustomModels(customModels.filter((m) => m.id !== id));
    } catch (e) {
      console.error("Failed to delete model:", e);
      await fetchModels();
    }
  };

  const startEditing = (model: CustomModel) => {
    setFormName(model.name);
    setFormProvider(model.provider);
    setFormModelId(model.modelId);
    setEditingModelId(model.id);
    setIsAddingModel(true);
  };

  const getProviderName = (id: string) => {
    const fromApi = providerData.find((p) => p.providerId === id);
    if (fromApi) return fromApi.displayName;
    return PROVIDERS.find((p) => p.id === id)?.name || id;
  };

  const checkApiKeyConfigured = (providerId: string) => {
    const provider = providerData.find((p) => p.providerId === providerId);
    return provider?.hasApiKey ?? false;
  };

  const getBuiltInModels = (providerId: string): AIModel[] => {
    const provider = providerData.find((p) => p.providerId === providerId);
    return provider?.builtInModels ?? [];
  };

  const stats = useMemo(() => {
    const connected = PROVIDERS.filter((p) => checkApiKeyConfigured(p.id)).length;
    const total =
      PROVIDERS.reduce((sum, p) => sum + getBuiltInModels(p.id).length, 0) + customModels.length;
    return { connected, total };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [providerData, customModels]);

  const selectedModels = getBuiltInModels(selectedProvider);
  const selectedConnected = checkApiKeyConfigured(selectedProvider);

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
        className="relative overflow-hidden rounded-2xl border border-zinc-800 min-h-[280px] md:min-h-[360px] flex"
      >
        <motion.img
          src={modelsHero}
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
            <h1 className="text-5xl md:text-6xl font-semibold tracking-tighter leading-none text-zinc-50">
              Models
            </h1>
            <p className="mt-3 text-sm md:text-base text-zinc-400 max-w-[42ch] leading-relaxed">
              Every model your assistant can reach, in one place.
            </p>
          </div>

          <div className="flex items-end gap-8 shrink-0">
            {!isLoading && (
              <div className="hidden sm:flex items-end gap-8">
                <div>
                  <div className="font-mono text-2xl text-zinc-100 leading-none">
                    {stats.connected}
                    <span className="text-zinc-600">/{PROVIDERS.length}</span>
                  </div>
                  <div className="mt-1.5 text-[11px] text-zinc-500">providers connected</div>
                </div>
                <div>
                  <div className="font-mono text-2xl text-zinc-100 leading-none">{stats.total}</div>
                  <div className="mt-1.5 text-[11px] text-zinc-500">models available</div>
                </div>
              </div>
            )}
            <button
              onClick={() => setIsAddingModel(true)}
              className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-lg text-xs font-semibold text-zinc-950 transition-all duration-150 hover:brightness-110 active:scale-[0.98]"
              style={{ backgroundColor: ACCENT }}
            >
              <LuPlus className="w-3.5 h-3.5" />
              Add custom model
            </button>
          </div>
        </div>
      </motion.section>

      {/* ============ Provider explorer: rail + detail panel ============ */}
      <motion.section {...sectionReveal(0.12)} className="mt-8">
        {isLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-5 gap-3">
            <div className="md:col-span-2 h-[380px] rounded-2xl border border-zinc-800/60 bg-zinc-900/30 animate-pulse" />
            <div className="md:col-span-3 h-[380px] rounded-2xl border border-zinc-800/60 bg-zinc-900/30 animate-pulse" />
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-5 gap-3 items-stretch">
            {/* Provider rail */}
            <div className="md:col-span-2 flex md:flex-col gap-1 overflow-x-auto md:overflow-visible rounded-2xl border border-zinc-800/70 bg-zinc-900/30 p-2">
              {PROVIDERS.map(({ id, name }) => {
                const connected = checkApiKeyConfigured(id);
                const count = getBuiltInModels(id).length;
                const isSelected = selectedProvider === id;

                return (
                  <button
                    key={id}
                    onClick={() => setSelectedProvider(id)}
                    className={cn(
                      "relative shrink-0 md:shrink flex items-center gap-3 px-4 py-3.5 rounded-xl text-left transition-colors duration-200",
                      isSelected ? "text-zinc-50" : "text-zinc-400 hover:text-zinc-200",
                    )}
                  >
                    {isSelected && (
                      <motion.div
                        layoutId="provider-active"
                        transition={
                          reduceMotion
                            ? { duration: 0 }
                            : { type: "spring", stiffness: 400, damping: 34 }
                        }
                        className="absolute inset-0 rounded-xl bg-zinc-800/70 border border-zinc-700/60"
                      />
                    )}
                    <span className="relative z-10 flex items-center gap-3 min-w-0 w-full">
                      <ModelProviderIcon
                        provider={id}
                        className={cn("w-5 h-5 shrink-0", !connected && !isSelected && "opacity-40")}
                      />
                      <span className="min-w-0 flex-1 hidden md:block">
                        <span
                          className={cn(
                            "block text-sm font-medium leading-tight truncate",
                            !connected && !isSelected && "text-zinc-500",
                          )}
                        >
                          {name}
                        </span>
                        <span className="block text-[11px] text-zinc-500 leading-tight mt-0.5">
                          {count} {count === 1 ? "model" : "models"}
                        </span>
                      </span>
                      <span className="relative z-10 ml-auto hidden md:block">
                        {connected ? (
                          <span
                            className="w-1.5 h-1.5 rounded-full block"
                            style={{ backgroundColor: ACCENT }}
                          />
                        ) : (
                          <span className="text-[10px] font-medium text-zinc-600">no key</span>
                        )}
                      </span>
                    </span>
                  </button>
                );
              })}
            </div>

            {/* Detail panel */}
            <div className="md:col-span-3 relative overflow-hidden rounded-2xl border border-zinc-800/70 bg-zinc-900/40 min-h-[380px] flex flex-col">
              {/* Watermark glyph: the page's one second-read moment */}
              <div
                aria-hidden
                className="absolute -right-10 -bottom-12 opacity-[0.05] pointer-events-none"
              >
                <ModelProviderIcon provider={selectedProvider} className="w-64 h-64" />
              </div>

              <AnimatePresence mode="wait">
                <motion.div
                  key={selectedProvider}
                  initial={reduceMotion ? { opacity: 0 } : { opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={reduceMotion ? { opacity: 0 } : { opacity: 0, y: -8 }}
                  transition={{ duration: 0.25, ease: easeOut }}
                  className="relative z-10 flex flex-col flex-1 p-5 md:p-6"
                >
                  <div className="flex items-start justify-between gap-4 pb-4 border-b border-zinc-800/70">
                    <div>
                      <h2 className="text-xl md:text-2xl font-semibold tracking-tight text-zinc-50">
                        {getProviderName(selectedProvider)}
                      </h2>
                      <p className="mt-1 text-xs text-zinc-500">
                        {selectedConnected
                          ? `${selectedModels.length} models ready to use`
                          : "Add an API key on the API Keys page to activate these models"}
                      </p>
                    </div>
                    {selectedConnected ? (
                      <span
                        className="inline-flex items-center gap-1.5 text-[11px] font-medium shrink-0 mt-1"
                        style={{ color: ACCENT }}
                      >
                        <span
                          className="w-1.5 h-1.5 rounded-full"
                          style={{ backgroundColor: ACCENT }}
                        />
                        Connected
                      </span>
                    ) : (
                      <span className="text-[11px] font-medium text-zinc-600 shrink-0 mt-1">
                        Not connected
                      </span>
                    )}
                  </div>

                  {selectedModels.length === 0 ? (
                    <div className="flex-1 flex items-center justify-center">
                      <p className="text-sm text-zinc-600">No models listed for this provider.</p>
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 xl:grid-cols-2 gap-x-6 pt-2 content-start">
                      {selectedModels.map((model, i) => (
                        <motion.div
                          key={model.id}
                          initial={reduceMotion ? false : { opacity: 0, x: -8 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ duration: 0.3, delay: 0.05 + i * 0.03, ease: easeOut }}
                          className={cn(
                            "px-2.5 py-2 rounded-lg text-xs font-mono truncate transition-colors",
                            selectedConnected
                              ? "text-zinc-300 hover:bg-zinc-800/60"
                              : "text-zinc-600 hover:bg-zinc-900/60",
                          )}
                          title={model.modelId}
                        >
                          {model.modelId}
                        </motion.div>
                      ))}
                    </div>
                  )}
                </motion.div>
              </AnimatePresence>
            </div>
          </div>
        )}
      </motion.section>

      {/* ============ Custom models: editorial side-image split ============ */}
      <motion.section
        {...sectionReveal(0.22)}
        className="relative mt-8 overflow-hidden rounded-2xl border border-zinc-800/70 bg-zinc-900/40"
      >
        <div className="grid grid-cols-1 md:grid-cols-2 min-h-[340px]">
          {/* Content */}
          <div className="flex flex-col p-6 md:p-8">
            <h2 className="text-xl md:text-2xl font-semibold tracking-tight text-zinc-50">
              Custom models
            </h2>
            <p className="mt-1.5 text-sm text-zinc-400 leading-relaxed max-w-[40ch]">
              Point any provider at a model ID of your choice and use it anywhere in the app.
            </p>

            {customModels.length === 0 ? (
              <div className="flex-1 flex flex-col items-start justify-center gap-2 py-8">
                <div className="w-10 h-10 rounded-xl bg-zinc-800/60 border border-zinc-700/50 flex items-center justify-center">
                  <LuBoxes className="w-4.5 h-4.5 text-zinc-500" />
                </div>
                <p className="text-sm text-zinc-400 mt-1">Nothing here yet</p>
                <p className="text-xs text-zinc-600 max-w-[34ch]">
                  Your first custom model will appear here and in the model picker.
                </p>
              </div>
            ) : (
              <div className="flex-1 mt-4 -mx-2 space-y-0.5 overflow-y-auto max-h-[220px] pr-1">
                {customModels.map((model) => (
                  <div
                    key={model.id}
                    className="px-2.5 py-2 rounded-lg hover:bg-zinc-800/50 flex items-center justify-between group transition-colors"
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <ModelProviderIcon
                        provider={model.provider}
                        className="w-4 h-4 flex-shrink-0"
                      />
                      <div className="min-w-0">
                        <span className="block text-xs font-medium text-zinc-200 truncate">
                          {model.name}
                        </span>
                        <span className="block text-[10px] font-mono text-zinc-500 truncate">
                          {model.modelId}
                        </span>
                      </div>
                    </div>
                    <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0 ml-2">
                      <button
                        onClick={() => startEditing(model)}
                        className="p-1.5 rounded-md text-zinc-500 hover:text-zinc-200 hover:bg-zinc-700 transition-all"
                        title="Edit model"
                      >
                        <LuPencil className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => handleDeleteModel(model.id)}
                        className="p-1.5 rounded-md text-zinc-500 hover:text-red-400 hover:bg-red-500/15 transition-all"
                        title="Delete model"
                      >
                        <LuTrash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}

            <button
              onClick={() => setIsAddingModel(true)}
              className="group mt-4 inline-flex items-center gap-1.5 text-xs font-semibold self-start transition-colors"
              style={{ color: ACCENT }}
            >
              Add custom model
              <LuArrowUpRight className="w-3.5 h-3.5 transition-transform duration-200 group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
            </button>
          </div>

          {/* Side image */}
          <div className="relative hidden md:block">
            <img
              src={customModelArt}
              alt=""
              className="absolute inset-0 w-full h-full object-cover"
            />
            <div className="absolute inset-0 bg-gradient-to-r from-[#131316] via-transparent to-transparent" />
          </div>
        </div>
      </motion.section>

      {/* ============ Modal: add / edit custom model ============ */}
      <AnimatePresence>
        {isAddingModel && (
          <div className="fixed inset-0 z-50 flex items-center justify-center">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.15 }}
              className="absolute inset-0 bg-black/60 backdrop-blur-sm"
              onClick={resetForm}
            />

            <motion.div
              initial={reduceMotion ? { opacity: 0 } : { opacity: 0, scale: 0.96, y: 8 }}
              animate={reduceMotion ? { opacity: 1 } : { opacity: 1, scale: 1, y: 0 }}
              exit={reduceMotion ? { opacity: 0 } : { opacity: 0, scale: 0.96, y: 8 }}
              transition={{ duration: 0.2, ease: easeOut }}
              className="relative z-10 w-full max-w-lg mx-4 p-5 rounded-2xl bg-zinc-900 border border-zinc-700/50 shadow-2xl shadow-black/50"
            >
              <div className="flex items-center justify-between mb-5">
                <span className="text-base font-semibold text-zinc-100">
                  {editingModelId ? "Edit custom model" : "Add custom model"}
                </span>
                <button
                  onClick={resetForm}
                  className="p-1.5 rounded-lg text-zinc-500 hover:text-zinc-300 hover:bg-zinc-800 transition-all duration-150"
                >
                  <LuX className="w-5 h-5" />
                </button>
              </div>

              <div className="space-y-4 mb-5">
                <div>
                  <label className="block text-xs text-zinc-400 mb-1.5">Display name</label>
                  <input
                    type="text"
                    value={formName}
                    onChange={(e) => setFormName(e.target.value)}
                    placeholder="My custom model"
                    className="w-full h-10 px-3 rounded-lg text-sm bg-zinc-950 border border-zinc-800 text-zinc-300 placeholder-zinc-600 focus:outline-none focus:ring-1 focus:ring-[#ffb366]/60 focus:border-[#ffb366]/60 transition-all duration-150"
                    autoFocus
                  />
                </div>

                <div className="relative">
                  <label className="block text-xs text-zinc-400 mb-1.5">Provider</label>
                  <button
                    type="button"
                    onClick={() => setShowProviderDropdown(!showProviderDropdown)}
                    className="w-full h-10 px-3 rounded-lg text-sm bg-zinc-950 border border-zinc-800 text-zinc-300 focus:outline-none focus:ring-1 focus:ring-[#ffb366]/60 focus:border-[#ffb366]/60 transition-all duration-150 flex items-center justify-between"
                  >
                    <div className="flex items-center gap-2">
                      <ModelProviderIcon provider={formProvider} className="w-4 h-4" />
                      <span>{getProviderName(formProvider)}</span>
                    </div>
                    <LuChevronDown
                      className={cn(
                        "w-4 h-4 text-zinc-500 transition-transform",
                        showProviderDropdown && "rotate-180",
                      )}
                    />
                  </button>
                  {showProviderDropdown && (
                    <div className="absolute z-10 mt-1 w-full bg-zinc-900 border border-zinc-700 rounded-lg shadow-xl overflow-hidden">
                      {PROVIDERS.map((provider) => (
                        <button
                          key={provider.id}
                          onClick={() => {
                            setFormProvider(provider.id);
                            setShowProviderDropdown(false);
                          }}
                          className={cn(
                            "w-full px-3 py-2.5 text-sm text-left flex items-center gap-2 hover:bg-zinc-800 transition-colors",
                            formProvider === provider.id && "bg-zinc-800",
                          )}
                        >
                          <ModelProviderIcon provider={provider.id} className="w-4 h-4" />
                          <span className="text-zinc-300">{provider.name}</span>
                          {formProvider === provider.id && (
                            <LuCheck className="w-4 h-4 ml-auto" style={{ color: ACCENT }} />
                          )}
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                <div>
                  <label className="block text-xs text-zinc-400 mb-1.5">Model ID</label>
                  <input
                    type="text"
                    value={formModelId}
                    onChange={(e) => setFormModelId(e.target.value)}
                    placeholder="gpt-4-turbo-preview"
                    className="w-full h-10 px-3 rounded-lg text-sm font-mono bg-zinc-950 border border-zinc-800 text-zinc-300 placeholder-zinc-600 focus:outline-none focus:ring-1 focus:ring-[#ffb366]/60 focus:border-[#ffb366]/60 transition-all duration-150"
                  />
                  <p className="mt-1.5 text-[11px] text-zinc-600">
                    The exact ID the provider expects, as listed in their docs.
                  </p>
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
                    "px-4 py-2 rounded-lg text-sm font-semibold flex items-center gap-2 transition-all duration-150 active:scale-[0.98]",
                    formName.trim() && formModelId.trim()
                      ? "text-zinc-950 hover:brightness-110"
                      : "bg-zinc-800 text-zinc-600 cursor-not-allowed",
                  )}
                  style={
                    formName.trim() && formModelId.trim() ? { backgroundColor: ACCENT } : undefined
                  }
                >
                  <LuCheck className="w-4 h-4" />
                  {editingModelId ? "Save changes" : "Add model"}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default ModelsPage;
