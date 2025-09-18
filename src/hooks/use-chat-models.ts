import { customModelProvider } from "@/lib/models";

export const useChatModels = () => {
  return {
    data: customModelProvider.modelsInfo,
    isLoading: false,
    error: null,
  };
};