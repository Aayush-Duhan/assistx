/**
 * An enum-like object for all feature flag keys used in the application.
 * This provides type safety and autocompletion.
 */
export const FeatureFlags = {
    VIM_MODE_KEY_BINDINGS: "vim_mode_key_bindings",
    DEV_INSPECT_APP: "dev_inspect_app",
    TRIGGER_AI_MODEL: "trigger_ai_model",
    MAX_ATTACHMENT_COUNT: "max_attachment_count",
    USAGE_LIMIT_VARIANT: "usage_limit_variant",
} as const;

export type FeatureFlagKey = typeof FeatureFlags[keyof typeof FeatureFlags];

/**
 * A custom hook to check the value of a specific feature flag.
 * For the open-source version, we provide default values for all flags.
 *
 * @param flagKey - The key of the feature flag to check.
 * @returns The value of the feature flag.
 */
export function useFeatureFlag(flagKey: FeatureFlagKey): boolean | string | undefined {
    // Default feature flag values for open-source version
    const defaultFlags: Record<FeatureFlagKey, boolean | string | undefined> = {
        [FeatureFlags.VIM_MODE_KEY_BINDINGS]: false,
        [FeatureFlags.DEV_INSPECT_APP]: process.env.NODE_ENV === 'development',
        [FeatureFlags.TRIGGER_AI_MODEL]: 'gpt-4',
        [FeatureFlags.MAX_ATTACHMENT_COUNT]: '5',
        [FeatureFlags.USAGE_LIMIT_VARIANT]: 'unlimited',
    };

    return defaultFlags[flagKey];
}

/**
 * A custom hook to check if screenshots are enabled.
 * For the open-source version, screenshots are always enabled.
 */
export function useCanTakeScreenshot(): boolean {
    // Screenshots are always enabled in the open-source version
    return true;
} 