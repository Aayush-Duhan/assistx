import { describe, it, expect, beforeEach, vi } from "vitest";
import { sharedStateStore } from "./sharedStateStore";
import type { SharedState } from "@/shared/sharedState";

// Minimal SharedState fixture
const makeState = (overrides: Partial<SharedState> = {}): SharedState => ({
  autoLaunchEnabled: false,
  showDashboard: false,
  undetectabilityEnabled: false,
  windowHidden: false,
  panelHidden: false,
  onboardingState: {
    permissions: {
      didGrantMicrophonePermission: false,
      didGrantScreenPermission: false,
      didGrantAccessibilityPermission: false,
    },
    restarted: false,
    surveys: { submitted: false },
    learn: { didCompleteSend: false, didCompleteHide: false },
    didCompleteLanding: false,
    completed: true,
  },
  keybindings: {
    start_over: "CommandOrControl+R",
    trigger_ai: "CommandOrControl+Enter",
    hide: "CommandOrControl+\\",
    move_window_up: "CommandOrControl+Up",
    move_window_down: "CommandOrControl+Down",
    move_window_left: "CommandOrControl+Left",
    move_window_right: "CommandOrControl+Right",
    scroll_response_up: "CommandOrControl+Shift+Up",
    scroll_response_down: "CommandOrControl+Shift+Down",
  },
  keybindingsDisabled: {},
  recordingKeybinding: false,
  ignoreMouseEvents: false,
  currentAudioSessionId: null,
  clientMetadata: null,
  platform: "win32",
  appVersion: "0.1.0",
  theme: "system",
  isIntelMac: false,
  showModesInChat: true,
  didGrantMicrophonePermission: false,
  didGrantScreenPermission: false,
  didGrantAccessibilityPermission: false,
  ...overrides,
});

// Mock IPC since we're in a Node test environment
vi.stubGlobal("window", {
  electron: {
    ipcRenderer: {
      send: vi.fn(),
      invoke: vi.fn(),
      on: vi.fn(),
      off: vi.fn(),
    },
  },
});

describe("sharedStateStore", () => {
  beforeEach(() => {
    // Reset store state
    sharedStateStore.setState({ state: null });
    vi.clearAllMocks();
  });

  describe("applySnapshot", () => {
    it("sets state from a full SharedState object", () => {
      const state = makeState({ theme: "dark" });
      sharedStateStore.getState().applySnapshot(state);
      expect(sharedStateStore.getState().state?.theme).toBe("dark");
    });

    it("overwrites previous state completely", () => {
      sharedStateStore.getState().applySnapshot(makeState({ theme: "dark" }));
      sharedStateStore.getState().applySnapshot(makeState({ theme: "light" }));
      expect(sharedStateStore.getState().state?.theme).toBe("light");
    });
  });

  describe("update", () => {
    it("strips undefined fields and sends clean update to main", () => {
      const sendMock = window.electron.ipcRenderer.send as ReturnType<typeof vi.fn>;

      sharedStateStore.getState().update({
        windowHidden: undefined,
        panelHidden: false,
      } as any);

      expect(sendMock).toHaveBeenCalledTimes(1);
      const [channel, payload] = sendMock.mock.calls[0];
      expect(channel).toBe("update-shared-state");
      expect(payload).toEqual({ panelHidden: false });
      // windowHidden should NOT be in the payload
      expect(payload).not.toHaveProperty("windowHidden");
    });

    it("does not send if all fields are undefined", () => {
      const sendMock = window.electron.ipcRenderer.send as ReturnType<typeof vi.fn>;

      sharedStateStore.getState().update({
        windowHidden: undefined,
      } as any);

      expect(sendMock).not.toHaveBeenCalled();
    });

    it("sends defined fields to main via IPC", () => {
      const sendMock = window.electron.ipcRenderer.send as ReturnType<typeof vi.fn>;

      sharedStateStore.getState().update({ showDashboard: true });

      expect(sendMock).toHaveBeenCalledWith("update-shared-state", { showDashboard: true });
    });
  });
});
