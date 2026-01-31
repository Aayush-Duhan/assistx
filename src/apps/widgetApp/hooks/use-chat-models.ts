import { useEffect, useState } from "react";
import { modelsApi, type ProviderModels } from "@/lib/api";

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
        const providers = await modelsApi.list();

        // Transform API response to expected format
        const transformed: ProviderInfo[] = providers.map((p: ProviderModels) => ({
          provider: p.providerId,
          hasAPIKey: p.hasApiKey,
          models: [
            // Built-in models - extract modelId from AIModel objects
            ...p.builtInModels.map((m) => ({ name: m.modelId })),
            // Custom models - use displayName for custom models
            ...p.customModels.map((m) => ({ name: m.displayName })),
          ],
        }));

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
