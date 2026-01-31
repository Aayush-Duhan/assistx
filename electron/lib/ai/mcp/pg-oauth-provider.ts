import type {
  OAuthTokens,
  OAuthClientInformationFull,
  OAuthClientMetadata,
  OAuthClientInformation,
} from "@modelcontextprotocol/sdk/shared/auth.js";
import { OAuthClientProvider, UnauthorizedError } from "@modelcontextprotocol/sdk/client/auth.js";

import globalLogger from "../../logger";
import { colorize } from "consola/utils";
import { uuidv7 } from "uuidv7";
import { jsonMcpOAuthRepository } from "../../db/json/mcp-oauth-repository.json";
import { McpOAuthSession } from "../../../types/mcp";
import { ConsolaInstance } from "consola";

/**
 * JSON-backed OAuth client provider for MCP servers
 * Manages OAuth authentication state and tokens in Electron userData
 */
export class PgOAuthClientProvider implements OAuthClientProvider {
  private currentOAuthState: string = "";
  private cachedAuthData: McpOAuthSession | undefined;
  private logger: ConsolaInstance;
  private initialized = false;

  constructor(
    private config: {
      name: string;
      mcpServerId: string;
      serverUrl: string;
      _clientMetadata: OAuthClientMetadata;
      onRedirectToAuthorization: (authUrl: URL) => Promise<void>;
      state?: string;
    },
  ) {
    this.logger = globalLogger.withDefaults({
      message: colorize("dim", `[MCP OAuth Provider ${this.config.name}-${uuidv7().slice(0, 4)}] `),
    });
  }

  private async initializeOAuth() {
    if (this.initialized) return;
    // 0. If a constructor state was provided (callback/hand-off), adopt it first
    if (this.config.state) {
      const session = await jsonMcpOAuthRepository.getSessionByState(this.config.state);
      if (session && session.mcpServerId === this.config.mcpServerId) {
        this.currentOAuthState = session.state || "";
        this.cachedAuthData = session;
        this.initialized = true;
        this.logger.info("Adopted OAuth session from provided state");
        return;
      }
    }
    // 1. Check for authenticated session first
    const authenticated = await jsonMcpOAuthRepository.getAuthenticatedSession(
      this.config.mcpServerId,
    );
    if (authenticated) {
      this.currentOAuthState = authenticated.state || "";
      this.cachedAuthData = authenticated;
      this.initialized = true;
      this.logger.info("Using existing authenticated session");
      return;
    }

    // 2. Always create a new in-progress session when not authenticated
    this.currentOAuthState = uuidv7();
    this.cachedAuthData = await jsonMcpOAuthRepository.createSession(this.config.mcpServerId, {
      state: this.currentOAuthState,
      serverUrl: this.config.serverUrl,
    });
    this.initialized = true;
    this.logger.info("Created new OAuth session");
  }

  private async getAuthData() {
    await this.initializeOAuth();
    return this.cachedAuthData;
  }

  private async updateAuthData(data: Partial<McpOAuthSession>) {
    if (!this.currentOAuthState) {
      throw new Error("OAuth provider has not been initialized");
    }

    this.cachedAuthData = await jsonMcpOAuthRepository.updateSessionByState(
      this.currentOAuthState,
      data,
    );
    return this.cachedAuthData;
  }

  get redirectUrl(): string {
    return this.config._clientMetadata.redirect_uris[0];
  }

  get clientMetadata(): OAuthClientMetadata {
    return this.config._clientMetadata;
  }

  state(): string {
    return this.currentOAuthState;
  }

  async clientInformation(): Promise<OAuthClientInformation | undefined> {
    const authData = await this.getAuthData();
    if (authData?.clientInfo) {
      // Check if redirect URI matches (security check)
      if (!authData.tokens && authData.clientInfo.redirect_uris[0] != this.redirectUrl) {
        // Security guard: redirect URI mismatch → drop only this mismatched session by state
        if (authData.state) {
          await jsonMcpOAuthRepository.deleteByState(authData.state);
        }
        this.cachedAuthData = undefined;
        this.initialized = false;
        return undefined;
      }
      return authData.clientInfo;
    }

    return undefined;
  }

  async saveClientInformation(clientCredentials: OAuthClientInformationFull): Promise<void> {
    await this.updateAuthData({
      clientInfo: clientCredentials,
    });

    this.logger.debug(`OAuth client credentials stored successfully`);
  }

  async tokens(): Promise<OAuthTokens | undefined> {
    const authData = await this.getAuthData();
    if (authData?.tokens) {
      return authData.tokens;
    }

    return undefined;
  }

  async saveTokens(accessTokens: OAuthTokens): Promise<void> {
    // Store tokens for current state
    this.cachedAuthData = await jsonMcpOAuthRepository.saveTokensAndCleanup(
      this.currentOAuthState,
      this.config.mcpServerId,
      { tokens: accessTokens },
    );

    this.logger.info(`OAuth tokens stored successfully`);
  }

  async redirectToAuthorization(authorizationUrl: URL): Promise<void> {
    authorizationUrl.searchParams.set("state", this.state());
    await this.config.onRedirectToAuthorization(authorizationUrl);
  }

  async saveCodeVerifier(pkceVerifier: string): Promise<void> {
    await this.updateAuthData({
      codeVerifier: pkceVerifier,
    });
  }

  async codeVerifier(): Promise<string> {
    const authData = await this.getAuthData();
    if (!authData?.codeVerifier) {
      throw new UnauthorizedError(
        "OAuth code verifier is missing. Please restart the authorization process.",
      );
    }
    return authData.codeVerifier;
  }

  /**
   * Adopt the given OAuth state by loading its session from DB.
   * Useful when the callback is handled by a different instance.
   */
  async adoptState(state: string): Promise<void> {
    if (!state) return;
    const session = await jsonMcpOAuthRepository.getSessionByState(state);
    if (!session) return;
    if (session.mcpServerId !== this.config.mcpServerId) {
      this.logger.warn(
        `Attempted to adopt state for different server (${session.mcpServerId}), ignoring`,
      );
      return;
    }
    this.currentOAuthState = state;
    this.cachedAuthData = session;
    this.initialized = true;
    this.logger.info(`Adopted OAuth state for callback reconciliation`);
  }

  async invalidateCredentials(
    invalidationScope: "all" | "client" | "tokens" | "verifier",
  ): Promise<void> {
    try {
      switch (invalidationScope) {
        case "all":
          await jsonMcpOAuthRepository.deleteByState(this.currentOAuthState);
          this.cachedAuthData = undefined;
          this.initialized = false;
          this.currentOAuthState = "";
          this.logger.info(`OAuth credentials invalidated`);
          break;
        case "tokens":
          await this.updateAuthData({
            tokens: undefined,
          });
          this.logger.info(`OAuth tokens invalidated`);
          break;
      }
    } catch (error) {
      this.logger.error(`Failed to invalidate OAuth credentials: ${error}`);
      throw error;
    }
  }
}
