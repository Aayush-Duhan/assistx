/**
 * OAuth library for assistx — driven by PROVIDER_OAUTH from the registry.
 * Handles PKCE, provider configs, auth URL generation, token exchange,
 * device code flows, and refresh. Ported from 9router/src/lib/oauth/providers.js.
 */
import crypto from "node:crypto";
import { PROVIDER_OAUTH } from "../providers";
import type { OAuthConfig } from "../providers/types";

// ============================================================================
// PKCE Utilities
// ============================================================================

function generateCodeVerifier(bytes = 32): string {
  return crypto.randomBytes(bytes).toString("base64url");
}

function generateCodeChallenge(verifier: string): string {
  return crypto.createHash("sha256").update(verifier).digest("base64url");
}

function generateState(): string {
  return crypto.randomBytes(32).toString("base64url");
}

function generatePKCE(bytes = 32) {
  const codeVerifier = generateCodeVerifier(bytes);
  const codeChallenge = generateCodeChallenge(codeVerifier);
  const state = generateState();
  return { codeVerifier, codeChallenge, state };
}

// ============================================================================
// JWT decode helper (best-effort email extraction)
// ============================================================================

function decodeJwtPayload(jwt: string): Record<string, unknown> | null {
  try {
    if (!jwt || typeof jwt !== "string") return null;
    const parts = jwt.split(".");
    if (parts.length !== 3) return null;
    const base64 = parts[1].replace(/-/g, "+").replace(/_/g, "/");
    const padding = (4 - (base64.length % 4)) % 4;
    return JSON.parse(Buffer.from(base64 + "=".repeat(padding), "base64").toString("utf8"));
  } catch {
    return null;
  }
}

function extractEmailFromToken(token: string): string | undefined {
  const payload = decodeJwtPayload(token);
  if (!payload) return undefined;
  return (payload.email as string) || (payload.preferred_username as string) || undefined;
}

// ============================================================================
// In-memory State Store (CSRF protection + code verifier)
// ============================================================================

interface StateEntry {
  provider: string;
  codeVerifier: string;
  redirectUri: string;
  timestamp: number;
}

const stateStore = new Map<string, StateEntry>();
const STATE_TTL = 10 * 60 * 1000;

setInterval(() => {
  const now = Date.now();
  for (const [key, entry] of stateStore) {
    if (now - entry.timestamp > STATE_TTL) stateStore.delete(key);
  }
}, 5 * 60 * 1000);

function storeState(state: string, entry: Omit<StateEntry, "timestamp">): void {
  stateStore.set(state, { ...entry, timestamp: Date.now() });
}

function consumeState(state: string): StateEntry | null {
  const entry = stateStore.get(state);
  if (!entry) return null;
  stateStore.delete(state);
  if (Date.now() - entry.timestamp > STATE_TTL) return null;
  return entry;
}

// ============================================================================
// Provider flow type detection from PROVIDER_OAUTH
// ============================================================================

function detectFlowType(_providerId: string, oauth: OAuthConfig): string {
  // Device code providers have deviceCodeUrl
  if (oauth.deviceCodeUrl) return "device_code";
  // PKCE providers have codeChallengeMethod
  if (oauth.codeChallengeMethod) return "authorization_code_pkce";
  // Default authorization_code
  return "authorization_code";
}

// ============================================================================
// Public API Types
// ============================================================================

export interface OAuthTokenResult {
  accessToken: string;
  refreshToken?: string;
  expiresIn?: number;
  scope?: string;
  email?: string;
  displayName?: string;
  projectId?: string;
  idToken?: string;
  providerSpecificData?: Record<string, unknown>;
}

export interface DeviceCodeResponse {
  deviceCode: string;
  userCode: string;
  verificationUri: string;
  verificationUriComplete?: string;
  interval: number;
  expiresIn: number;
  codeVerifier?: string;
  extraData?: Record<string, unknown>;
}

export interface DevicePollResult {
  success: boolean;
  tokens?: OAuthTokenResult;
  pending?: boolean;
  error?: string;
}

export interface RefreshResult {
  accessToken: string;
  refreshToken?: string;
  expiresIn?: number;
}

// ============================================================================
// Public API
// ============================================================================

export function getOAuthProviders(): { id: string; name: string; flowType: string }[] {
  return Object.entries(PROVIDER_OAUTH).map(([id, oauth]) => ({
    id,
    name: id,
    flowType: detectFlowType(id, oauth),
  }));
}

export function generateAuthData(
  providerId: string,
  redirectUri: string,
): { authUrl: string; state: string; flowType: string; codeVerifier?: string } {
  const oauth = PROVIDER_OAUTH[providerId];
  if (!oauth) throw new Error(`Unknown OAuth provider: ${providerId}`);

  const flowType = detectFlowType(providerId, oauth);
  if (flowType === "device_code") {
    throw new Error(`Use requestDeviceCode() for device_code providers`);
  }

  const pkce = generatePKCE();
  storeState(pkce.state, { provider: providerId, codeVerifier: pkce.codeVerifier, redirectUri });

  const scopes = oauth.scopes
    ? oauth.scopes.join(" ")
    : oauth.scope || "";

  const params: Record<string, string> = {
    client_id: oauth.clientId || "",
    response_type: "code",
    redirect_uri: redirectUri,
    scope: scopes,
    state: pkce.state,
  };

  if (flowType === "authorization_code_pkce") {
    params.code_challenge = pkce.codeChallenge;
    params.code_challenge_method = oauth.codeChallengeMethod || "S256";
    // Claude wants code=true
    if (providerId === "claude") params.code = "true";
  }

  // Codex extra params
  if (oauth.extraParams) {
    Object.assign(params, oauth.extraParams);
  }

  // Provider-specific auth URL building
  let authorizeUrl = oauth.authorizeUrl || "";

  // Cline/ClinePass use a different param set
  if (providerId === "cline" || providerId === "clinepass") {
    const clineParams = new URLSearchParams({
      client_type: "extension",
      callback_url: redirectUri,
      redirect_uri: redirectUri,
    });
    const authUrl = `${authorizeUrl}?${clineParams.toString()}`;
    return { authUrl, state: pkce.state, flowType, codeVerifier: pkce.codeVerifier };
  }

  // iFlow uses different param names
  if (providerId === "iflow" && oauth.extraParams) {
    const iflowParams = new URLSearchParams({
      loginMethod: oauth.extraParams.loginMethod || "phone",
      type: oauth.extraParams.type || "phone",
      redirect: redirectUri,
      state: pkce.state,
      client_id: oauth.clientId || "",
    });
    const authUrl = `${authorizeUrl}?${iflowParams.toString()}`;
    return { authUrl, state: pkce.state, flowType, codeVerifier: pkce.codeVerifier };
  }

  // Kimchi browser token flow
  if (providerId === "kimchi") {
    const webAppUrl = (oauth.webAppUrl || "https://app.kimchi.dev").replace(/\/+$/, "");
    const kimchiParams = new URLSearchParams({
      callback: redirectUri,
      state: pkce.state,
    });
    const authUrl = `${webAppUrl}/cli-auth?${kimchiParams.toString()}`;
    return { authUrl, state: pkce.state, flowType: "browser_token", codeVerifier: pkce.codeVerifier };
  }

  // Google-based providers need access_type=offline, prompt=consent
  if (providerId === "gemini-cli" || providerId === "antigravity") {
    params.access_type = "offline";
    params.prompt = "consent";
  }

  const authUrl = `${authorizeUrl}?${new URLSearchParams(params).toString()}`;
  return { authUrl, state: pkce.state, flowType, codeVerifier: pkce.codeVerifier };
}

// ============================================================================
// Token Exchange
// ============================================================================

export async function exchangeToken(
  providerId: string,
  code: string,
  state: string,
): Promise<OAuthTokenResult> {
  const oauth = PROVIDER_OAUTH[providerId];
  if (!oauth) throw new Error(`Unknown OAuth provider: ${providerId}`);

  const stateEntry = consumeState(state);
  if (!stateEntry) throw new Error("Invalid or expired OAuth state");
  if (stateEntry.provider !== providerId) throw new Error("Provider mismatch");

  const flowType = detectFlowType(providerId, oauth);
  const tokenUrl = oauth.tokenUrl || "";
  const clientId = oauth.clientId || "";
  const clientSecret = oauth.clientSecret || "";

  // Cline/ClinePass: code is base64-encoded token data
  if (providerId === "cline" || providerId === "clinepass") {
    return exchangeCline(oauth, code, stateEntry.redirectUri);
  }

  // Kimchi: code IS the access token (browser_token flow)
  if (providerId === "kimchi") {
    return exchangeKimchi(oauth, code);
  }

  // iFlow: uses Basic Auth
  if (providerId === "iflow") {
    return exchangeIflow(oauth, code, stateEntry.redirectUri);
  }

  // Claude: JSON body, may contain state after #
  if (providerId === "claude") {
    return exchangeClaude(oauth, code, stateEntry, state);
  }

  // PKCE providers: include code_verifier
  if (flowType === "authorization_code_pkce") {
    const isJson = providerId === "claude"; // already handled above
    const contentType = isJson ? "application/json" : "application/x-www-form-urlencoded";
    const body = new URLSearchParams({
      grant_type: "authorization_code",
      client_id: clientId,
      code,
      redirect_uri: stateEntry.redirectUri,
      code_verifier: stateEntry.codeVerifier,
    });

    const res = await fetch(tokenUrl, {
      method: "POST",
      headers: { "Content-Type": contentType, Accept: "application/json" },
      body: body.toString(),
    });
    if (!res.ok) throw new Error(`Token exchange failed: ${await res.text()}`);
    const tokens: any = await res.json();

    const result: OAuthTokenResult = {
      accessToken: tokens.access_token,
      refreshToken: tokens.refresh_token,
      expiresIn: tokens.expires_in,
      scope: tokens.scope,
    };
    // Codex: extract email from id_token
    if (tokens.id_token) {
      result.idToken = tokens.id_token;
      const email = extractEmailFromToken(tokens.id_token) || extractEmailFromToken(tokens.access_token);
      if (email) result.email = email;
      // Codex account info
      const payload = decodeJwtPayload(tokens.id_token);
      if (payload) {
        const chatgpt = (payload["https://api.openai.com/auth"] as any) || {};
        if (chatgpt.chatgpt_account_id || chatgpt.chatgpt_plan_type) {
          result.providerSpecificData = {
            chatgptAccountId: chatgpt.chatgpt_account_id,
            chatgptPlanType: chatgpt.chatgpt_plan_type,
          };
        }
      }
    }
    // xAI: extract email from id_token
    if (providerId === "xai" && tokens.id_token) {
      const email = extractEmailFromToken(tokens.id_token);
      if (email) result.email = email;
      result.providerSpecificData = { idToken: tokens.id_token };
    }
    return result;
  }

  // Standard authorization_code (Gemini, Antigravity, etc.)
  const body = new URLSearchParams({
    grant_type: "authorization_code",
    client_id: clientId,
    code,
    redirect_uri: stateEntry.redirectUri,
    ...(clientSecret ? { client_secret: clientSecret } : {}),
  });

  const res = await fetch(tokenUrl, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded", Accept: "application/json" },
    body: body.toString(),
  });
  if (!res.ok) throw new Error(`Token exchange failed: ${await res.text()}`);
  const tokens: any = await res.json();

  const result: OAuthTokenResult = {
    accessToken: tokens.access_token,
    refreshToken: tokens.refresh_token,
    expiresIn: tokens.expires_in,
    scope: tokens.scope,
  };

  // Post-exchange: fetch user info for Google-based providers
  if (oauth.userInfoUrl) {
    try {
      const userRes = await fetch(`${oauth.userInfoUrl}?alt=json`, {
        headers: { Authorization: `Bearer ${tokens.access_token}` },
      });
      if (userRes.ok) {
        const userInfo: any = await userRes.json();
        result.email = userInfo.email;
      }
    } catch { /* best-effort */ }
  }

  // Gemini/Antigravity: fetch project ID
  if (providerId === "gemini-cli" || providerId === "antigravity") {
    try {
      const projectRes = await fetch(
        "https://cloudcode-pa.googleapis.com/v1internal:loadCodeAssist",
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${tokens.access_token}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ metadata: { ideType: 9, platform: 5, pluginType: 2 }, mode: 1 }),
        },
      );
      if (projectRes.ok) {
        const data: any = await projectRes.json();
        result.projectId = data.cloudaicompanionProject?.id || data.cloudaicompanionProject || "";
      }
    } catch { /* best-effort */ }
  }

  return result;
}

// ============================================================================
// Provider-specific exchange helpers
// ============================================================================

async function exchangeClaude(
  oauth: OAuthConfig,
  code: string,
  stateEntry: StateEntry,
  originalState: string,
): Promise<OAuthTokenResult> {
  let authCode = code;
  let codeState = "";
  if (authCode.includes("#")) {
    const parts = authCode.split("#");
    authCode = parts[0];
    codeState = parts[1] || "";
  }

  const res = await fetch(oauth.tokenUrl || "", {
    method: "POST",
    headers: { "Content-Type": "application/json", Accept: "application/json" },
    body: JSON.stringify({
      code: authCode,
      state: codeState || originalState,
      grant_type: "authorization_code",
      client_id: oauth.clientId,
      redirect_uri: stateEntry.redirectUri,
      code_verifier: stateEntry.codeVerifier,
    }),
  });
  if (!res.ok) throw new Error(`Claude token exchange failed: ${await res.text()}`);
  const tokens: any = await res.json();
  return {
    accessToken: tokens.access_token,
    refreshToken: tokens.refresh_token,
    expiresIn: tokens.expires_in,
    scope: tokens.scope,
  };
}

async function exchangeCline(
  oauth: OAuthConfig,
  code: string,
  redirectUri: string,
): Promise<OAuthTokenResult> {
  try {
    // Cline encodes token data as base64 in the code param
    let base64 = code;
    const padding = 4 - (base64.length % 4);
    if (padding !== 4) base64 += "=".repeat(padding);
    const decoded = Buffer.from(base64, "base64").toString("utf-8");
    const lastBrace = decoded.lastIndexOf("}");
    if (lastBrace === -1) throw new Error("No JSON found");
    const tokenData = JSON.parse(decoded.substring(0, lastBrace + 1));
    const expiresIn = tokenData.expiresAt
      ? Math.floor((new Date(tokenData.expiresAt).getTime() - Date.now()) / 1000)
      : 3600;
    return {
      accessToken: tokenData.accessToken,
      refreshToken: tokenData.refreshToken,
      expiresIn,
      email: tokenData.email,
      providerSpecificData: { firstName: tokenData.firstName, lastName: tokenData.lastName },
    };
  } catch {
    // Fallback to API exchange
    const tokenUrl = oauth.tokenExchangeUrl || oauth.tokenUrl || "";
    const response = await fetch(tokenUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json", Accept: "application/json" },
      body: JSON.stringify({ grant_type: "authorization_code", code, client_type: "extension", redirect_uri: redirectUri }),
    });
    if (!response.ok) throw new Error(`Cline token exchange failed: ${await response.text()}`);
    const data: any = await response.json();
    return {
      accessToken: data.data?.accessToken || data.accessToken,
      refreshToken: data.data?.refreshToken || data.refreshToken,
      expiresIn: 3600,
      email: data.data?.userInfo?.email || "",
    };
  }
}

async function exchangeKimchi(
  oauth: OAuthConfig,
  token: string,
): Promise<OAuthTokenResult> {
  const accessToken = String(token || "").trim();
  if (!accessToken) throw new Error("Missing Kimchi token");

  const validationUrl = oauth.validationUrl || "https://api.cast.ai/v1/llm/openai/supported-providers";
  const validationRes = await fetch(validationUrl, {
    headers: { Accept: "application/json", Authorization: `Bearer ${accessToken}` },
  });
  if (!validationRes.ok) throw new Error(`Kimchi token validation failed: ${validationRes.status}`);

  let email: string | undefined;
  let displayName: string | undefined;
  if (oauth.userInfoUrl) {
    try {
      const userRes = await fetch(oauth.userInfoUrl, {
        headers: { Accept: "application/json", Authorization: `Bearer ${accessToken}` },
      });
      if (userRes.ok) {
        const user: any = await userRes.json();
        email = user.email || (user.id ? `kimchi-user-${user.id}` : undefined);
        displayName = user.name || user.username || undefined;
      }
    } catch { /* best-effort */ }
  }

  return {
    accessToken,
    email,
    displayName,
    providerSpecificData: { authMethod: "browser_token" },
  };
}

async function exchangeIflow(
  oauth: OAuthConfig,
  code: string,
  redirectUri: string,
): Promise<OAuthTokenResult> {
  const clientId = oauth.clientId || "";
  const clientSecret = oauth.clientSecret || "";
  const basicAuth = Buffer.from(`${clientId}:${clientSecret}`).toString("base64");

  const res = await fetch(oauth.tokenUrl || "", {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      Accept: "application/json",
      Authorization: `Basic ${basicAuth}`,
    },
    body: new URLSearchParams({
      grant_type: "authorization_code",
      code,
      redirect_uri: redirectUri,
      client_id: clientId,
      client_secret: clientSecret,
    }),
  });
  if (!res.ok) throw new Error(`iFlow token exchange failed: ${await res.text()}`);
  const tokens: any = await res.json();

  // Fetch user info (critical for iFlow API key)
  const userInfoUrl = oauth.userInfoUrl || "";
  if (userInfoUrl) {
    const userInfoRes = await fetch(`${userInfoUrl}?accessToken=${encodeURIComponent(tokens.access_token)}`, {
      headers: { Accept: "application/json" },
    });
    if (userInfoRes.ok) {
      const result: any = await userInfoRes.json();
      const userInfo = result.data || {};
      return {
        accessToken: tokens.access_token,
        refreshToken: tokens.refresh_token,
        expiresIn: tokens.expires_in,
        email: userInfo.email || userInfo.phone,
        displayName: userInfo.nickname || userInfo.name,
        providerSpecificData: { apiKey: userInfo.apiKey },
      };
    }
  }

  return {
    accessToken: tokens.access_token,
    refreshToken: tokens.refresh_token,
    expiresIn: tokens.expires_in,
  };
}

// ============================================================================
// Device Code Flow
// ============================================================================

export async function requestDeviceCode(providerId: string): Promise<DeviceCodeResponse> {
  const oauth = PROVIDER_OAUTH[providerId] as any;
  if (!oauth) throw new Error(`Unknown OAuth provider: ${providerId}`);
  if (!oauth.deviceCodeUrl && !oauth.stateUrl && !oauth.initiateUrl) {
    throw new Error(`${providerId} does not support device code flow`);
  }

  // Kiro: AWS SSO OIDC multi-step
  if (providerId === "kiro") {
    return requestKiroDeviceCode(oauth);
  }

  // KiloCode: custom device auth
  if (providerId === "kilocode") {
    return requestKilocodeDeviceCode(oauth);
  }

  // CodeBuddy: browser polling flow
  if (providerId === "codebuddy-cn") {
    return requestCodebuddyDeviceCode(oauth);
  }

  // Qwen: PKCE device code
  if (providerId === "qwen") {
    const pkce = generatePKCE();
    const res = await fetch(oauth.deviceCodeUrl, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded", Accept: "application/json" },
      body: new URLSearchParams({
        client_id: oauth.clientId,
        scope: oauth.scope || "",
        code_challenge: pkce.codeChallenge,
        code_challenge_method: oauth.codeChallengeMethod || "S256",
      }),
    });
    if (!res.ok) throw new Error(`Device code request failed: ${await res.text()}`);
    const data: any = await res.json();
    return {
      deviceCode: data.device_code,
      userCode: data.user_code,
      verificationUri: data.verification_uri,
      verificationUriComplete: data.verification_uri_complete,
      interval: data.interval || 5,
      expiresIn: data.expires_in || 900,
      codeVerifier: pkce.codeVerifier,
    };
  }

  // Kimi: needs X-Msh-* headers
  if (providerId === "kimi") {
    return requestKimiDeviceCode(oauth);
  }

  // Grok CLI: device code with user-agent
  if (providerId === "grok-cli") {
    return requestGrokCliDeviceCode(oauth);
  }

  // GitHub and generic device code
  const scopes = Array.isArray(oauth.scopes) ? oauth.scopes.join(" ") : (oauth.scopes || oauth.scope || "");
  const res = await fetch(oauth.deviceCodeUrl, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded", Accept: "application/json" },
    body: new URLSearchParams({ client_id: oauth.clientId || "", scope: scopes }),
  });
  if (!res.ok) throw new Error(`Device code request failed: ${await res.text()}`);
  const data: any = await res.json();
  return {
    deviceCode: data.device_code,
    userCode: data.user_code,
    verificationUri: data.verification_uri,
    verificationUriComplete: data.verification_uri_complete,
    interval: data.interval || 5,
    expiresIn: data.expires_in || 900,
  };
}

async function requestKiroDeviceCode(oauth: any): Promise<DeviceCodeResponse> {
  const region = "us-east-1";
  const registerClientUrl = `https://oidc.${region}.amazonaws.com/client/register`;
  const deviceAuthUrl = `https://oidc.${region}.amazonaws.com/device_authorization`;

  const registerRes = await fetch(registerClientUrl, {
    method: "POST",
    headers: { "Content-Type": "application/json", Accept: "application/json" },
    body: JSON.stringify({
      clientName: oauth.clientName,
      clientType: oauth.clientType || "public",
      scopes: oauth.scopes,
      grantTypes: oauth.grantTypes,
      issuerUrl: oauth.issuerUrl,
    }),
  });
  if (!registerRes.ok) throw new Error(`Client registration failed: ${await registerRes.text()}`);
  const clientInfo: any = await registerRes.json();

  const deviceRes = await fetch(deviceAuthUrl, {
    method: "POST",
    headers: { "Content-Type": "application/json", Accept: "application/json" },
    body: JSON.stringify({
      clientId: clientInfo.clientId,
      clientSecret: clientInfo.clientSecret,
      startUrl: oauth.startUrl,
    }),
  });
  if (!deviceRes.ok) throw new Error(`Device authorization failed: ${await deviceRes.text()}`);
  const deviceData: any = await deviceRes.json();

  return {
    deviceCode: deviceData.deviceCode,
    userCode: deviceData.userCode,
    verificationUri: deviceData.verificationUri,
    verificationUriComplete: deviceData.verificationUriComplete,
    expiresIn: deviceData.expiresIn || 600,
    interval: deviceData.interval || 5,
    extraData: {
      _clientId: clientInfo.clientId,
      _clientSecret: clientInfo.clientSecret,
      _region: region,
      _authMethod: "builder-id",
      _startUrl: oauth.startUrl,
    },
  };
}

async function requestKilocodeDeviceCode(oauth: any): Promise<DeviceCodeResponse> {
  const res = await fetch(oauth.initiateUrl, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
  });
  if (!res.ok) {
    if (res.status === 429) throw new Error("Too many pending authorization requests.");
    throw new Error(`Device auth initiation failed: ${await res.text()}`);
  }
  const data: any = await res.json();
  return {
    deviceCode: data.code,
    userCode: data.code,
    verificationUri: data.verificationUrl,
    verificationUriComplete: data.verificationUrl,
    expiresIn: data.expiresIn || 300,
    interval: 3,
  };
}

async function requestCodebuddyDeviceCode(oauth: any): Promise<DeviceCodeResponse> {
  const res = await fetch(`${oauth.stateUrl}?platform=${oauth.platform || "CLI"}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json",
      "User-Agent": oauth.userAgent || "CLI/2.63.2 CodeBuddy/2.63.2",
      "X-Requested-With": "XMLHttpRequest",
      "X-Domain": "copilot.tencent.com",
      "X-No-Authorization": "true",
      "X-No-User-Id": "true",
      "X-Product": "SaaS",
    },
    body: "{}",
  });
  if (!res.ok) throw new Error(`CodeBuddy state request failed: ${await res.text()}`);
  const data: any = await res.json();
  if (data.code !== 0 || !data.data?.state || !data.data?.authUrl) {
    throw new Error(`CodeBuddy state error: ${data.msg || "missing state/authUrl"}`);
  }
  return {
    deviceCode: data.data.state,
    verificationUri: data.data.authUrl,
    userCode: "",
    interval: (oauth.pollInterval || 5000) / 1000,
    expiresIn: 300,
  };
}

async function requestKimiDeviceCode(oauth: any): Promise<DeviceCodeResponse> {
  const deviceId = crypto.randomUUID();
  const res = await fetch(oauth.deviceCodeUrl, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      Accept: "application/json",
      "X-Msh-Platform": "assistx",
      "X-Msh-Device-Id": deviceId,
    },
    body: new URLSearchParams({ client_id: oauth.clientId }),
  });
  if (!res.ok) throw new Error(`Device code request failed: ${await res.text()}`);
  const data: any = await res.json();
  const authorizeDeviceUrl = oauth.authorizeDeviceUrl || "https://www.kimi.com/code/authorize_device";
  return {
    deviceCode: data.device_code,
    userCode: data.user_code,
    verificationUri: data.verification_uri || authorizeDeviceUrl,
    verificationUriComplete: data.verification_uri_complete || `${authorizeDeviceUrl}?user_code=${data.user_code}`,
    expiresIn: data.expires_in || 600,
    interval: data.interval || 5,
    extraData: { _kimiDeviceId: deviceId },
  };
}

async function requestGrokCliDeviceCode(oauth: any): Promise<DeviceCodeResponse> {
  const body = new URLSearchParams({
    client_id: oauth.clientId,
    scope: oauth.scope || "",
  });
  if (oauth.referrer) body.set("referrer", oauth.referrer);

  const res = await fetch(oauth.deviceCodeUrl, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      Accept: "application/json",
      "User-Agent": "grok-pager/0.2.93 grok-shell/0.2.93 (linux; x86_64)",
    },
    body,
  });
  if (!res.ok) throw new Error(`Grok CLI device code request failed: ${await res.text()}`);
  const data: any = await res.json();
  return {
    deviceCode: data.device_code,
    userCode: data.user_code,
    verificationUri: data.verification_uri,
    verificationUriComplete: data.verification_uri_complete,
    interval: data.interval || 5,
    expiresIn: data.expires_in || 600,
  };
}

// ============================================================================
// Device Code Poll
// ============================================================================

export async function pollDeviceToken(
  providerId: string,
  deviceCode: string,
  codeVerifier?: string,
  extraData?: Record<string, unknown>,
): Promise<DevicePollResult> {
  const oauth = PROVIDER_OAUTH[providerId] as any;
  if (!oauth) throw new Error(`Unknown OAuth provider: ${providerId}`);

  // Kiro: poll AWS SSO OIDC
  if (providerId === "kiro") {
    return pollKiroToken(oauth, deviceCode, extraData);
  }

  // KiloCode: poll custom endpoint
  if (providerId === "kilocode") {
    return pollKilocodeToken(oauth, deviceCode);
  }

  // CodeBuddy: GET poll with state
  if (providerId === "codebuddy-cn") {
    return pollCodebuddyToken(oauth, deviceCode);
  }

  // Kimi: needs X-Msh-* headers
  if (providerId === "kimi") {
    return pollKimiToken(oauth, deviceCode, extraData);
  }

  // Grok CLI: needs user-agent
  if (providerId === "grok-cli") {
    return pollGrokCliToken(oauth, deviceCode);
  }

  // Standard device code poll (GitHub, Qwen, etc.)
  const tokenUrl = oauth.tokenUrl || "";
  const body: Record<string, string> = {
    client_id: oauth.clientId || "",
    device_code: deviceCode,
    grant_type: "urn:ietf:params:oauth:grant-type:device_code",
  };
  if (codeVerifier) body.code_verifier = codeVerifier;

  const res = await fetch(tokenUrl, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded", Accept: "application/json" },
    body: new URLSearchParams(body),
  });

  let data: any;
  try { data = await res.json(); } catch { return { success: false, error: "Invalid response" }; }

  if (data.error === "authorization_pending" || data.error === "slow_down") {
    return { success: false, pending: true };
  }
  if (!data.access_token) {
    return { success: false, error: data.error_description || data.error || "No access token" };
  }

  const result: OAuthTokenResult = {
    accessToken: data.access_token,
    refreshToken: data.refresh_token,
    expiresIn: data.expires_in,
    scope: data.scope,
  };

  // GitHub: post-exchange for copilot token + user info
  if (providerId === "github") {
    await postExchangeGitHub(oauth, data, result);
  }

  // Qwen: resource_url
  if (providerId === "qwen" && data.resource_url) {
    result.providerSpecificData = { resourceUrl: data.resource_url };
  }

  return { success: true, tokens: result };
}

async function postExchangeGitHub(oauth: any, data: any, result: OAuthTokenResult): Promise<void> {
  const headers: Record<string, string> = {
    Authorization: `Bearer ${data.access_token}`,
    Accept: "application/json",
    "X-GitHub-Api-Version": oauth.apiVersion || "2022-11-28",
    "User-Agent": oauth.userAgent || "GitHubCopilotChat/0.26.7",
  };
  // Copilot token
  if (oauth.copilotTokenUrl) {
    try {
      const copilotRes = await fetch(oauth.copilotTokenUrl, { headers });
      if (copilotRes.ok) {
        const copilot: any = await copilotRes.json();
        result.providerSpecificData = {
          ...result.providerSpecificData,
          copilotToken: copilot.token,
          copilotTokenExpiresAt: copilot.expires_at,
        };
      }
    } catch { /* best-effort */ }
  }
  // User info
  if (oauth.userInfoUrl) {
    try {
      const userRes = await fetch(oauth.userInfoUrl, { headers });
      if (userRes.ok) {
        const user: any = await userRes.json();
        result.email = user.email || undefined;
        result.displayName = user.name || user.login;
        result.providerSpecificData = {
          ...result.providerSpecificData,
          githubUserId: user.id,
          githubLogin: user.login,
          githubName: user.name,
          githubEmail: user.email,
        };
      }
    } catch { /* best-effort */ }
  }
}

async function pollKiroToken(oauth: any, deviceCode: string, extraData?: Record<string, unknown>): Promise<DevicePollResult> {
  const region = (extraData?._region as string) || "us-east-1";
  const tokenUrl = `https://oidc.${region}.amazonaws.com/token`;
  const res = await fetch(tokenUrl, {
    method: "POST",
    headers: { "Content-Type": "application/json", Accept: "application/json" },
    body: JSON.stringify({
      clientId: extraData?._clientId,
      clientSecret: extraData?._clientSecret,
      deviceCode,
      grantType: "urn:ietf:params:oauth:grant-type:device_code",
    }),
  });
  let data: any;
  try { data = await res.json(); } catch { return { success: false, error: "Invalid response" }; }

  if (data.accessToken) {
    const email = extractEmailFromToken(data.accessToken);
    return {
      success: true,
      tokens: {
        accessToken: data.accessToken,
        refreshToken: data.refreshToken,
        expiresIn: data.expiresIn,
        email,
        providerSpecificData: {
          profileArn: data.profileArn || null,
          clientId: extraData?._clientId,
          clientSecret: extraData?._clientSecret,
          region,
          authMethod: extraData?._authMethod || "builder-id",
          startUrl: extraData?._startUrl || oauth.startUrl,
        },
      },
    };
  }

  if (data.error === "authorization_pending" || !data.error) {
    return { success: false, pending: true };
  }
  return { success: false, error: data.error_description || data.error };
}

async function pollKilocodeToken(oauth: any, deviceCode: string): Promise<DevicePollResult> {
  const res = await fetch(`${oauth.pollUrlBase}/${deviceCode}`);
  if (res.status === 202) return { success: false, pending: true };
  if (res.status === 403) return { success: false, error: "Authorization denied by user" };
  if (res.status === 410) return { success: false, error: "Authorization code expired" };
  if (!res.ok) return { success: false, error: `Poll failed: ${res.status}` };
  const data: any = await res.json();
  if (data.status === "approved" && data.token) {
    let orgId: string | null = null;
    try {
      const profileRes = await fetch(`${oauth.apiBaseUrl}/api/profile`, {
        headers: { Authorization: `Bearer ${data.token}` },
      });
      if (profileRes.ok) {
        const profile: any = await profileRes.json();
        orgId = profile.organizations?.[0]?.id || null;
      }
    } catch { /* best-effort */ }
    return {
      success: true,
      tokens: {
        accessToken: data.token,
        email: data.userEmail,
        providerSpecificData: orgId ? { orgId } : undefined,
      },
    };
  }
  return { success: false, pending: true };
}

async function pollCodebuddyToken(oauth: any, deviceCode: string): Promise<DevicePollResult> {
  const res = await fetch(`${oauth.tokenUrl}?state=${encodeURIComponent(deviceCode)}`, {
    method: "GET",
    headers: {
      Accept: "application/json",
      "User-Agent": oauth.userAgent || "CLI/2.63.2 CodeBuddy/2.63.2",
      "X-Requested-With": "XMLHttpRequest",
      "X-Domain": "copilot.tencent.com",
      "X-No-Authorization": "true",
      "X-No-User-Id": "true",
      "X-No-Enterprise-Id": "true",
      "X-No-Department-Info": "true",
      "X-Product": "SaaS",
    },
  });
  if (!res.ok) return { success: false, error: "request_failed" };
  const data: any = await res.json();
  if (data.code === 0 && data.data?.accessToken) {
    return {
      success: true,
      tokens: {
        accessToken: data.data.accessToken,
        refreshToken: data.data.refreshToken || "",
        expiresIn: data.data.expiresIn || 86400,
      },
    };
  }
  if (data.code === 11217) return { success: false, pending: true };
  return { success: false, error: data.msg || "unknown_error" };
}

async function pollKimiToken(oauth: any, deviceCode: string, extraData?: Record<string, unknown>): Promise<DevicePollResult> {
  const deviceId = (extraData?._kimiDeviceId as string) || "";
  const res = await fetch(oauth.tokenUrl, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      Accept: "application/json",
      "X-Msh-Platform": "assistx",
      "X-Msh-Device-Id": deviceId,
    },
    body: new URLSearchParams({
      grant_type: "urn:ietf:params:oauth:grant-type:device_code",
      client_id: oauth.clientId,
      device_code: deviceCode,
    }),
  });
  let data: any;
  try { data = await res.json(); } catch { return { success: false, error: "Invalid response" }; }

  if (data.error === "authorization_pending" || data.error === "slow_down") {
    return { success: false, pending: true };
  }
  if (data.access_token) {
    return {
      success: true,
      tokens: {
        accessToken: data.access_token,
        refreshToken: data.refresh_token,
        expiresIn: data.expires_in,
        providerSpecificData: {
          authMethod: "device_code",
          ...(deviceId ? { deviceId } : {}),
        },
      },
    };
  }
  return { success: false, error: data.error || "No access token" };
}

async function pollGrokCliToken(oauth: any, deviceCode: string): Promise<DevicePollResult> {
  const res = await fetch(oauth.tokenUrl, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      Accept: "application/json",
      "User-Agent": "grok-pager/0.2.93 grok-shell/0.2.93 (linux; x86_64)",
    },
    body: new URLSearchParams({
      grant_type: "urn:ietf:params:oauth:grant-type:device_code",
      device_code: deviceCode,
      client_id: oauth.clientId,
    }),
  });
  let data: any;
  try { data = await res.json(); } catch { return { success: false, error: "Invalid response" }; }

  const pending = data?.error === "authorization_pending" || data?.error === "slow_down";
  if (pending) return { success: false, pending: true };
  if (!data.access_token) {
    return { success: false, error: data.error_description || data.error || "No access token" };
  }

  const email = extractEmailFromToken(data.id_token || "") || extractEmailFromToken(data.access_token || "");

  // Best-effort user profile
  let displayName: string | undefined;
  try {
    const userRes = await fetch("https://cli-chat-proxy.grok.com/v1/user", {
      headers: {
        Authorization: `Bearer ${data.access_token}`,
        Accept: "application/json",
        "User-Agent": "grok-pager/0.2.93 grok-shell/0.2.93 (linux; x86_64)",
        "x-xai-token-auth": "xai-grok-cli",
        "x-grok-client-version": "0.2.93",
      },
    });
    if (userRes.ok) {
      const user: any = await userRes.json();
      displayName = [user.firstName, user.lastName].filter(Boolean).join(" ").trim() || undefined;
    }
  } catch { /* best-effort */ }

  return {
    success: true,
    tokens: {
      accessToken: data.access_token,
      refreshToken: data.refresh_token || undefined,
      expiresIn: data.expires_in,
      scope: data.scope,
      email: email || undefined,
      displayName,
      providerSpecificData: {
        authMethod: "device_code",
        idToken: data.id_token || null,
      },
    },
  };
}

// ============================================================================
// Token Refresh
// ============================================================================

export async function refreshToken(
  providerId: string,
  refreshTokenValue: string,
): Promise<RefreshResult | null> {
  const oauth = PROVIDER_OAUTH[providerId] as any;
  if (!oauth) return null;
  if (!refreshTokenValue) return null;

  const tokenUrl = oauth.refreshUrl || oauth.tokenUrl;
  if (!tokenUrl) return null;

  const isJson = oauth.refresh?.encoding === "json";
  const clientId = oauth.clientId || "";
  const clientSecret = oauth.clientSecret || "";

  const body = isJson
    ? JSON.stringify({
        grant_type: "refresh_token",
        refresh_token: refreshTokenValue,
        client_id: clientId,
      })
    : new URLSearchParams({
        grant_type: "refresh_token",
        refresh_token: refreshTokenValue,
        client_id: clientId,
        ...(clientSecret ? { client_secret: clientSecret } : {}),
      }).toString();

  const res = await fetch(tokenUrl, {
    method: "POST",
    headers: {
      "Content-Type": isJson ? "application/json" : "application/x-www-form-urlencoded",
      Accept: "application/json",
    },
    body,
  });

  if (!res.ok) {
    const errText = await res.text();
    if (errText.includes("invalid_grant")) {
      throw new Error("invalid_grant");
    }
    return null;
  }

  const tokens: any = await res.json();
  return {
    accessToken: tokens.access_token,
    refreshToken: tokens.refresh_token || refreshTokenValue,
    expiresIn: tokens.expires_in,
  };
}

// ============================================================================
// Token Expiry Check
// ============================================================================

export function isTokenExpired(expiresAt: string | null | undefined): boolean {
  if (!expiresAt) return false;
  const expiresMs = new Date(expiresAt).getTime();
  return Date.now() >= expiresMs - 5 * 60 * 1000;
}
