
export const APP_NAME = "AssistX";
export const APP_VERSION = "1.0.0";
export const APP_DESCRIPTION = 'An invisible desktop assistant that sees your screen and hears your audio. Helpful for meetings, sales calls, and more.';
export const IS_DEV = window.electron.process.env.NODE_ENV === 'development';

export const IS_MAC = window.electron.process.platform === 'darwin';
export const IS_WINDOWS = window.electron.process.platform === 'win32';

export const PREDEFINED_PROMPTS = {
    whatShouldISay: {
        display: ' Give me helpful information',
        input: `
    Give me helpful information for the current moment in the conversation.
    Things that could be helpful:
    - If there's a question, answer it.
    - If there's a very clear objection, address it.
    - If there's an action needed (like closing a sales call) and it's specifically
    requested/stated above, provide the action.
    - If there are terms/proper nouns of interest, define them starting from the most
    recent (at the end of the transcript) and working backwards.
    Be as terse and to the point as possible with each action.
    You can perform none, one, or multiple of the above based on the conversation, but
    your total response **MUST IN ANY CASE BE SHORTER THAN 14 lines total.**
    `,
    },
    suggestFollowUpQuestions: {
        display: ' Suggest follow-up questions',
        input: 'Suggest two follow-up questions that the participant can ask to carry forward the conversation',
    },
} as const;


export const FOLLOW_UP_PROMPTS = {
    draftFollowUpEmail: {
        display: '✉️ Draft a follow-up email',
        input: `Draft a follow-up email Output the email greeting, body, and closing in a
    code block Use placeholders for the sender and recipient names, unless the names were
    explicitly mentioned in the conversation`,
    },
    generateActionItems: {
        display: '✅ Generate action items',
        input: 'List all action items discussed, formatted as bullet points',
    },
    generateExecutiveSummary: {
        display: '📝 Generate executive summary',
        input: 'Generate a one-paragraph executive summary of the conversation, including key points and decisions made',
    },
    openSummaryInDashboard: {
        display: '📊 Show summary in dashboard',
    },
    closeLiveInsights: {
        display: '❌ Close live insights',
    },
} as const;

export const APP_URL = "https://assistx.ai";
export const DOCS_URL = "https://assistx.ai/docs";

export const GITHUB_REPO = 'assistx-ai/assistx';
export const GITHUB_ISSUES_URL = `https://github.com/${GITHUB_REPO}/issues`;
export const GITHUB_RELEASES_URL = `https://github.com/${GITHUB_REPO}/releases`;
export const GITHUB_API_RELEASES_URL = `https://api.github.com/repos/${GITHUB_REPO}/releases/latest`;

export const FeatureFlags = {
    VIM_MODE_KEY_BINDINGS: "vim_mode_key_bindings",
    DEV_INSPECT_APP: "dev_inspect_app",
    TRIGGER_AI_MODEL: "trigger_ai_model",
    MAX_ATTACHMENT_COUNT: "max_attachment_count",
    USE_DEEPGRAM_TRANSCRIPTION: "use_deepgram_transcription",
} as const;

export type FeatureFlagKey = typeof FeatureFlags[keyof typeof FeatureFlags];

export const DEFAULT_FEATURE_FLAGS: Record<FeatureFlagKey, boolean | string | number> = {
    [FeatureFlags.VIM_MODE_KEY_BINDINGS]: false,
    [FeatureFlags.DEV_INSPECT_APP]: process.env.NODE_ENV === 'development',
    [FeatureFlags.TRIGGER_AI_MODEL]: 'gpt-4',
    [FeatureFlags.MAX_ATTACHMENT_COUNT]: 3,
    [FeatureFlags.USE_DEEPGRAM_TRANSCRIPTION]: true,
};

export const USER_CONTEXT_PLACEHOLDER = '...';
export const MAX_SCREENSHOT_HEIGHT = 1080;
export const TARGET_AUDIO_SAMPLE_RATE = 16000;

export const DRAG_DEAD_ZONE_PX = 5;
export const SESSION_REFRESH_TIMEOUT = 5 * 60 * 1000; // 5 minutes

export const AI_CONFIG = {
    DEFAULT_MODEL: 'gemini-2.5-flash',
    DEFAULT_PROVIDER: 'google',
    MAX_TOKENS: 4000,
    TEMPERATURE: 0.7,
    MAX_RETRIES: 3,
} as const;

export type AIProvider = 'google';
export type AIModel = string;

export const SHORTCUTS = {
    GENERATE: 'CommandOrControl+Enter',
    SPECIFY: 'CommandOrControl+Shift+Enter',
    ASK: 'CommandOrControl+Enter', // Same as GENERATE for some configurations
    CLEAR: 'CommandOrControl+R',
    TOGGLE_VISIBILITY: 'CommandOrControl+\\',
    SCROLL_UP: 'CommandOrControl+[',
    SCROLL_DOWN: 'CommandOrControl+]',
    VIM_SCROLL_UP: 'CommandOrControl+K',
    VIM_SCROLL_DOWN: 'CommandOrControl+J',
    MOVE_LEFT: 'CommandOrControl+Left',
    MOVE_RIGHT: 'CommandOrControl+Right',
    VIM_MOVE_LEFT: 'CommandOrControl+H',
    VIM_MOVE_RIGHT: 'CommandOrControl+L',
    VIM_MOVE_UP: 'CommandOrControl+Shift+K',
    VIM_MOVE_DOWN: 'CommandOrControl+Shift+J',
    };
    