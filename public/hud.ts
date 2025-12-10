import { useContext, createContext, useState, useEffectEvent, useRef } from "react";
import { useLocalStorage } from "usehooks-ts";
import { broadcastToAllWindowsFromRenderer } from "@/shared"

type SessionCreatedState = Extract<SessionState, { state: "created" }>;

function isSessionCreatedAndAudio(
    session: SessionState
): session is SessionCreatedState & { audio: AudioState } {
    return session.state === "created" && session.audio !== null;
}

export type AiConversation = {
    responses: ConversationResponse[];
    pendingResponse:
    | {
        state: "streaming";
        id: UUID;
        text: string;
        hasScreenshot: boolean;
        screenshot: string | null;
        reasoningSteps: { text: string }[];
        displayInput: string | null;
    }
    | {
        state: "error";
        reason: "network" | "unknown";
        userFacingMessage?: string;
        displayInput: string | null;
    }
    | null;
};


/**
 * SessionState encompasses everything -- Cluely session, conversation
 * responses, audio recording, transcript.
 */
type SessionState =
    | { state: "idle" }
    | {
        state: "creating";
        abortController: AbortController;
        hasAudio: boolean;
        createOptions: NewDashboardSessionOptions;
        substate: { value: "creating_session" } | { value: "starting_recall"; session: SessionInfo };
    }
    | {
        state: "created";
        session: SessionInfo;
        /** audio state, if the session has audio */
        audio: AudioState | null;
        createOptions: NewDashboardSessionOptions;
    }
    | {
        state: "error";
        error: Error;
        /* if set, starting audio errored, but session was created successfully */
        createdSession: SessionInfo | null;
        createOptions: NewDashboardSessionOptions;
    };

function useInner() {
    const [session, setSession] = useState<SessionState>({ state: "idle" });
    const [clicked, setClicked] = useState({
        askAi: false,
        clear: false,
        hide: false,
    });
    const [conversation, setConversation] = useState<AiConversation>({
        responses: [],
        pendingResponse: null,
    });
    const setClickedAskAi = useEffectEvent((value: boolean) =>
        setClicked((old) => ({ ...old, askAi: value })),
    );
    const setClickedClear = useEffectEvent((value: boolean) =>
        setClicked((old) => ({ ...old, clear: value })),
    );
    const setClickedHide = useEffectEvent((value: boolean) =>
        setClicked((old) => ({ ...old, hide: value })),
    );
    const [useScreen, setUseScreen] = useLocalStorage("screen-enabled", true);
    const emptyTranscriptTimerRef = useRef<NodeJS.Timeout | null>(null);

    const stopAudio = useEffectEvent(() => {
        if (emptyTranscriptTimerRef.current) {
            clearTimeout(emptyTranscriptTimerRef.current);
            emptyTranscriptTimerRef.current = null;
        }
        if (isSessionCreatedAndAudio(session)) {
            // implement something to stop the audio
            session.audio.stop();

            broadcastToAllWindowsFromRenderer("open-session", {
                sessionId: session.session.id,
                isDemoMeeting: session.createOptions.isDemoMeeting ?? false,
            });
        }
    })

    return {
        // settings
        useScreen,
        setUseScreen,
        clicked,
        setClickedAskAi,
        setClickedClear,
        setClickedHide,

        // state
        session,
        conversation,
    }
}

type T = ReturnType<typeof useInner>;
const HudContext = createContext<T>(null as unknown as T);

export const useHud = () => useContext(HudContext);