/**
 * This file contains centralized constants used throughout the application.
 * PostHog and API-related constants have been removed for the open source version.
 */

// --- Application URLs (can be customized for open source deployments) ---
export const APP_URL = "https://github.com/your-org/your-app"; // Update with your repository
export const DOCS_URL = "https://github.com/your-org/your-app/wiki"; // Update with your docs

// --- GitHub Repository Information ---
export const GITHUB_REPO = 'your-org/your-app'; // Update this with actual repository
export const GITHUB_ISSUES_URL = `https://github.com/${GITHUB_REPO}/issues`;
export const GITHUB_RELEASES_URL = `https://github.com/${GITHUB_REPO}/releases`;
export const GITHUB_API_RELEASES_URL = `https://api.github.com/repos/${GITHUB_REPO}/releases/latest`;

// --- Feature Flag Keys (simplified for open source) ---
// These can be used with environment variables or config files instead of PostHog
export const FeatureFlags = {
    VIM_MODE_KEY_BINDINGS: "vim_mode_key_bindings",
    DEV_INSPECT_APP: "dev_inspect_app",
    TRIGGER_AI_MODEL: "trigger_ai_model",
    MAX_ATTACHMENT_COUNT: "max_attachment_count",
} as const;

// Type for feature flag keys
export type FeatureFlagKey = typeof FeatureFlags[keyof typeof FeatureFlags];

// --- Default Feature Flag Values (for open source version) ---
export const DEFAULT_FEATURE_FLAGS: Record<FeatureFlagKey, boolean | string | number> = {
    [FeatureFlags.VIM_MODE_KEY_BINDINGS]: false,
    [FeatureFlags.DEV_INSPECT_APP]: process.env.NODE_ENV === 'development',
    [FeatureFlags.TRIGGER_AI_MODEL]: 'gpt-4', // Default AI model
    [FeatureFlags.MAX_ATTACHMENT_COUNT]: 3, // Default attachment limit
};

// --- AI and Media Processing ---
export const USER_CONTEXT_PLACEHOLDER = '...'; // The actual UUID would be generated at runtime
export const MAX_SCREENSHOT_HEIGHT = 1080;
export const TARGET_AUDIO_SAMPLE_RATE = 16000;

// --- UI and Animation ---
export const DRAG_DEAD_ZONE_PX = 5;
export const SESSION_REFRESH_TIMEOUT = 5 * 60 * 1000; // 5 minutes

// --- AI Configuration (for open source version) ---
export const AI_CONFIG = {
    DEFAULT_MODEL: 'gemini-2.5-flash',
    DEFAULT_PROVIDER: 'google',
    MAX_TOKENS: 4000,
    TEMPERATURE: 0.7,
    MAX_RETRIES: 3,
} as const;

// Type definitions
export type AIProvider = 'google';
export type AIModel = string; // Flexible to support different providers 