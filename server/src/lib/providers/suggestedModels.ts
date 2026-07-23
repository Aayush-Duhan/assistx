// Fetch and filter suggested models from a provider's public models API (no auth required).
// Ported from 9router's src/app/api/providers/suggested-models (route.js + filters.js).

const KNOWN_FREE_OPENCODE_MODELS = ["big-pickle"];

export type SuggestedModel = { id: string; name: string; contextLength?: number };
type Filter = (models: any[]) => SuggestedModel[];

const FILTERS: Record<string, Filter> = {
  "openrouter-free": (models) =>
    models
      .filter(
        (m) =>
          m.pricing?.prompt === "0" &&
          m.pricing?.completion === "0" &&
          m.context_length >= 200000
      )
      .map((m) => ({ id: m.id, name: m.name, contextLength: m.context_length }))
      .sort((a, b) => (b.contextLength ?? 0) - (a.contextLength ?? 0)),

  "opencode-free": (models) =>
    models
      .filter((m) => m.id?.endsWith("-free") || KNOWN_FREE_OPENCODE_MODELS.includes(m.id))
      .map((m) => ({ id: m.id, name: m.id })),

  // models.dev returns a large catalog; keep only mimo models
  "mimo-free": (models) =>
    models
      .filter((m) => m.id?.startsWith("mimo") || m.name?.toLowerCase().includes("mimo"))
      .map((m) => ({ id: m.id, name: m.name || m.id })),
};

const CACHE_TTL_MS = 10 * 60 * 1000; // 10 minutes
const cache = new Map<string, { data: SuggestedModel[]; expiresAt: number }>();

export async function fetchSuggestedModels(
  fetcher: { url: string; type: string } | undefined
): Promise<SuggestedModel[]> {
  if (!fetcher?.url || !fetcher?.type) return [];

  const cached = cache.get(fetcher.url);
  if (cached && Date.now() < cached.expiresAt) return cached.data;

  try {
    const res = await fetch(fetcher.url, { signal: AbortSignal.timeout(10000) });
    if (!res.ok) return [];
    const json: any = await res.json();
    const raw = json.data ?? json.models ?? json;
    const list = Array.isArray(raw) ? raw : [];
    const filter = FILTERS[fetcher.type];
    // Unknown type = OpenAI-style passthrough: accept every model id
    const data = filter
      ? filter(list)
      : list.map((m: any) => ({ id: m.id, name: m.name || m.id }));
    cache.set(fetcher.url, { data, expiresAt: Date.now() + CACHE_TTL_MS });
    return data;
  } catch {
    return [];
  }
}
