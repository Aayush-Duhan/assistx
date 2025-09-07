import { app, shell } from 'electron';
import { createServer, IncomingMessage, ServerResponse } from 'node:http';
import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'node:fs';
import { join, dirname } from 'node:path';

type OAuthTokens = {
  access_token: string;
  refresh_token?: string;
  scope?: string;
  token_type?: string;
  expires_in?: number; // seconds from now
  expiry_date?: number; // epoch ms
};

type GmailConfig = {
  clientId: string;
  clientSecret: string;
  tokens?: OAuthTokens;
};

const CONFIG_PATH = join(app.getPath('userData'), 'gmail-oauth.json');
const GMAIL_SEND_SCOPE = 'https://www.googleapis.com/auth/gmail.send';

function loadConfig(): GmailConfig | null {
  try {
    if (!existsSync(CONFIG_PATH)) return null;
    const raw = readFileSync(CONFIG_PATH, 'utf-8');
    const cfg = JSON.parse(raw) as GmailConfig;
    return cfg;
  } catch {
    return null;
  }
}

function saveConfig(config: GmailConfig): void {
  try {
    const dir = dirname(CONFIG_PATH);
    if (!existsSync(dir)) mkdirSync(dir, { recursive: true });
    writeFileSync(CONFIG_PATH, JSON.stringify(config, null, 2), 'utf-8');
  } catch {
    // Best effort; ignore
  }
}

export function setOAuthClient(credentials: { clientId: string; clientSecret: string }): void {
  const existing = loadConfig() ?? { clientId: '', clientSecret: '' };
  const next: GmailConfig = { ...existing, clientId: credentials.clientId, clientSecret: credentials.clientSecret };
  saveConfig(next);
}

export function clearTokens(): void {
  const cfg = loadConfig();
  if (!cfg) return;
  delete cfg.tokens;
  saveConfig(cfg);
}

export function getStatus(): { configured: boolean; authenticated: boolean } {
  const cfg = loadConfig();
  const configured = !!cfg?.clientId && !!cfg?.clientSecret;
  const authenticated = configured && !!cfg?.tokens?.access_token && !!cfg?.tokens?.refresh_token;
  return { configured, authenticated };
}

function base64UrlEncode(input: Buffer | string): string {
  const b64 = (typeof input === 'string' ? Buffer.from(input, 'utf-8') : input).toString('base64');
  return b64.replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, '');
}

async function exchangeCodeForTokens(params: {
  clientId: string;
  clientSecret: string;
  code: string;
  redirectUri: string;
}): Promise<OAuthTokens> {
  const body = new URLSearchParams({
    code: params.code,
    client_id: params.clientId,
    client_secret: params.clientSecret,
    redirect_uri: params.redirectUri,
    grant_type: 'authorization_code',
  });
  const resp = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body,
  });
  if (!resp.ok) {
    const text = await resp.text();
    throw new Error(`Token exchange failed: ${resp.status} ${text}`);
  }
  const json = (await resp.json()) as OAuthTokens;
  const now = Date.now();
  if (typeof json.expires_in === 'number') {
    json.expiry_date = now + (json.expires_in - 60) * 1000; // subtract buffer
  }
  return json;
}

async function refreshAccessToken(config: GmailConfig): Promise<OAuthTokens> {
  if (!config.tokens?.refresh_token) {
    throw new Error('No refresh token available');
  }
  const body = new URLSearchParams({
    client_id: config.clientId,
    client_secret: config.clientSecret,
    refresh_token: config.tokens.refresh_token,
    grant_type: 'refresh_token',
  });
  const resp = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body,
  });
  if (!resp.ok) {
    const text = await resp.text();
    throw new Error(`Refresh token failed: ${resp.status} ${text}`);
  }
  const json = (await resp.json()) as OAuthTokens;
  const now = Date.now();
  if (typeof json.expires_in === 'number') {
    json.expiry_date = now + (json.expires_in - 60) * 1000;
  }
  // Preserve refresh_token if not returned in refresh response
  if (!json.refresh_token && config.tokens?.refresh_token) {
    json.refresh_token = config.tokens.refresh_token;
  }
  return json;
}

async function ensureValidAccessToken(): Promise<string> {
  const cfg = loadConfig();
  if (!cfg || !cfg.tokens) throw new Error('Not authenticated');
  const now = Date.now();
  if (!cfg.tokens.expiry_date || now >= cfg.tokens.expiry_date - 5000) {
    const refreshed = await refreshAccessToken(cfg);
    const next: GmailConfig = { ...cfg, tokens: refreshed };
    saveConfig(next);
    return refreshed.access_token;
  }
  return cfg.tokens.access_token;
}

export async function startOAuthFlow(): Promise<void> {
  const cfg = loadConfig();
  if (!cfg || !cfg.clientId || !cfg.clientSecret) {
    throw new Error('OAuth client is not configured');
  }

  // Start a local loopback server on a random port
  const server = createServer();
  const port = await new Promise<number>((resolve, reject) => {
    server.on('error', reject);
    server.listen(0, '127.0.0.1', () => {
      const addr = server.address();
      if (addr && typeof addr === 'object') resolve(addr.port);
      else reject(new Error('Failed to bind local server'));
    });
  });

  const redirectUri = `http://127.0.0.1:${port}`;
  const authUrl = new URL('https://accounts.google.com/o/oauth2/v2/auth');
  authUrl.searchParams.set('client_id', cfg.clientId);
  authUrl.searchParams.set('redirect_uri', redirectUri);
  authUrl.searchParams.set('response_type', 'code');
  authUrl.searchParams.set('scope', GMAIL_SEND_SCOPE);
  authUrl.searchParams.set('access_type', 'offline');
  authUrl.searchParams.set('prompt', 'consent');

  const codePromise = new Promise<string>((resolve, reject) => {
    const timer = setTimeout(() => {
      try { server.close(); } catch {}
      reject(new Error('OAuth flow timed out'));
    }, 5 * 60_000);

    server.on('request', async (req: IncomingMessage, res: ServerResponse) => {
      try {
        const url = new URL(req.url || '/', redirectUri);
        const codeParam = url.searchParams.get('code');
        const errorParam = url.searchParams.get('error');
        if (errorParam) throw new Error(`OAuth error: ${errorParam}`);
        if (!codeParam) throw new Error('No code received');
        res.statusCode = 200;
        res.setHeader('Content-Type', 'text/html; charset=utf-8');
        res.end('<html><body><h3>Authentication complete. You can close this window.</h3></body></html>');
        clearTimeout(timer);
        server.close(() => resolve(codeParam));
      } catch (err) {
        res.statusCode = 400;
        res.end('Authentication failed. You can close this window.');
        clearTimeout(timer);
        server.close(() => reject(err as Error));
      }
    });
  });

  // Open consent URL in default browser then wait for code
  await shell.openExternal(authUrl.toString());
  const code = await codePromise;

  // Exchange code for tokens
  const tokens = await exchangeCodeForTokens({
    clientId: cfg.clientId,
    clientSecret: cfg.clientSecret,
    code,
    redirectUri,
  });
  const next: GmailConfig = { ...cfg, tokens };
  saveConfig(next);
}

export async function sendGmailEmail(payload: { to: string; subject: string; body: string }): Promise<void> {
  const cfg = loadConfig();
  if (!cfg?.clientId || !cfg?.clientSecret) throw new Error('Gmail not configured');
  const accessToken = await ensureValidAccessToken();

  const mime = [
    `To: ${payload.to}\r\n`,
    `Subject: ${payload.subject}\r\n`,
    'Content-Type: text/plain; charset="UTF-8"\r\n',
    '\r\n',
    payload.body,
  ].join('');
  const raw = base64UrlEncode(Buffer.from(mime, 'utf-8'));

  const resp = await fetch('https://gmail.googleapis.com/gmail/v1/users/me/messages/send', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ raw }),
  });
  if (!resp.ok) {
    const text = await resp.text();
    throw new Error(`Gmail send failed: ${resp.status} ${text}`);
  }
}


