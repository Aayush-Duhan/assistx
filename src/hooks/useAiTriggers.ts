import { useFeatureFlag, FeatureFlags } from '../stores/featureStore';

// Type definitions
type KeyboardShortcut = string;

/**
 * Returns the appropriate keyboard accelerator for scrolling down,
 * respecting the user's Vim mode preference.
 *
 * @returns {string} The keyboard shortcut string.
 */
export function useVimScrollDownShortcut(): KeyboardShortcut {
    const isVimMode = useFeatureFlag(FeatureFlags.VIM_MODE_KEY_BINDINGS);
    return isVimMode ? "CommandOrControl+J" : "CommandOrControl+Down";
}

/**
 * Returns the appropriate keyboard accelerator for scrolling up,
 * respecting the user's Vim mode preference.
 *
 * @returns {string} The keyboard shortcut string.
 */
export function useVimScrollUpShortcut(): KeyboardShortcut {
    const isVimMode = useFeatureFlag(FeatureFlags.VIM_MODE_KEY_BINDINGS);
    return isVimMode ? "CommandOrControl+K" : "CommandOrControl+Up";
} 