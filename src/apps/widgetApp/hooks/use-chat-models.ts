import { useEffect, useState } from "react";
import { apiFetch } from "@/lib/api";

interface ModelInfo {
  name: string;
}

interface ProviderInfo {
  provider: string;
  models: ModelInfo[];
  hasAPIKey: boolean;
}

export const useChatModels = () => {
  const [data, setData] = useState<ProviderInfo[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    const fetchModels = async () => {
      try {
        setIsLoading(true);
        const [modelsRes, connectionsRes] = await Promise.all([
          apiFetch("/providers/models"),
          apiFetch("/providers"),
        ]);
        if (!modelsRes.ok || !connectionsRes.ok) throw new Error("Failed to fetch models");
        const { providerModels } = (await modelsRes.json()) as {
          providerModels: Record<string, { id: string; name: string }[]>;
        };
        const { connections } = (await connectionsRes.json()) as {
          connections: { provider: string; isActive: boolean }[];
        };

        const activeProviders = new Set(connections.filter((c) => c.isActive).map((c) => c.provider));

        const transformed: ProviderInfo[] = Object.entries(providerModels).map(
          ([providerId, models]) => ({
            provider: providerId,
            hasAPIKey: activeProviders.has(providerId),
            models: models.map((m) => ({ name: m.name })),
          }),
        );

        // Sort by API key availability
        transformed.sort((a, b) => {
          if (a.hasAPIKey && !b.hasAPIKey) return -1;
          if (!a.hasAPIKey && b.hasAPIKey) return 1;
          return 0;
        });

        setData(transformed);
        setError(null);
      } catch (e) {
        console.error("Failed to fetch models:", e);
        setError(e instanceof Error ? e : new Error("Failed to fetch models"));
      } finally {
        setIsLoading(false);
      }
    };

    fetchModels();
  }, []);

  return { data, isLoading, error };
};
