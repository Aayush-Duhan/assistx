export default {
  id: "opencode",
  priority: 40,
  hasFree: true,
  alias: "oc",
  uiAlias: "oc",
  display: {
    name: "OpenCode Free",
    icon: "terminal",
    color: "#E87040",
    textIcon: "OC",
  },
  category: "free",
  noAuth: true,
  transport: {
    // Full chat endpoint (assistx convention) — 9router's executor appends this path itself
    baseUrl: "https://opencode.ai/zen/v1/chat/completions",
    headers: {
      "x-opencode-client": "desktop",
    },
    noAuth: true,
  },
  models: [],
  modelsFetcher: { url: "https://opencode.ai/zen/v1/models", type: "opencode-free" },
  passthroughModels: true,
};
