// Single source: build PROVIDERS + PROVIDER_MODELS from registry/{id}.js (transport + models co-located).
import REGISTRY from "./registry/index";
import { PROVIDER_DEFAULTS } from "./schema";
import { normalizeModel } from "./models/schema";
import { buildTtsProviderModels } from "./ttsModels";
import type { TransportConfig, OAuthConfig } from "./types";

const OAUTH_INJECT_FIELDS = ["clientId", "clientSecret", "tokenUrl"] as const;

function buildTransport(transport: TransportConfig, oauth?: OAuthConfig): TransportConfig {
  const t: any = { ...transport };
  if (!t.format) t.format = PROVIDER_DEFAULTS.format;
  if (oauth) {
    for (const f of OAUTH_INJECT_FIELDS) {
      if (t[f] === undefined && oauth[f] !== undefined) {
        t[f] = oauth[f];
      }
    }
  }
  return t;
}

const MEDIA_KEYS = new Set([
  "serviceKinds", "ttsConfig", "sttConfig", "embeddingConfig",
  "imageConfig", "imageToTextConfig", "videoConfig", "musicConfig",
  "searchViaChat", "searchConfig", "fetchConfig",
  "modelsFetcher", "mediaPriority", "hiddenKinds",
]);

export const PROVIDERS: Record<string, any> = {};
export const PROVIDER_MODELS: Record<string, any[]> = {};
export const PROVIDER_OAUTH: Record<string, OAuthConfig> = {};
export const PROVIDER_MEDIA: Record<string, any> = {};

for (const rawEntry of REGISTRY) {
  const entry = rawEntry as any;
  if (entry.transport) {
    PROVIDERS[entry.id] = buildTransport(entry.transport, entry.oauth);
    if (entry.transports) PROVIDERS[entry.id].transports = entry.transports;
  }
  if (entry.models !== undefined) {
    const models = entry.models.map(normalizeModel);
    PROVIDER_MODELS[entry.id] = models;
    // Alias key kept for routing-engine lookups (e.g. "oc/model"); consumers should use id.
    if (entry.alias && entry.alias !== entry.id) PROVIDER_MODELS[entry.alias] = models;
  }
  if (entry.oauth) {
    PROVIDER_OAUTH[entry.id] = { ...entry.oauth };
    if (entry.transport) {
      if (PROVIDER_OAUTH[entry.id].clientId === undefined && entry.transport.clientId !== undefined) {
        PROVIDER_OAUTH[entry.id].clientId = entry.transport.clientId;
      }
      if (PROVIDER_OAUTH[entry.id].clientSecret === undefined && entry.transport.clientSecret !== undefined) {
        PROVIDER_OAUTH[entry.id].clientSecret = entry.transport.clientSecret;
      }
    }
  }
  
  const mediaFields: any = {};
  for (const k of MEDIA_KEYS) {
    if ((entry as any)[k] !== undefined) {
      mediaFields[k] = (entry as any)[k];
    }
  }
  if (entry.media) Object.assign(mediaFields, entry.media);
  if (Object.keys(mediaFields).length) {
    PROVIDER_MEDIA[entry.id] = mediaFields;
  }
}


// TTS model/voice tables keyed by special names (openai-tts-models, ...), not provider ids
Object.assign(PROVIDER_MODELS, buildTtsProviderModels());
export { REGISTRY };
