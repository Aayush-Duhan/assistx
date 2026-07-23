/**
 * Token refresh service — proactively refreshes expiring OAuth tokens.
 * Singleton, runs every 5 minutes via setInterval.
 */
import { getProviderConnections, updateProviderConnection } from "../../db";
import { refreshToken } from "./index";
import { logger } from "../pino/logger";

let refreshInterval: ReturnType<typeof setInterval> | null = null;

export function startTokenRefreshService(): void {
  if (refreshInterval) return;
  // First run after 10s delay (let DB finish init)
  setTimeout(processRefreshableTokens, 10_000);
  refreshInterval = setInterval(processRefreshableTokens, 5 * 60 * 1000);
}

export function stopTokenRefreshService(): void {
  if (refreshInterval) {
    clearInterval(refreshInterval);
    refreshInterval = null;
  }
}

async function processRefreshableTokens(): Promise<void> {
  try {
    const connections = getProviderConnections();
    const tenMinutesFromNow = Date.now() + 10 * 60 * 1000;

    for (const conn of connections) {
      if (conn.authType !== "oauth") continue;
      if (!conn.refreshToken || !conn.expiresAt) continue;

      const expiresAtMs = new Date(conn.expiresAt).getTime();
      if (expiresAtMs > tenMinutesFromNow) continue;

      try {
        const result = await refreshToken(conn.provider, conn.refreshToken);
        if (result) {
          const updateData: Record<string, unknown> = {
            accessToken: result.accessToken,
            expiresAt: new Date(Date.now() + (result.expiresIn || 3600) * 1000).toISOString(),
          };
          if (result.refreshToken) updateData.refreshToken = result.refreshToken;
          updateProviderConnection(conn.id, updateData);
          logger.info("token-refresh.success", `Refreshed token for ${conn.provider}`, { provider: conn.provider });
        }
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        if (msg.includes("invalid_grant")) {
          updateProviderConnection(conn.id, {
            providerSpecificData: {
              ...conn.providerSpecificData,
              lastError: "Refresh token revoked or expired",
              lastErrorAt: new Date().toISOString(),
            },
          });
        }
        logger.error(
          err instanceof Error ? err : new Error(msg),
          "token-refresh.error",
          `Failed to refresh ${conn.provider}`,
        );
      }
    }
  } catch (err) {
    logger.error(
      err instanceof Error ? err : new Error(String(err)),
      "token-refresh.cycle.error",
      "Token refresh cycle failed",
    );
  }
}
