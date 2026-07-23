import { useState, useEffect, useCallback, useRef } from "react";
import { apiFetch, getServerConfig } from "@/lib/api";
import {
  LuArrowLeft,
  LuCheck,
  LuX,
  LuLoader,
  LuExternalLink,
  LuPlus,
  LuTrash2,
  LuSearch,
  LuRefreshCw,
  LuSlidersHorizontal,
  LuFolderGit,
} from "react-icons/lu";
import { motion, AnimatePresence } from "motion/react";
import { cn } from "@/lib/utils";
import { ModelProviderIcon } from "@/components/ui/model-provider-icon";
import { useProviderStore, ProviderConnection } from "@/stores/providerStore";

// Provider registry — all model providers from 9router, organized into 4 categories
type ProviderCategory = "oauth" | "free" | "apikey" | "custom";
interface ProviderEntry {
  id: string;
  name: string;
  type: "apikey" | "oauth" | "device_code" | "none" | "custom";
  category: ProviderCategory;
  docsUrl: string;
  placeholder: string;
}

const REGISTRY_PROVIDERS: ProviderEntry[] = [
  // ── OAuth / Device Code Providers ─────────────────────────────────────
  {
    id: "claude",
    name: "Claude Code",
    type: "oauth",
    category: "oauth",
    docsUrl: "https://claude.ai",
    placeholder: "OAuth Login",
  },
  {
    id: "codex",
    name: "OpenAI Codex",
    type: "oauth",
    category: "oauth",
    docsUrl: "https://platform.openai.com",
    placeholder: "OAuth Login",
  },
  {
    id: "github",
    name: "GitHub Copilot",
    type: "device_code",
    category: "oauth",
    docsUrl: "https://github.com/features/copilot",
    placeholder: "Device Code Login",
  },
  {
    id: "xai",
    name: "xAI (Grok)",
    type: "oauth",
    category: "oauth",
    docsUrl: "https://console.x.ai",
    placeholder: "OAuth Login",
  },
  {
    id: "antigravity",
    name: "Antigravity",
    type: "oauth",
    category: "oauth",
    docsUrl: "https://cloud.google.com",
    placeholder: "OAuth Login",
  },
  {
    id: "cline",
    name: "Cline",
    type: "oauth",
    category: "oauth",
    docsUrl: "https://cline.bot",
    placeholder: "OAuth Login",
  },
  {
    id: "clinepass",
    name: "ClinePass",
    type: "oauth",
    category: "oauth",
    docsUrl: "https://clinepass.com",
    placeholder: "OAuth Login",
  },
  {
    id: "cursor",
    name: "Cursor IDE",
    type: "oauth",
    category: "oauth",
    docsUrl: "https://cursor.sh",
    placeholder: "Import Token",
  },
  {
    id: "kimi",
    name: "Kimi",
    type: "device_code",
    category: "oauth",
    docsUrl: "https://kimi.ai",
    placeholder: "Device Code Login",
  },
  {
    id: "kilocode",
    name: "Kilo Code",
    type: "device_code",
    category: "oauth",
    docsUrl: "https://kilocode.ai",
    placeholder: "Device Code Login",
  },
  {
    id: "kimchi",
    name: "Kimchi",
    type: "oauth",
    category: "oauth",
    docsUrl: "https://kimchi.dev",
    placeholder: "OAuth Login",
  },
  {
    id: "codebuddy-cn",
    name: "CodeBuddy CN",
    type: "device_code",
    category: "oauth",
    docsUrl: "https://copilot.tencent.com",
    placeholder: "Device Code Login",
  },
  {
    id: "grok-cli",
    name: "Grok CLI",
    type: "device_code",
    category: "oauth",
    docsUrl: "https://x.ai",
    placeholder: "Device Code Login",
  },
  {
    id: "qwen",
    name: "Qwen Code",
    type: "device_code",
    category: "oauth",
    docsUrl: "https://qwen.ai",
    placeholder: "Device Code Login",
  },
  {
    id: "gitlab",
    name: "GitLab Duo",
    type: "oauth",
    category: "oauth",
    docsUrl: "https://gitlab.com",
    placeholder: "OAuth Login",
  },
  {
    id: "iflow",
    name: "iFlow AI",
    type: "oauth",
    category: "oauth",
    docsUrl: "https://iflow.com",
    placeholder: "OAuth Login",
  },

  // ── Free / No-Auth Providers ──────────────────────────────────────────
  {
    id: "gemini-cli",
    name: "Gemini CLI",
    type: "oauth",
    category: "free",
    docsUrl: "https://aistudio.google.com",
    placeholder: "OAuth Login",
  },
  {
    id: "kiro",
    name: "Kiro AI",
    type: "device_code",
    category: "free",
    docsUrl: "https://kiro.dev",
    placeholder: "Device Code Login",
  },
  {
    id: "qoder",
    name: "Qoder",
    type: "device_code",
    category: "free",
    docsUrl: "https://qoder.sh",
    placeholder: "Device Code Login",
  },
  {
    id: "mimo-free",
    name: "MiMo Code Free",
    type: "none",
    category: "free",
    docsUrl: "https://xiaomi.com",
    placeholder: "No key needed",
  },
  {
    id: "opencode",
    name: "OpenCode Free",
    type: "none",
    category: "free",
    docsUrl: "https://opencode.ai",
    placeholder: "No key needed",
  },
  {
    id: "gemini",
    name: "Gemini",
    type: "apikey",
    category: "free",
    docsUrl: "https://aistudio.google.com/apikey",
    placeholder: "AIza...",
  },
  {
    id: "openrouter",
    name: "OpenRouter",
    type: "apikey",
    category: "free",
    docsUrl: "https://openrouter.ai/keys",
    placeholder: "sk-or-...",
  },
  {
    id: "ollama",
    name: "Ollama Cloud",
    type: "none",
    category: "free",
    docsUrl: "https://ollama.com",
    placeholder: "No key needed",
  },
  {
    id: "ollama-local",
    name: "Ollama Local",
    type: "none",
    category: "free",
    docsUrl: "https://ollama.com",
    placeholder: "Local server",
  },
  {
    id: "nvidia",
    name: "NVIDIA NIM",
    type: "apikey",
    category: "free",
    docsUrl: "https://build.nvidia.com",
    placeholder: "nvapi-...",
  },
  {
    id: "cloudflare-ai",
    name: "Cloudflare",
    type: "apikey",
    category: "free",
    docsUrl: "https://dash.cloudflare.com",
    placeholder: "API Token",
  },
  {
    id: "vertex",
    name: "Vertex AI",
    type: "apikey",
    category: "free",
    docsUrl: "https://cloud.google.com/vertex-ai",
    placeholder: "API Key",
  },

  // ── API Key Providers ─────────────────────────────────────────────────
  {
    id: "openai",
    name: "OpenAI",
    type: "apikey",
    category: "apikey",
    docsUrl: "https://platform.openai.com/api-keys",
    placeholder: "sk-...",
  },
  {
    id: "anthropic",
    name: "Anthropic",
    type: "apikey",
    category: "apikey",
    docsUrl: "https://console.anthropic.com/settings/keys",
    placeholder: "sk-ant-...",
  },
  {
    id: "google",
    name: "Google Gemini",
    type: "apikey",
    category: "apikey",
    docsUrl: "https://aistudio.google.com/apikey",
    placeholder: "AIza...",
  },
  {
    id: "deepseek",
    name: "DeepSeek",
    type: "apikey",
    category: "apikey",
    docsUrl: "https://platform.deepseek.com",
    placeholder: "sk-...",
  },
  {
    id: "groq",
    name: "Groq",
    type: "apikey",
    category: "apikey",
    docsUrl: "https://console.groq.com/keys",
    placeholder: "gsk_...",
  },
  {
    id: "mistral",
    name: "Mistral",
    type: "apikey",
    category: "apikey",
    docsUrl: "https://console.mistral.ai",
    placeholder: "API Key",
  },
  {
    id: "cohere",
    name: "Cohere",
    type: "apikey",
    category: "apikey",
    docsUrl: "https://dashboard.cohere.com/api-keys",
    placeholder: "API Key",
  },
  {
    id: "perplexity",
    name: "Perplexity",
    type: "apikey",
    category: "apikey",
    docsUrl: "https://perplexity.ai",
    placeholder: "pplx-...",
  },
  {
    id: "fireworks",
    name: "Fireworks AI",
    type: "apikey",
    category: "apikey",
    docsUrl: "https://fireworks.ai",
    placeholder: "API Key",
  },
  {
    id: "together",
    name: "Together AI",
    type: "apikey",
    category: "apikey",
    docsUrl: "https://together.ai",
    placeholder: "API Key",
  },
  {
    id: "cerebras",
    name: "Cerebras",
    type: "apikey",
    category: "apikey",
    docsUrl: "https://cerebras.ai",
    placeholder: "API Key",
  },
  {
    id: "azure",
    name: "Azure OpenAI",
    type: "apikey",
    category: "apikey",
    docsUrl: "https://portal.azure.com",
    placeholder: "API Key",
  },
  {
    id: "huggingface",
    name: "HuggingFace",
    type: "apikey",
    category: "apikey",
    docsUrl: "https://huggingface.co/settings/tokens",
    placeholder: "hf_...",
  },
  {
    id: "nebius",
    name: "Nebius AI",
    type: "apikey",
    category: "apikey",
    docsUrl: "https://nebius.ai",
    placeholder: "API Key",
  },
  {
    id: "siliconflow",
    name: "SiliconFlow",
    type: "apikey",
    category: "apikey",
    docsUrl: "https://siliconflow.cn",
    placeholder: "API Key",
  },
  {
    id: "hyperbolic",
    name: "Hyperbolic",
    type: "apikey",
    category: "apikey",
    docsUrl: "https://hyperbolic.xyz",
    placeholder: "API Key",
  },
  {
    id: "featherless",
    name: "Featherless",
    type: "apikey",
    category: "apikey",
    docsUrl: "https://featherless.ai",
    placeholder: "API Key",
  },
  {
    id: "chutes",
    name: "Chutes AI",
    type: "apikey",
    category: "apikey",
    docsUrl: "https://chutes.ai",
    placeholder: "API Key",
  },
  {
    id: "venice",
    name: "Venice AI",
    type: "apikey",
    category: "apikey",
    docsUrl: "https://venice.ai",
    placeholder: "API Key",
  },
  {
    id: "blackbox",
    name: "Blackbox AI",
    type: "apikey",
    category: "apikey",
    docsUrl: "https://blackbox.ai",
    placeholder: "API Key",
  },
  {
    id: "glm",
    name: "GLM Coding",
    type: "apikey",
    category: "apikey",
    docsUrl: "https://open.bigmodel.cn",
    placeholder: "API Key",
  },
  {
    id: "glm-cn",
    name: "GLM (China)",
    type: "apikey",
    category: "apikey",
    docsUrl: "https://open.bigmodel.cn",
    placeholder: "API Key",
  },
  {
    id: "volcengine-ark",
    name: "Volcengine Ark",
    type: "apikey",
    category: "apikey",
    docsUrl: "https://volcengine.com",
    placeholder: "API Key",
  },
  {
    id: "minimax",
    name: "Minimax",
    type: "apikey",
    category: "apikey",
    docsUrl: "https://minimax.chat",
    placeholder: "API Key",
  },
  {
    id: "minimax-cn",
    name: "Minimax (China)",
    type: "apikey",
    category: "apikey",
    docsUrl: "https://minimax.chat",
    placeholder: "API Key",
  },
  {
    id: "alicode",
    name: "Alibaba",
    type: "apikey",
    category: "apikey",
    docsUrl: "https://dashscope.console.aliyun.com",
    placeholder: "API Key",
  },
  {
    id: "alicode-intl",
    name: "Alibaba Coding",
    type: "apikey",
    category: "apikey",
    docsUrl: "https://dashscope.console.aliyun.com",
    placeholder: "API Key",
  },
  {
    id: "alims-intl",
    name: "Alibaba Studio",
    type: "apikey",
    category: "apikey",
    docsUrl: "https://dashscope.console.aliyun.com",
    placeholder: "API Key",
  },
  {
    id: "nanobanana",
    name: "NanoBanana",
    type: "apikey",
    category: "apikey",
    docsUrl: "https://nanobanana.ai",
    placeholder: "API Key",
  },
  {
    id: "opencode-go",
    name: "OpenCode Go",
    type: "apikey",
    category: "apikey",
    docsUrl: "https://opencode.ai",
    placeholder: "API Key",
  },
  {
    id: "commandcode",
    name: "Command Code",
    type: "apikey",
    category: "apikey",
    docsUrl: "https://commandcode.ai",
    placeholder: "API Key",
  },
  {
    id: "perplexity-agent",
    name: "Perplexity Agent",
    type: "apikey",
    category: "apikey",
    docsUrl: "https://perplexity.ai",
    placeholder: "pplx-...",
  },
  {
    id: "vertex-partner",
    name: "Vertex Partner",
    type: "apikey",
    category: "apikey",
    docsUrl: "https://cloud.google.com",
    placeholder: "API Key",
  },
  {
    id: "vercel-ai-gateway",
    name: "Vercel AI Gateway",
    type: "apikey",
    category: "apikey",
    docsUrl: "https://vercel.com",
    placeholder: "API Key",
  },
  {
    id: "fal-ai",
    name: "Fal.ai",
    type: "apikey",
    category: "apikey",
    docsUrl: "https://fal.ai",
    placeholder: "API Key",
  },
  {
    id: "byteplus",
    name: "BytePlus",
    type: "apikey",
    category: "apikey",
    docsUrl: "https://byteplus.com",
    placeholder: "API Key",
  },
  {
    id: "xiaomi-mimo",
    name: "Xiaomi MiMo",
    type: "apikey",
    category: "apikey",
    docsUrl: "https://xiaomi.com",
    placeholder: "API Key",
  },
  {
    id: "voyage-ai",
    name: "Voyage AI",
    type: "apikey",
    category: "apikey",
    docsUrl: "https://voyage.ai",
    placeholder: "API Key",
  },
  {
    id: "jina-ai",
    name: "Jina AI",
    type: "apikey",
    category: "apikey",
    docsUrl: "https://jina.ai",
    placeholder: "API Key",
  },
  {
    id: "linkup",
    name: "Linkup",
    type: "apikey",
    category: "apikey",
    docsUrl: "https://linkup.so",
    placeholder: "API Key",
  },

  // ── Custom Endpoint Providers ─────────────────────────────────────────
  {
    id: "openai-compatible",
    name: "OpenAI Compatible",
    type: "custom",
    category: "custom",
    docsUrl: "",
    placeholder: "Custom endpoint",
  },
  {
    id: "anthropic-compatible",
    name: "Anthropic Compatible",
    type: "custom",
    category: "custom",
    docsUrl: "",
    placeholder: "Custom endpoint",
  },
  {
    id: "custom-embedding",
    name: "Custom Embedding",
    type: "custom",
    category: "custom",
    docsUrl: "",
    placeholder: "Custom endpoint",
  },
];

const CATEGORIES: { key: ProviderCategory; label: string; description: string }[] = [
  {
    key: "oauth",
    label: "OAuth Providers",
    description: "Sign in with your existing account — no API key needed",
  },
  {
    key: "free",
    label: "Free / Free Tier",
    description: "Free to use or generous free tier available",
  },
  { key: "apikey", label: "API Key Providers", description: "Connect with a provider API key" },
  {
    key: "custom",
    label: "Custom Endpoints",
    description: "OpenAI/Anthropic-compatible custom servers",
  },
];

export default function ProvidersPage() {
  const {
    connections,
    fetchConnections,
    fetchNodes,
    fetchModels,
    addConnection,
    updateConnection,
    deleteConnection,
    validateConnection,
  } = useProviderStore((s) => s);

  const [activeTab, setActiveTab] = useState<"all" | "connected" | ProviderCategory>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedProviderId, setSelectedProviderId] = useState<string | null>(null);

  // Edit forms states
  const [editingConnection, setEditingConnection] = useState<ProviderConnection | null>(null);
  const [isCreatingNew, setIsCreatingNew] = useState(false);

  // Validation feedback
  const [isValidating, setIsValidating] = useState(false);
  const [validationResult, setValidationResult] = useState<{
    valid: boolean;
    error?: string;
  } | null>(null);

  // Form inputs
  const [formName, setFormName] = useState("");
  const [formApiKey, setFormApiKey] = useState("");
  const [formEmail, setFormEmail] = useState("");
  const [formBaseUrl, setFormBaseUrl] = useState("");
  const [formPrefix, setFormPrefix] = useState("");
  const [formIsActive, setFormIsActive] = useState(true);
  const [formPriority, setFormPriority] = useState(1);
  const [formCustomModelsInput, setFormCustomModelsInput] = useState("");
  const [formCustomModels, setFormCustomModels] = useState<string[]>([]);
  const [dynamicModels, setDynamicModels] = useState<any[]>([]);
  const [isLoadingModels, setIsLoadingModels] = useState(false);
  const [suggestedModels, setSuggestedModels] = useState<
    { id: string; name: string; contextLength?: number }[]
  >([]);
  const modelsRequestId = useRef(0);

  // Device code flow state
  const [deviceCodeData, setDeviceCodeData] = useState<{
    deviceCode: string;
    userCode: string;
    verificationUri: string;
    verificationUriComplete?: string;
    interval: number;
  } | null>(null);
  const [isPollingDevice, setIsPollingDevice] = useState(false);

  useEffect(() => {
    fetchConnections();
    fetchNodes();
    fetchModels();
  }, [fetchConnections, fetchNodes, fetchModels]);

  // Discover models from the provider's public API (any provider with a modelsFetcher —
  // server 404s for providers without one). Matches 9router, which fetches for every
  // provider that declares a modelsFetcher, not just no-auth ones.
  useEffect(() => {
    setSuggestedModels([]);
    if (!selectedProviderId) return;
    let cancelled = false;
    apiFetch(`/providers/suggested-models/${selectedProviderId}`)
      .then(async (res) => {
        if (!res.ok) return;
        const json = await res.json();
        if (!cancelled) setSuggestedModels(json.data || []);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [selectedProviderId]);

  const selectProviderForEdit = useCallback(async (conn: ProviderConnection) => {
    setEditingConnection(conn);
    setFormName(conn.name || "");
    setFormApiKey(""); // Don't pre-populate write-only keys
    setFormEmail(conn.email || "");
    setFormBaseUrl(conn.providerSpecificData?.baseUrl || "");
    setFormPrefix(conn.providerSpecificData?.prefix || "");
    setFormIsActive(conn.isActive);
    setFormPriority(conn.priority || 1);
    setFormCustomModels(conn.providerSpecificData?.customModels || []);
    setFormCustomModelsInput("");
    setValidationResult(null);
    setIsCreatingNew(false);
    setSelectedProviderId(conn.provider);

    // Fetch dynamic models list
    setIsLoadingModels(true);
    const requestId = ++modelsRequestId.current;
    try {
      const res = await apiFetch(`/providers/${conn.id}/models`);
      if (res.ok && modelsRequestId.current === requestId) {
        const data = await res.json();
        setDynamicModels(data.models || []);
      }
    } catch (e) {
      console.error(e);
    } finally {
      if (modelsRequestId.current === requestId) setIsLoadingModels(false);
    }
  }, []);

  const selectNewProviderSetup = useCallback(
    (providerId: string) => {
      setSelectedProviderId(providerId);
      setEditingConnection(null);
      setFormName(REGISTRY_PROVIDERS.find((p) => p.id === providerId)?.name || "");
      setFormApiKey("");
      setFormEmail("");
      setFormBaseUrl("");
      setFormPrefix("");
      setFormIsActive(true);
      setFormPriority(connections.length + 1);
      setFormCustomModels([]);
      setFormCustomModelsInput("");
      setValidationResult(null);
      setIsCreatingNew(true);
      setDynamicModels([]);
    },
    [connections],
  );

  const handleSave = async () => {
    if (!selectedProviderId) return;

    const isCustom = ["openai-compatible", "anthropic-compatible", "custom-embedding"].includes(
      selectedProviderId,
    );

    // Structure metadata payload
    const providerSpecificData: any = {};
    if (isCustom) {
      providerSpecificData.baseUrl = formBaseUrl;
      providerSpecificData.prefix = formPrefix;
    }
    if (formCustomModels.length > 0) {
      providerSpecificData.customModels = formCustomModels;
    }

    const payload: any = {
      provider: selectedProviderId,
      authType: isCustom
        ? "apikey"
        : formApiKey
          ? "apikey"
          : REGISTRY_PROVIDERS.find((p) => p.id === selectedProviderId)?.type || "apikey",
      name: formName,
      email: formEmail || undefined,
      isActive: formIsActive,
      priority: Number(formPriority),
    };

    if (formApiKey) {
      payload.apiKey = formApiKey;
    }

    if (Object.keys(providerSpecificData).length > 0) {
      payload.providerSpecificData = providerSpecificData;
    }

    try {
      if (editingConnection) {
        await updateConnection(editingConnection.id, payload);
      } else {
        await addConnection(payload);
      }
      // Return to list view
      setSelectedProviderId(null);
      setEditingConnection(null);
      setIsCreatingNew(false);
    } catch (e) {
      setValidationResult({ valid: false, error: e instanceof Error ? e.message : String(e) });
    }
  };

  const handleDelete = async () => {
    if (!editingConnection) return;
    if (
      confirm(
        `Are you sure you want to remove the connection to ${editingConnection.name || editingConnection.provider}?`,
      )
    ) {
      await deleteConnection(editingConnection.id);
      setSelectedProviderId(null);
      setEditingConnection(null);
    }
  };

  const handleTestConnection = async () => {
    if (!selectedProviderId) return;
    setIsValidating(true);
    setValidationResult(null);

    const isCustom = ["openai-compatible", "anthropic-compatible", "custom-embedding"].includes(
      selectedProviderId,
    );
    const data: any = {
      provider: selectedProviderId,
      apiKey: formApiKey || undefined, // falls back to saved key on server if empty
    };

    if (isCustom) {
      data.providerSpecificData = { baseUrl: formBaseUrl };
    }

    try {
      const res = await validateConnection(data);
      setValidationResult(res);
    } catch (e) {
      setValidationResult({
        valid: false,
        error: e instanceof Error ? e.message : "Connection probe failed",
      });
    } finally {
      setIsValidating(false);
    }
  };

  const handleOAuthLogin = async () => {
    if (!selectedProviderId) return;
    setIsValidating(true);
    setValidationResult(null);

    try {
      const serverConfig = await getServerConfig();
      const serverOrigin = serverConfig.baseUrl.replace(/\/api\/?$/, "");
      const isGoogleProvider =
        selectedProviderId === "antigravity" ||
        selectedProviderId === "gemini-cli" ||
        selectedProviderId === "google";
      const redirectUri = isGoogleProvider
        ? `${serverOrigin}/oauth/callback`
        : "assistx://oauth/callback";
      const startRes = await apiFetch("/providers/oauth/" + selectedProviderId + "/start", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ redirectUri }),
      });
      if (!startRes.ok) throw new Error("Failed to start OAuth flow");
      const startData = await startRes.json();

      // Listen for protocol deep link callback from main process
      const callbackPromise = new Promise<{ code?: string; error?: string }>((resolve) => {
        const handleCallback = (
          _event: any,
          data: { code?: string; state?: string; error?: string },
        ) => {
          if (data.state && data.state !== startData.state) return;
          if ((window as any).electron?.ipcRenderer) {
            (window as any).electron.ipcRenderer.off("provider-oauth-callback", handleCallback);
          }
          resolve({ code: data.code, error: data.error });
        };

        if ((window as any).electron?.ipcRenderer) {
          (window as any).electron.ipcRenderer.on("provider-oauth-callback", handleCallback);
        } else {
          resolve({ error: "Electron IPC unavailable" });
        }
      });

      // Open OAuth URL in user's default system browser
      if ((window as any).electron?.ipcRenderer) {
        await (window as any).electron.ipcRenderer.invoke("open-oauth-external", {
          url: startData.authUrl,
        });
      } else {
        window.open(startData.authUrl, "_blank");
      }

      const res = await callbackPromise;

      if (res.code) {
        const callbackRes = await apiFetch("/providers/oauth/" + selectedProviderId + "/callback", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ code: res.code, state: startData.state }),
        });
        if (!callbackRes.ok) {
          const err = await callbackRes.json();
          throw new Error(err.error || "Token exchange failed");
        }
        const callbackData = await callbackRes.json();
        setValidationResult({ valid: true });
        setFormEmail(callbackData.connection?.email || "");
        setFormName(callbackData.connection?.name || formName);
        fetchConnections();
        setSelectedProviderId(null);
        setEditingConnection(null);
        setIsCreatingNew(false);
      } else if (res.error) {
        setValidationResult({ valid: false, error: res.error });
      }
    } catch (e) {
      setValidationResult({ valid: false, error: e instanceof Error ? e.message : "OAuth failed" });
    } finally {
      setIsValidating(false);
    }
  };

  const handleDeviceCodeLogin = async () => {
    if (!selectedProviderId) return;
    setIsValidating(true);
    setValidationResult(null);

    try {
      const startRes = await apiFetch("/providers/oauth/" + selectedProviderId + "/start", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ redirectUri: "" }),
      });
      if (!startRes.ok) throw new Error("Failed to start device code flow");
      const data = await startRes.json();

      setDeviceCodeData({
        deviceCode: data.deviceCode,
        userCode: data.userCode,
        verificationUri: data.verificationUri,
        verificationUriComplete: data.verificationUriComplete,
        interval: data.interval || 5,
      });

      // Open verification URL in external browser
      if (data.verificationUriComplete || data.verificationUri) {
        window.open(data.verificationUriComplete || data.verificationUri, "_blank");
      }

      setIsPollingDevice(true);
      const pollInterval = setInterval(
        async () => {
          try {
            const pollRes = await apiFetch("/providers/oauth/" + selectedProviderId + "/poll", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                deviceCode: data.deviceCode,
                codeVerifier: data.codeVerifier,
                extraData: data.extraData,
              }),
            });
            const pollData = await pollRes.json();

            if (pollData.success) {
              clearInterval(pollInterval);
              setIsPollingDevice(false);
              setDeviceCodeData(null);
              setValidationResult({ valid: true });
              fetchConnections();
              setSelectedProviderId(null);
              setEditingConnection(null);
              setIsCreatingNew(false);
            } else if (!pollData.pending) {
              clearInterval(pollInterval);
              setIsPollingDevice(false);
              setDeviceCodeData(null);
              setValidationResult({ valid: false, error: pollData.error || "Device auth failed" });
            }
          } catch {
            clearInterval(pollInterval);
            setIsPollingDevice(false);
            setDeviceCodeData(null);
            setValidationResult({ valid: false, error: "Polling failed" });
          }
        },
        (data.interval || 5) * 1000,
      );
    } catch (e) {
      setValidationResult({
        valid: false,
        error: e instanceof Error ? e.message : "Device code flow failed",
      });
    } finally {
      setIsValidating(false);
    }
  };

  const handleAddCustomModel = () => {
    const val = formCustomModelsInput.trim();
    if (val && !formCustomModels.includes(val)) {
      setFormCustomModels([...formCustomModels, val]);
      setFormCustomModelsInput("");
    }
  };

  const handleRemoveCustomModel = (modelId: string) => {
    setFormCustomModels(formCustomModels.filter((m) => m !== modelId));
  };

  // Filtered providers listing
  const filteredRegistry = REGISTRY_PROVIDERS.filter((p) => {
    const matchesSearch = p.name.toLowerCase().includes(searchQuery.toLowerCase());
    if (!matchesSearch) return false;

    if (activeTab === "all") return true;
    if (activeTab === "connected") {
      return connections.some((c: any) => c.provider === p.id && c.isActive);
    }
    return p.category === activeTab;
  });

  return (
    <div className="flex-1 flex flex-col text-zinc-100 min-h-0">
      <AnimatePresence mode="wait">
        {!selectedProviderId ? (
          // LIST VIEW
          <motion.div
            key="list"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 0.99, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="flex-1 flex flex-col min-h-0"
          >
            {/* Header */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 border-b border-zinc-800/80 pb-6">
              <div>
                <h1 className="text-2xl font-bold tracking-tight bg-gradient-to-r from-zinc-100 to-zinc-400 bg-clip-text text-transparent">
                  Providers
                </h1>
                <p className="text-sm text-zinc-400 mt-1">
                  Connect your preferred model APIs, OAuth credentials, and custom compatibility
                  endpoints.
                </p>
              </div>

              {/* Connected Count pill */}
              <div className="flex items-center gap-2 bg-zinc-900/80 border border-zinc-800 px-3 py-1.5 rounded-full text-xs font-medium text-zinc-300">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                {connections.filter((c: any) => c.isActive).length} Connected
              </div>
            </div>

            {/* Filter and Search Bar */}
            <div className="flex flex-col md:flex-row gap-4 my-6">
              {/* Search */}
              <div className="relative flex-1">
                <LuSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400 w-4 h-4" />
                <input
                  type="text"
                  placeholder="Search providers..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 bg-zinc-900/60 border border-zinc-800 hover:border-zinc-700/80 focus:border-orange-500/50 rounded-lg text-sm text-zinc-100 placeholder-zinc-500 focus:outline-none transition-colors"
                />
              </div>

              {/* Tabs */}
              <div className="flex bg-zinc-900/60 border border-zinc-800/80 p-1 rounded-lg">
                {(["all", "connected", "oauth", "free", "apikey", "custom"] as const).map((tab) => (
                  <button
                    key={tab}
                    onClick={() => setActiveTab(tab)}
                    className={cn(
                      "px-3 py-1.5 rounded-md text-xs font-medium capitalize transition-all",
                      activeTab === tab
                        ? "bg-zinc-800 text-orange-400 shadow-sm"
                        : "text-zinc-400 hover:text-zinc-200",
                    )}
                  >
                    {tab === "apikey" ? "API Key" : tab}
                  </button>
                ))}
              </div>
            </div>

            {/* Active Connections Section */}
            {connections.length > 0 && searchQuery === "" && activeTab === "all" && (
              <div className="mb-8">
                <h2 className="text-xs font-semibold text-zinc-400 tracking-wider uppercase mb-3 flex items-center gap-2">
                  <LuSlidersHorizontal className="w-3.5 h-3.5" /> Configured Connections
                </h2>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {connections.map((conn: any) => {
                    return (
                      <div
                        key={conn.id}
                        onClick={() => selectProviderForEdit(conn)}
                        className="group relative bg-zinc-950/60 border border-zinc-800 hover:border-zinc-700/80 p-4 rounded-xl cursor-pointer hover:shadow-lg hover:shadow-orange-950/5 transition-all duration-300"
                      >
                        <div className="flex items-start justify-between">
                          <div className="flex items-center gap-3">
                            <div className="p-2 bg-zinc-900 border border-zinc-800 rounded-lg group-hover:border-zinc-700 transition-colors">
                              <ModelProviderIcon
                                provider={conn.provider}
                                className="w-6 h-6 text-zinc-200"
                              />
                            </div>
                            <div>
                              <h3 className="font-semibold text-sm text-zinc-200 group-hover:text-orange-400 transition-colors">
                                {conn.name || conn.provider}
                              </h3>
                              <p className="text-xs text-zinc-500 capitalize">{conn.authType}</p>
                            </div>
                          </div>

                          <div className="flex items-center gap-2">
                            <span className="text-[10px] text-zinc-500 bg-zinc-900 px-2 py-0.5 rounded border border-zinc-800">
                              #{conn.priority || 1}
                            </span>
                            <span
                              className={cn(
                                "w-2 h-2 rounded-full",
                                conn.isActive ? "bg-emerald-500" : "bg-zinc-600",
                              )}
                            />
                          </div>
                        </div>

                        {conn.email && (
                          <p className="text-xs text-zinc-400 mt-2 font-mono truncate">
                            {conn.email}
                          </p>
                        )}
                        {conn.providerSpecificData?.baseUrl && (
                          <p className="text-[10px] text-zinc-500 mt-2 font-mono truncate">
                            {conn.providerSpecificData.baseUrl}
                          </p>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Provider Directory — grouped by category */}
            {CATEGORIES.map((cat) => {
              const categoryProviders = filteredRegistry.filter((p) => p.category === cat.key);
              if (categoryProviders.length === 0) return null;
              return (
                <div key={cat.key} className="mb-8">
                  <div className="mb-3">
                    <h2 className="text-xs font-semibold text-zinc-400 tracking-wider uppercase flex items-center gap-2">
                      <LuFolderGit className="w-3.5 h-3.5" /> {cat.label}
                      <span className="text-zinc-600 font-normal normal-case tracking-normal ml-1">
                        — {cat.description}
                      </span>
                    </h2>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
                    {categoryProviders.map((provider) => {
                      const hasConnection = connections.some(
                        (c: any) => c.provider === provider.id,
                      );
                      return (
                        <div
                          key={provider.id}
                          onClick={() => {
                            const existing = connections.find(
                              (c: any) => c.provider === provider.id,
                            );
                            if (existing) selectProviderForEdit(existing);
                            else selectNewProviderSetup(provider.id);
                          }}
                          className="group bg-zinc-900/30 border border-zinc-800/80 hover:border-zinc-700/80 p-3.5 rounded-xl cursor-pointer transition-all duration-300 hover:bg-zinc-900/60"
                        >
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2.5 min-w-0">
                              <div className="p-1.5 bg-zinc-900/80 border border-zinc-800 rounded-lg group-hover:border-zinc-700/80 transition-colors shrink-0">
                                <ModelProviderIcon
                                  provider={provider.id}
                                  className="w-5 h-5 text-zinc-300"
                                />
                              </div>
                              <div className="min-w-0">
                                <h3 className="font-medium text-sm text-zinc-200 group-hover:text-zinc-100 truncate">
                                  {provider.name}
                                </h3>
                                <p className="text-[10px] text-zinc-500 capitalize">
                                  {provider.type === "custom"
                                    ? "Custom Node"
                                    : provider.type === "device_code"
                                      ? "device code"
                                      : provider.type}
                                </p>
                              </div>
                            </div>
                            <div className="text-zinc-500 group-hover:text-orange-400 transition-colors shrink-0 ml-2">
                              {hasConnection ? (
                                <span className="text-[10px] text-emerald-500 bg-emerald-950/40 border border-emerald-900 px-2 py-0.5 rounded-full font-medium">
                                  Connected
                                </span>
                              ) : (
                                <LuPlus className="w-4 h-4" />
                              )}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </motion.div>
        ) : (
          // DETAIL / SETUP FORM VIEW
          <motion.div
            key="detail"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 0.99, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="flex-1 flex flex-col min-h-0"
          >
            {/* Navigation Header */}
            <div className="flex items-center justify-between border-b border-zinc-800/80 pb-4 mb-6">
              <button
                onClick={() => {
                  setSelectedProviderId(null);
                  setEditingConnection(null);
                }}
                className="flex items-center gap-2 text-sm text-zinc-400 hover:text-zinc-100 transition-colors group"
              >
                <LuArrowLeft className="w-4 h-4 group-hover:-translate-x-0.5 transition-transform" />
                Back to Providers
              </button>

              <h2 className="text-xs font-semibold text-zinc-500 uppercase tracking-widest font-mono">
                {isCreatingNew ? "Setup Connection" : "Connection Details"}
              </h2>
            </div>

            {/* Layout Grid */}
            <div className="flex-1 grid grid-cols-1 lg:grid-cols-3 gap-6 min-h-0 overflow-y-auto pr-1">
              {/* Left Form (2 Columns) */}
              <div className="lg:col-span-2 space-y-6">
                {/* Configuration Card */}
                <div className="bg-zinc-950/60 border border-zinc-800/80 rounded-2xl p-6 shadow-sm">
                  <div className="flex items-center gap-4 mb-6">
                    <div className="p-3 bg-zinc-900 border border-zinc-800 rounded-xl">
                      <ModelProviderIcon
                        provider={selectedProviderId}
                        className="w-8 h-8 text-zinc-100"
                      />
                    </div>
                    <div>
                      <h2 className="text-lg font-semibold text-zinc-200">
                        {formName ||
                          REGISTRY_PROVIDERS.find((p) => p.id === selectedProviderId)?.name}
                      </h2>
                      <p className="text-xs text-zinc-500 capitalize">
                        Configure {selectedProviderId} connection settings
                      </p>
                    </div>
                  </div>

                  <div className="space-y-4">
                    {/* Display Name */}
                    <div>
                      <label className="block text-xs font-medium text-zinc-400 mb-1.5">
                        Connection Name
                      </label>
                      <input
                        type="text"
                        value={formName}
                        onChange={(e) => setFormName(e.target.value)}
                        placeholder="My API Connection"
                        className="w-full px-3.5 py-2 bg-zinc-900/80 border border-zinc-800 focus:border-orange-500/50 rounded-lg text-sm text-zinc-100 placeholder-zinc-600 focus:outline-none transition-colors"
                      />
                    </div>

                    {/* OAuth Login */}
                    {REGISTRY_PROVIDERS.find((p) => p.id === selectedProviderId)?.type ===
                      "oauth" && (
                      <div className="space-y-3">
                        <button
                          type="button"
                          onClick={handleOAuthLogin}
                          disabled={isValidating}
                          className="w-full py-2.5 bg-zinc-900 hover:bg-zinc-800 disabled:opacity-50 border border-zinc-800 text-xs font-semibold rounded-lg flex items-center justify-center gap-2 transition-colors cursor-pointer text-zinc-200"
                        >
                          {isValidating ? <LuLoader className="w-3.5 h-3.5 animate-spin" /> : null}
                          Sign In with OAuth
                        </button>
                      </div>
                    )}

                    {/* Device Code Login */}
                    {REGISTRY_PROVIDERS.find((p) => p.id === selectedProviderId)?.type ===
                      "device_code" && (
                      <div className="space-y-3">
                        <button
                          type="button"
                          onClick={handleDeviceCodeLogin}
                          disabled={isPollingDevice || isValidating}
                          className="w-full py-2.5 bg-zinc-900 hover:bg-zinc-800 disabled:opacity-50 border border-zinc-800 text-xs font-semibold rounded-lg flex items-center justify-center gap-2 transition-colors cursor-pointer text-zinc-200"
                        >
                          {isPollingDevice ? (
                            <LuLoader className="w-3.5 h-3.5 animate-spin" />
                          ) : null}
                          {isPollingDevice
                            ? "Waiting for Authorization..."
                            : "Login with Device Code"}
                        </button>

                        {deviceCodeData && (
                          <div className="p-4 rounded-lg border border-zinc-800 bg-zinc-950/60">
                            <p className="text-xs text-zinc-400 mb-2">
                              Enter this code on the provider's website:
                            </p>
                            <div className="flex items-center justify-center py-3 px-4 bg-zinc-900 rounded-lg border border-zinc-700 mb-3">
                              <span className="text-2xl font-mono font-bold text-orange-400 tracking-widest select-all">
                                {deviceCodeData.userCode}
                              </span>
                            </div>
                            <a
                              href={
                                deviceCodeData.verificationUriComplete ||
                                deviceCodeData.verificationUri
                              }
                              target="_blank"
                              rel="noreferrer"
                              className="w-full py-2 bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-xs font-semibold rounded-lg flex items-center justify-center gap-2 transition-colors cursor-pointer text-zinc-200"
                            >
                              Open Authorization Page <LuExternalLink className="w-3 h-3" />
                            </a>
                            {isPollingDevice && (
                              <p className="text-xs text-zinc-500 mt-3 flex items-center gap-2">
                                <LuLoader className="w-3 h-3 animate-spin" /> Waiting for
                                authorization...
                              </p>
                            )}
                          </div>
                        )}
                      </div>
                    )}

                    {/* API Key Input */}
                    {REGISTRY_PROVIDERS.find((p) => p.id === selectedProviderId)?.type ===
                      "apikey" && (
                      <div>
                        <div className="flex justify-between items-center mb-1.5">
                          <label className="block text-xs font-medium text-zinc-400">
                            API Credentials
                          </label>
                          {REGISTRY_PROVIDERS.find((p) => p.id === selectedProviderId)?.docsUrl && (
                            <a
                              href={
                                REGISTRY_PROVIDERS.find((p) => p.id === selectedProviderId)?.docsUrl
                              }
                              target="_blank"
                              rel="noreferrer"
                              className="text-[10px] text-orange-400 hover:underline flex items-center gap-1"
                            >
                              Get API Key <LuExternalLink className="w-2.5 h-2.5" />
                            </a>
                          )}
                        </div>
                        <input
                          type="password"
                          value={formApiKey}
                          onChange={(e) => setFormApiKey(e.target.value)}
                          placeholder={
                            editingConnection
                              ? "•••••••••••••••• (Leave empty to keep current)"
                              : "sk-..."
                          }
                          className="w-full px-3.5 py-2 bg-zinc-900/80 border border-zinc-800 focus:border-orange-500/50 rounded-lg text-sm text-zinc-100 placeholder-zinc-600 focus:outline-none transition-colors"
                        />
                      </div>
                    )}

                    {/* Custom Endpoint Fields */}
                    {["openai-compatible", "anthropic-compatible", "custom-embedding"].includes(
                      selectedProviderId,
                    ) && (
                      <>
                        <div>
                          <label className="block text-xs font-medium text-zinc-400 mb-1.5">
                            Base Endpoint URL
                          </label>
                          <input
                            type="text"
                            value={formBaseUrl}
                            onChange={(e) => setFormBaseUrl(e.target.value)}
                            placeholder="https://api.myendpoint.com/v1"
                            className="w-full px-3.5 py-2 bg-zinc-900/80 border border-zinc-800 focus:border-orange-500/50 rounded-lg text-sm text-zinc-100 placeholder-zinc-600 focus:outline-none transition-colors"
                          />
                        </div>
                        <div>
                          <label className="block text-xs font-medium text-zinc-400 mb-1.5">
                            Model ID Prefix (Optional)
                          </label>
                          <input
                            type="text"
                            value={formPrefix}
                            onChange={(e) => setFormPrefix(e.target.value)}
                            placeholder="my-prefix:"
                            className="w-full px-3.5 py-2 bg-zinc-900/80 border border-zinc-800 focus:border-orange-500/50 rounded-lg text-sm text-zinc-100 placeholder-zinc-600 focus:outline-none transition-colors"
                          />
                        </div>
                        <div>
                          <label className="block text-xs font-medium text-zinc-400 mb-1.5">
                            API Auth Credentials (Optional)
                          </label>
                          <input
                            type="password"
                            value={formApiKey}
                            onChange={(e) => setFormApiKey(e.target.value)}
                            placeholder={
                              editingConnection
                                ? "•••••••••••••••• (Leave empty to keep current)"
                                : "API Key / Token"
                            }
                            className="w-full px-3.5 py-2 bg-zinc-900/80 border border-zinc-800 focus:border-orange-500/50 rounded-lg text-sm text-zinc-100 placeholder-zinc-600 focus:outline-none transition-colors"
                          />
                        </div>
                      </>
                    )}

                    {/* Priority & Active Status */}
                    <div className="grid grid-cols-2 gap-4 pt-2">
                      <div>
                        <label className="block text-xs font-medium text-zinc-400 mb-1.5">
                          Priority Order
                        </label>
                        <input
                          type="number"
                          min="1"
                          max="99"
                          value={formPriority}
                          onChange={(e) => setFormPriority(Number(e.target.value))}
                          className="w-full px-3.5 py-2 bg-zinc-900/80 border border-zinc-800 focus:border-orange-500/50 rounded-lg text-sm text-zinc-100 placeholder-zinc-600 focus:outline-none transition-colors"
                        />
                      </div>
                      <div className="flex flex-col justify-end pb-1.5">
                        <label className="flex items-center gap-3 cursor-pointer select-none py-1">
                          <input
                            type="checkbox"
                            checked={formIsActive}
                            onChange={(e) => setFormIsActive(e.target.checked)}
                            className="w-4 h-4 accent-orange-500 rounded border-zinc-800"
                          />
                          <span className="text-sm font-medium text-zinc-300">
                            Active Connection
                          </span>
                        </label>
                      </div>
                    </div>
                  </div>

                  {/* Actions & Testing Section */}
                  <div className="border-t border-zinc-800/80 mt-6 pt-6 flex flex-col md:flex-row justify-between items-stretch md:items-center gap-4">
                    <button
                      onClick={handleTestConnection}
                      disabled={isValidating}
                      className="px-4 py-2 bg-zinc-900 hover:bg-zinc-800 disabled:opacity-50 border border-zinc-800 hover:border-zinc-700 text-xs font-semibold rounded-lg flex items-center justify-center gap-2 transition-all cursor-pointer"
                    >
                      {isValidating ? (
                        <LuLoader className="w-3.5 h-3.5 animate-spin" />
                      ) : (
                        <LuRefreshCw className="w-3.5 h-3.5" />
                      )}
                      Test Connection
                    </button>

                    <div className="flex gap-3">
                      {editingConnection && (
                        <button
                          onClick={handleDelete}
                          className="px-4 py-2 bg-red-950/20 border border-red-900/50 hover:bg-red-950/40 text-red-400 hover:text-red-300 text-xs font-semibold rounded-lg flex items-center justify-center gap-2 transition-all cursor-pointer"
                        >
                          <LuTrash2 className="w-3.5 h-3.5" /> Delete
                        </button>
                      )}
                      <button
                        onClick={handleSave}
                        className="px-5 py-2 bg-gradient-to-r from-orange-600 to-orange-500 hover:from-orange-500 hover:to-orange-400 text-zinc-100 text-xs font-bold rounded-lg shadow transition-all cursor-pointer"
                      >
                        Save Configuration
                      </button>
                    </div>
                  </div>

                  {/* Validation Probe Results */}
                  {validationResult && (
                    <div
                      className={cn(
                        "mt-4 p-3.5 rounded-lg border text-xs flex items-start gap-2.5 transition-all",
                        validationResult.valid
                          ? "bg-emerald-950/20 border-emerald-900/60 text-emerald-400"
                          : "bg-red-950/20 border-red-900/60 text-red-400",
                      )}
                    >
                      {validationResult.valid ? (
                        <>
                          <LuCheck className="w-4 h-4 mt-0.5 shrink-0" />
                          <div>
                            <span className="font-bold">Connection successful!</span> Credentials
                            and endpoint verified.
                          </div>
                        </>
                      ) : (
                        <>
                          <LuX className="w-4 h-4 mt-0.5 shrink-0" />
                          <div>
                            <span className="font-bold">Connection failed.</span>{" "}
                            {validationResult.error || "Please check credentials."}
                          </div>
                        </>
                      )}
                    </div>
                  )}
                </div>

                {/* Custom Models List Configuration */}
                {["openai-compatible", "anthropic-compatible", "custom-embedding"].includes(
                  selectedProviderId,
                ) && (
                  <div className="bg-zinc-950/60 border border-zinc-800/80 rounded-2xl p-6">
                    <h3 className="text-sm font-semibold text-zinc-200 mb-2">
                      Custom Models Configuration
                    </h3>
                    <p className="text-xs text-zinc-500 mb-4">
                      Add model identifiers to display in chat interfaces from your custom node API.
                    </p>

                    <div className="flex gap-2 mb-4">
                      <input
                        type="text"
                        value={formCustomModelsInput}
                        onChange={(e) => setFormCustomModelsInput(e.target.value)}
                        onKeyDown={(e) => e.key === "Enter" && handleAddCustomModel()}
                        placeholder="e.g. llama3-70b"
                        className="flex-1 px-3.5 py-1.5 bg-zinc-900/80 border border-zinc-800 focus:border-orange-500/50 rounded-lg text-xs text-zinc-100 focus:outline-none transition-colors"
                      />
                      <button
                        onClick={handleAddCustomModel}
                        className="px-3 py-1.5 bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-xs font-semibold rounded-lg flex items-center justify-center gap-1 transition-all cursor-pointer text-zinc-200"
                      >
                        <LuPlus className="w-3.5 h-3.5" /> Add
                      </button>
                    </div>

                    {formCustomModels.length > 0 ? (
                      <div className="flex flex-wrap gap-2 max-h-40 overflow-y-auto pr-1">
                        {formCustomModels.map((model) => (
                          <div
                            key={model}
                            className="flex items-center gap-1.5 bg-zinc-900 border border-zinc-800 px-2.5 py-1 rounded-md text-xs font-mono text-zinc-300"
                          >
                            <span>{model}</span>
                            <button
                              onClick={() => handleRemoveCustomModel(model)}
                              className="text-zinc-500 hover:text-zinc-300 transition-colors"
                            >
                              <LuX className="w-3 h-3" />
                            </button>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-xs text-zinc-600 font-mono italic">
                        No custom models added yet.
                      </p>
                    )}
                  </div>
                )}
              </div>

              {/* Right Models List (1 Column) */}
              <div className="space-y-6">
                <div className="bg-zinc-950/60 border border-zinc-800/80 rounded-2xl p-6 flex flex-col h-[500px]">
                  <h3 className="text-sm font-semibold text-zinc-200 mb-2">Available Models</h3>
                  <p className="text-xs text-zinc-500 mb-4">
                    List of AI models discovered for this connection.
                  </p>

                  <div className="flex-1 overflow-y-auto pr-1 space-y-2">
                    {isLoadingModels ? (
                      <div className="flex items-center justify-center h-full">
                        <LuLoader className="w-6 h-6 animate-spin text-zinc-500" />
                      </div>
                    ) : dynamicModels.length > 0 ? (
                      dynamicModels.map((m: any) => (
                        <div
                          key={m.id}
                          className="flex items-center justify-between p-2.5 bg-zinc-900/50 hover:bg-zinc-900 border border-zinc-800/80 rounded-lg text-xs transition-colors"
                        >
                          <div className="min-w-0 flex-1">
                            <p className="font-semibold text-zinc-200 truncate">{m.name || m.id}</p>
                            <p className="font-mono text-[9px] text-zinc-500 mt-0.5 truncate">
                              {m.id}
                            </p>
                          </div>
                        </div>
                      ))
                    ) : (
                      <div className="flex flex-col items-center justify-center h-full text-zinc-500">
                        <p className="text-xs italic">No models loaded.</p>
                      </div>
                    )}
                  </div>

                  {/* Add model — manual entry */}
                  <div className="mt-4 border-t border-zinc-800/80 pt-4">
                    <div className="flex gap-2">
                      <input
                        type="text"
                        value={formCustomModelsInput}
                        onChange={(e) => setFormCustomModelsInput(e.target.value)}
                        onKeyDown={(e) => e.key === "Enter" && handleAddCustomModel()}
                        placeholder="Add model by ID, e.g. gpt-5-nano-free"
                        className="flex-1 px-3 py-1.5 bg-zinc-900/80 border border-zinc-800 focus:border-orange-500/50 rounded-lg text-xs text-zinc-100 placeholder-zinc-600 focus:outline-none transition-colors"
                      />
                      <button
                        onClick={handleAddCustomModel}
                        className="px-3 py-1.5 bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-xs font-semibold rounded-lg flex items-center justify-center gap-1 transition-all cursor-pointer text-zinc-200"
                      >
                        <LuPlus className="w-3.5 h-3.5" /> Add
                      </button>
                    </div>

                    {/* Suggested free models from the provider's public API */}
                    {(() => {
                      const added = new Set([
                        ...formCustomModels,
                        ...dynamicModels.map((m: any) => m.id),
                      ]);
                      const notAdded = suggestedModels.filter((m) => !added.has(m.id));
                      if (notAdded.length === 0) return null;
                      return (
                        <div className="mt-3">
                          <p className="text-[10px] text-zinc-500 mb-2">Suggested free models:</p>
                          <div className="flex flex-wrap gap-1.5 max-h-24 overflow-y-auto pr-1">
                            {notAdded.map((m) => (
                              <button
                                key={m.id}
                                onClick={() => {
                                  if (!formCustomModels.includes(m.id)) {
                                    setFormCustomModels([...formCustomModels, m.id]);
                                  }
                                }}
                                className="flex items-center gap-1 px-2 py-1 rounded-md border border-zinc-800 text-[10px] font-mono text-zinc-400 hover:text-orange-400 hover:border-orange-500/40 hover:bg-orange-500/5 transition-colors cursor-pointer"
                                title={
                                  m.contextLength
                                    ? `${m.name} · ${Math.round(m.contextLength / 1000)}k ctx`
                                    : m.name
                                }
                              >
                                <LuPlus className="w-2.5 h-2.5" />
                                {m.id.split("/").pop()}
                              </button>
                            ))}
                          </div>
                        </div>
                      );
                    })()}
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
