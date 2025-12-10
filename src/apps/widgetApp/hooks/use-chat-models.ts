import { customModelProvider } from "@/lib/models";

export const useChatModels = () => {
  return {
    data: customModelProvider.modelsInfo.sort((a, b) => {
      if (a.hasAPIKey && !b.hasAPIKey) return -1;
      if (!a.hasAPIKey && b.hasAPIKey) return 1;
      return 0;
    }),
    isLoading: false,
    error: null,
  };
};