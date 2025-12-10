export type AudioState =
    | { state: "off"; startAction: () => void }
    | { state: "loading"; stopAction: () => void }
    | { state: "on"; pauseAction: () => void; stopAction: () => void }
    | { state: "paused"; resumeAction: () => void; stopAction: () => void }
    | { state: "error"; error: Error; retryAction: () => void; stopAction: () => void };

// Utility type for extracting a specific state
export type TypedAudioState<S extends AudioState["state"]> = Extract<AudioState, { state: S }>;

export type action = "assist" | "what_next" | "follow_up" | "fact_check" | "recap" | "default";