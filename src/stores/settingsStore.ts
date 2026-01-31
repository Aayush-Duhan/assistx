import { makeObservable, observable, action } from "mobx";

// Available AI providers - only Google Gemini
export const AI_PROVIDERS = {
  google: "Google Gemini",
} as const;

export type AIProviderKey = keyof typeof AI_PROVIDERS;

// Available AI models per provider - only Google models
export const AI_MODELS_BY_PROVIDER = {
  google: {
    "gemini-2.5-flash": "Gemini 2.5 Flash (Recommended)",
    "gemini-2.5-pro": "Gemini 2.5 Pro",
    "gemini-2.5-flash-lite-preview-06-17": "Gemini 2.5 Flash Lite (Fast)",
  },
} as const;

export type AIModelKey = {
  [K in AIProviderKey]: keyof (typeof AI_MODELS_BY_PROVIDER)[K];
}[AIProviderKey];

/**
 * Settings store to manage application settings including AI provider and model selection
 */
class SettingsStore {
  // AI provider and model selection - default to Google Gemini
  selectedProvider: AIProviderKey = "google";
  selectedModel: AIModelKey = "gemini-2.5-flash";

  constructor() {
    makeObservable(this, {
      selectedProvider: observable,
      selectedModel: observable,
      setSelectedProvider: action,
      setSelectedModel: action,
    });

    // Load settings from localStorage on initialization
    this.loadSettings();
  }

  /**
   * Set the selected AI provider and reset model to first available
   */
  setSelectedProvider(provider: AIProviderKey): void {
    this.selectedProvider = provider;
    // Reset to first available model for the provider
    const availableModels = this.getAvailableModelsForProvider(provider);
    if (availableModels.length > 0) {
      this.selectedModel = availableModels[0].value;
    }
    this.saveSettings();
  }

  /**
   * Set the selected AI model
   */
  setSelectedModel(model: AIModelKey): void {
    this.selectedModel = model;
    this.saveSettings();
  }

  /**
   * Get the display name for the currently selected provider
   */
  getSelectedProviderDisplayName(): string {
    return AI_PROVIDERS[this.selectedProvider];
  }

  /**
   * Get the display name for the currently selected model
   */
  getSelectedModelDisplayName(): string {
    const providerModels = AI_MODELS_BY_PROVIDER[this.selectedProvider];
    return providerModels[this.selectedModel as keyof typeof providerModels] || "Unknown Model";
  }

  /**
   * Get all available providers as an array of options
   */
  getAvailableProviders(): Array<{ value: AIProviderKey; label: string }> {
    return Object.entries(AI_PROVIDERS).map(([value, label]) => ({
      value: value as AIProviderKey,
      label,
    }));
  }

  /**
   * Get available models for the currently selected provider
   */
  getAvailableModels(): Array<{ value: AIModelKey; label: string }> {
    return this.getAvailableModelsForProvider(this.selectedProvider);
  }

  /**
   * Get available models for a specific provider
   */
  getAvailableModelsForProvider(
    provider: AIProviderKey,
  ): Array<{ value: AIModelKey; label: string }> {
    const providerModels = AI_MODELS_BY_PROVIDER[provider];
    return Object.entries(providerModels).map(([value, label]) => ({
      value: value as AIModelKey,
      label,
    }));
  }

  /**
   * Get the currently selected provider and model configuration
   */
  getCurrentConfiguration(): { provider: AIProviderKey; model: AIModelKey } {
    return {
      provider: this.selectedProvider,
      model: this.selectedModel,
    };
  }

  /**
   * Save settings to localStorage
   */
  private saveSettings(): void {
    try {
      const settings = {
        selectedProvider: this.selectedProvider,
        selectedModel: this.selectedModel,
      };
      localStorage.setItem("assistx_settings", JSON.stringify(settings));
    } catch (error) {
      console.warn("Failed to save settings to localStorage:", error);
    }
  }

  /**
   * Load settings from localStorage
   */
  private loadSettings(): void {
    try {
      const stored = localStorage.getItem("assistx_settings");
      if (stored) {
        const settings = JSON.parse(stored);

        // Load provider - validate it exists and default to google if not
        if (settings.selectedProvider && settings.selectedProvider in AI_PROVIDERS) {
          this.selectedProvider = settings.selectedProvider;
        } else {
          this.selectedProvider = "google";
        }

        // Load model (validate it exists for the selected provider)
        if (settings.selectedModel) {
          const providerModels = AI_MODELS_BY_PROVIDER[this.selectedProvider];
          if (settings.selectedModel in providerModels) {
            this.selectedModel = settings.selectedModel;
          } else {
            // Default to first model if stored model doesn't exist
            const availableModels = this.getAvailableModelsForProvider(this.selectedProvider);
            if (availableModels.length > 0) {
              this.selectedModel = availableModels[0].value;
            }
          }
        }
      }
    } catch (error) {
      console.warn("Failed to load settings from localStorage:", error);
      // Set defaults if loading fails
      this.selectedProvider = "google";
      this.selectedModel = "gemini-2.5-flash";
    }
  }
}

export const settingsStore = new SettingsStore();
