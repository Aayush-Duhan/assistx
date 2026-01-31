/**
 * @file db/seed-data.ts
 * Centralized seed data for databases tables.
 * All default/built-in data that needs to be seeded is defined here.
 */

// ============================================================================
// Provider Configuration
// ============================================================================

export interface ProviderConfig {
  id: string;
  displayName: string;
}

export const PROVIDERS: ProviderConfig[] = [
  { id: "openai", displayName: "OpenAI" },
  { id: "google", displayName: "Google Gemini" },
  { id: "anthropic", displayName: "Anthropic" },
  { id: "xai", displayName: "xAI" },
  { id: "groq", displayName: "Groq" },
  { id: "openrouter", displayName: "OpenRouter" },
];

export function getProviderDisplayName(providerId: string): string {
  const provider = PROVIDERS.find((p) => p.id === providerId);
  return provider?.displayName || providerId;
}

// ============================================================================
// Built-in AI Models
// ============================================================================

export interface BuiltInModel {
  providerId: string;
  modelId: string;
  displayName: string;
  contextWindow?: number;
  maxOutputTokens?: number;
  supportsVision?: boolean;
  supportsTools?: boolean;
  isBuiltIn: true;
}

/**
 * Built-in models that ship with the application.
 * These are seeded into the database for management but marked as built-in.
 */
export const BUILT_IN_MODELS: BuiltInModel[] = [
  // OpenAI Models
  {
    providerId: "openai",
    modelId: "gpt-4.1",
    displayName: "GPT-4.1",
    contextWindow: 1000000,
    maxOutputTokens: 32768,
    supportsVision: true,
    supportsTools: true,
    isBuiltIn: true,
  },
  {
    providerId: "openai",
    modelId: "gpt-4.1-mini",
    displayName: "GPT-4.1 Mini",
    contextWindow: 1000000,
    maxOutputTokens: 32768,
    supportsVision: true,
    supportsTools: true,
    isBuiltIn: true,
  },
  {
    providerId: "openai",
    modelId: "o4-mini",
    displayName: "o4 Mini",
    contextWindow: 200000,
    maxOutputTokens: 100000,
    supportsVision: true,
    supportsTools: true,
    isBuiltIn: true,
  },
  {
    providerId: "openai",
    modelId: "o3",
    displayName: "o3",
    contextWindow: 200000,
    maxOutputTokens: 100000,
    supportsVision: true,
    supportsTools: true,
    isBuiltIn: true,
  },
  {
    providerId: "openai",
    modelId: "gpt-5",
    displayName: "GPT-5",
    contextWindow: 1000000,
    maxOutputTokens: 64000,
    supportsVision: true,
    supportsTools: true,
    isBuiltIn: true,
  },
  {
    providerId: "openai",
    modelId: "gpt-5-mini",
    displayName: "GPT-5 Mini",
    contextWindow: 500000,
    maxOutputTokens: 32768,
    supportsVision: true,
    supportsTools: true,
    isBuiltIn: true,
  },
  {
    providerId: "openai",
    modelId: "gpt-5-nano",
    displayName: "GPT-5 Nano",
    contextWindow: 256000,
    maxOutputTokens: 16384,
    supportsVision: true,
    supportsTools: true,
    isBuiltIn: true,
  },

  // Google Models
  {
    providerId: "google",
    modelId: "gemini-2.5-flash-lite",
    displayName: "Gemini 2.5 Flash Lite",
    contextWindow: 1000000,
    maxOutputTokens: 65536,
    supportsVision: true,
    supportsTools: true,
    isBuiltIn: true,
  },
  {
    providerId: "google",
    modelId: "gemini-2.5-flash",
    displayName: "Gemini 2.5 Flash",
    contextWindow: 1000000,
    maxOutputTokens: 65536,
    supportsVision: true,
    supportsTools: true,
    isBuiltIn: true,
  },
  {
    providerId: "google",
    modelId: "gemini-2.5-pro",
    displayName: "Gemini 2.5 Pro",
    contextWindow: 1000000,
    maxOutputTokens: 65536,
    supportsVision: true,
    supportsTools: true,
    isBuiltIn: true,
  },

  // Anthropic Models
  {
    providerId: "anthropic",
    modelId: "claude-4-sonnet",
    displayName: "Claude 4 Sonnet",
    contextWindow: 200000,
    maxOutputTokens: 64000,
    supportsVision: true,
    supportsTools: true,
    isBuiltIn: true,
  },
  {
    providerId: "anthropic",
    modelId: "claude-4-opus",
    displayName: "Claude 4 Opus",
    contextWindow: 200000,
    maxOutputTokens: 32000,
    supportsVision: true,
    supportsTools: true,
    isBuiltIn: true,
  },
  {
    providerId: "anthropic",
    modelId: "claude-3-7-sonnet",
    displayName: "Claude 3.7 Sonnet",
    contextWindow: 200000,
    maxOutputTokens: 64000,
    supportsVision: true,
    supportsTools: true,
    isBuiltIn: true,
  },

  // xAI Models
  {
    providerId: "xai",
    modelId: "grok-4",
    displayName: "Grok 4",
    contextWindow: 256000,
    maxOutputTokens: 32768,
    supportsVision: true,
    supportsTools: true,
    isBuiltIn: true,
  },
  {
    providerId: "xai",
    modelId: "grok-3",
    displayName: "Grok 3",
    contextWindow: 131072,
    maxOutputTokens: 32768,
    supportsVision: true,
    supportsTools: true,
    isBuiltIn: true,
  },
  {
    providerId: "xai",
    modelId: "grok-3-mini",
    displayName: "Grok 3 Mini",
    contextWindow: 131072,
    maxOutputTokens: 16384,
    supportsVision: false,
    supportsTools: true,
    isBuiltIn: true,
  },

  // Groq Models
  {
    providerId: "groq",
    modelId: "kimi-k2-instruct",
    displayName: "Kimi K2 Instruct",
    contextWindow: 131072,
    maxOutputTokens: 8192,
    supportsVision: false,
    supportsTools: true,
    isBuiltIn: true,
  },
  {
    providerId: "groq",
    modelId: "llama-4-scout-17b",
    displayName: "Llama 4 Scout 17B",
    contextWindow: 131072,
    maxOutputTokens: 16384,
    supportsVision: true,
    supportsTools: true,
    isBuiltIn: true,
  },
  {
    providerId: "groq",
    modelId: "gpt-oss-20b",
    displayName: "GPT-OSS 20B",
    contextWindow: 131072,
    maxOutputTokens: 8192,
    supportsVision: false,
    supportsTools: true,
    isBuiltIn: true,
  },
  {
    providerId: "groq",
    modelId: "gpt-oss-120b",
    displayName: "GPT-OSS 120B",
    contextWindow: 131072,
    maxOutputTokens: 8192,
    supportsVision: false,
    supportsTools: true,
    isBuiltIn: true,
  },
  {
    providerId: "groq",
    modelId: "qwen3-32b",
    displayName: "Qwen3 32B",
    contextWindow: 131072,
    maxOutputTokens: 8192,
    supportsVision: false,
    supportsTools: true,
    isBuiltIn: true,
  },

  // OpenRouter Models
  {
    providerId: "openrouter",
    modelId: "qwen3-coder:free",
    displayName: "Qwen3 Coder (Free)",
    contextWindow: 40960,
    maxOutputTokens: 8192,
    supportsVision: false,
    supportsTools: true,
    isBuiltIn: true,
  },
  {
    providerId: "openrouter",
    modelId: "deepseek-v3:free",
    displayName: "DeepSeek V3 (Free)",
    contextWindow: 65536,
    maxOutputTokens: 8192,
    supportsVision: false,
    supportsTools: true,
    isBuiltIn: true,
  },
];

/**
 * Get built-in model IDs grouped by provider.
 * @returns A record mapping provider IDs to arrays of model IDs.
 */
export function getBuiltInModelsByProvider(): Record<string, string[]> {
  const result: Record<string, string[]> = {};
  for (const model of BUILT_IN_MODELS) {
    if (!result[model.providerId]) {
      result[model.providerId] = [];
    }
    result[model.providerId].push(model.modelId);
  }
  return result;
}

// ============================================================================
// Default Modes
// ============================================================================

export interface DefaultMode {
  id: string;
  name: string;
  description: string;
  systemPrompt: string;
}

export const DEFAULT_MODES: DefaultMode[] = [
  {
    id: "student",
    name: "Student",
    description: "Optimized for learning, explanations, and study assistance",
    systemPrompt:
      "You are a helpful tutor and learning assistant. Explain concepts clearly, break down complex topics into digestible parts, provide examples, and encourage understanding over memorization. Adapt your explanations to the student's level.",
  },
  {
    id: "developer",
    name: "Developer",
    description: "Technical coding assistance, debugging, and architecture guidance",
    systemPrompt:
      "You are an expert software developer and technical advisor. Provide clean, efficient code solutions with best practices. Help debug issues, explain technical concepts, suggest architectural improvements, and write well-documented code.",
  },
  {
    id: "sales",
    name: "Sales",
    description: "Sales scripts, objection handling, and pitch assistance",
    systemPrompt:
      "You are an experienced sales professional and coach. Help craft compelling sales pitches, handle objections effectively, write persuasive emails, and provide strategies for closing deals. Focus on value-based selling and building relationships.",
  },
  {
    id: "writer",
    name: "Writer",
    description: "Creative writing, editing, and content generation",
    systemPrompt:
      "You are a skilled writer and editor. Help with creative writing, content creation, editing, and proofreading. Maintain the user's voice while improving clarity, flow, and engagement. Offer suggestions for stronger word choices and structure.",
  },
  {
    id: "analyst",
    name: "Analyst",
    description: "Data analysis, research, and report generation",
    systemPrompt:
      "You are a skilled data analyst and researcher. Help analyze data, identify patterns and insights, create reports, and present findings clearly. Focus on accuracy, actionable insights, and clear data visualization recommendations.",
  },
];

// ============================================================================
// Default Agents
// ============================================================================

export interface DefaultAgent {
  id: string;
  name: string;
  description: string;
  role: string;
  systemPrompt: string;
  iconUrl?: string;
  iconBgColor?: string;
}

export const DEFAULT_AGENTS: DefaultAgent[] = [
  {
    id: "code-assistant",
    name: "Code Assistant",
    description: "Expert in coding, debugging, and software architecture",
    role: "Software Developer",
    systemPrompt:
      "You are an expert software developer. Help with coding tasks, debugging, code reviews, and architectural decisions. Write clean, efficient, and well-documented code. Explain technical concepts clearly.",
    iconUrl: "https://cdn.jsdelivr.net/npm/emoji-datasource-apple/img/apple/64/1f4bb.png",
    iconBgColor: "oklch(82.8% 0.111 230.318)",
  },
  {
    id: "research-helper",
    name: "Research Helper",
    description: "Thorough researcher for in-depth analysis and information gathering",
    role: "Research Analyst",
    systemPrompt:
      "You are a thorough research analyst. Help gather information, analyze data, summarize findings, and provide well-sourced insights. Be comprehensive yet concise in your analysis.",
    iconUrl: "https://cdn.jsdelivr.net/npm/emoji-datasource-apple/img/apple/64/1f50d.png",
    iconBgColor: "oklch(84.5% 0.143 164.978)",
  },
];
