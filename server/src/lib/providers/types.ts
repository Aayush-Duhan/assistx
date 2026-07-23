export interface ModelEntry {
  id: string;
  name?: string;
  kind?: string;
  type?: string;
  params?: string[];
  dimensions?: number;
  upstreamModelId?: string;
  quotaFamily?: string;
}

export interface ProviderDisplay {
  name: string;
  icon?: string;
  color?: string;
  textIcon?: string;
  website?: string;
  notice?: {
    apiKeyUrl?: string;
    signupUrl?: string;
  };
  deprecated?: boolean;
  deprecationNotice?: string;
  kindNotice?: Record<string, string>;
  mediaPriority?: number;
}

export interface TransportConfig {
  baseUrl?: string;
  format?: string;
  headers?: Record<string, string>;
  auth?: {
    header?: string;
    scheme?: string;
    source?: string[];
  };
  forceStream?: boolean;
  urlSuffix?: string;
  quirks?: Record<string, any>;
  retry?: Record<number | string, any>;
  timeoutMs?: number;
  executor?: string;
  clientId?: string;
  clientSecret?: string;
  tokenUrl?: string;
  refreshUrl?: string;
  usage?: any;
  modelsFetcher?: {
    url: string;
    type?: string;
  };
  validateUrl?: string;
  responsesUrl?: string;
  regions?: Record<string, string>;
  defaultRegion?: string;
}

export interface OAuthConfig {
  clientId?: string;
  clientSecret?: string;
  authorizeUrl?: string;
  tokenUrl?: string;
  deviceCodeUrl?: string;
  refreshUrl?: string;
  scope?: string;
  scopes?: string[];
  redirectUri?: string;
  fixedPort?: number;
  callbackPath?: string;
  codeChallengeMethod?: string;
  extraParams?: Record<string, any>;
  refresh?: {
    encoding?: string;
    scope?: string;
  };
  refreshLeadMs?: number;
  userInfoUrl?: string;
  // Provider-specific fields (Cline, Kimchi, iFlow, KiloCode, CodeBuddy, Kiro, etc.)
  tokenExchangeUrl?: string;
  webAppUrl?: string;
  validationUrl?: string;
  appBaseUrl?: string;
  apiBaseUrl?: string;
  initiateUrl?: string;
  pollUrlBase?: string;
  stateUrl?: string;
  platform?: string;
  userAgent?: string;
  pollInterval?: number;
  startUrl?: string;
  clientName?: string;
  clientType?: string;
  grantTypes?: string[];
  issuerUrl?: string;
  authorizeDeviceUrl?: string;
  referrer?: string;
  modelsUrl?: string;
  [key: string]: any; // ponytail: allow extra fields from registry; tighten when stabilized
}

export interface MediaConfig {
  serviceKinds?: string[];
  ttsConfig?: any;
  sttConfig?: any;
  embeddingConfig?: any;
  imageConfig?: any;
  searchViaChat?: {
    defaultModel: string;
    pricingUrl?: string;
  };
  hiddenKinds?: string[];
}

export interface RegistryEntry {
  id: string;
  priority?: number;
  alias?: string;
  aliases?: string[];
  uiAlias?: string;
  category: "apikey" | "oauth" | "freeTier" | "custom" | "free" | string;
  authType?: string;
  authModes?: string[];
  hasOAuth?: boolean;
  noAuth?: boolean;
  display?: ProviderDisplay;
  transport?: TransportConfig;
  transports?: Record<string, any>;
  oauth?: OAuthConfig;
  media?: MediaConfig;
  models?: (ModelEntry | string)[];
  features?: Record<string, any>;
  thinkingConfig?: {
    options: string[];
    defaultMode: string;
  };
  passthroughModels?: boolean;
  serviceKinds?: string[];
  ttsConfig?: any;
  sttConfig?: any;
  embeddingConfig?: any;
  imageConfig?: any;
  searchViaChat?: any;
}
