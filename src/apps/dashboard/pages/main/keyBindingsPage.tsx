import { useState, useEffect, useCallback } from "react";
import { LuSearch, LuRotateCcw, LuX, LuInfo, LuKeyboard } from "react-icons/lu";
import { GoAlert } from "react-icons/go";
import { FiEdit } from "react-icons/fi";
import { cn } from "@/lib/utils";
import { useSharedState, updateState } from "@/shared/shared";
import { keyboardEventToAccelerator, formatAcceleratorForDisplay } from "@/lib/accelerator";
import {
  DEFAULT_KEYBINDINGS,
  type Keybindings,
  type KeybindingsDisabled,
} from "@/shared/sharedState";

// Keybinding metadata with labels and categories
const KEYBINDING_CONFIG: Record<
  keyof Keybindings,
  { label: string; description: string; category: string }
> = {
  start_over: {
    label: "Start Over",
    description: "Reset the current conversation",
    category: "Actions",
  },
  trigger_ai: { label: "Trigger AI", description: "Send message to AI", category: "Actions" },
  hide: {
    label: "Hide Window",
    description: "Toggle window visibility",
    category: "Window Control",
  },
  move_window_up: {
    label: "Move Up",
    description: "Move window up on screen",
    category: "Window Control",
  },
  move_window_down: {
    label: "Move Down",
    description: "Move window down on screen",
    category: "Window Control",
  },
  move_window_left: {
    label: "Move Left",
    description: "Move window left on screen",
    category: "Window Control",
  },
  move_window_right: {
    label: "Move Right",
    description: "Move window right on screen",
    category: "Window Control",
  },
  scroll_response_up: {
    label: "Scroll Up",
    description: "Scroll response content up",
    category: "Navigation",
  },
  scroll_response_down: {
    label: "Scroll Down",
    description: "Scroll response content down",
    category: "Navigation",
  },
};

// Categories in display order
const CATEGORIES = ["Actions", "Window Control", "Navigation"];

type KeybindingKey = keyof Keybindings;

const KeybindingsPage = () => {
  const sharedState = useSharedState();
  const [searchQuery, setSearchQuery] = useState("");
  const [recordingKey, setRecordingKey] = useState<KeybindingKey | null>(null);
  const [recordedAccelerator, setRecordedAccelerator] = useState<string>("");
  const [recordingWarning, setRecordingWarning] = useState<string>("");
  const [conflictKey, setConflictKey] = useState<KeybindingKey | null>(null);

  const keybindings = sharedState?.keybindings ?? DEFAULT_KEYBINDINGS;
  const keybindingsDisabled = sharedState?.keybindingsDisabled ?? {};
  const platform = sharedState?.platform ?? "win32";

  // Filter keybindings based on search
  const filteredKeybindings = Object.entries(KEYBINDING_CONFIG).filter(([_, config]) => {
    if (!searchQuery) return true;
    const query = searchQuery.toLowerCase();
    return (
      config.label.toLowerCase().includes(query) ||
      config.description.toLowerCase().includes(query) ||
      config.category.toLowerCase().includes(query)
    );
  });

  // Group by category
  const groupedKeybindings = CATEGORIES.map((category) => ({
    category,
    items: filteredKeybindings.filter(([_, config]) => config.category === category),
  })).filter((group) => group.items.length > 0);

  // Start recording a new keybinding
  const startRecording = useCallback((key: KeybindingKey) => {
    setRecordingKey(key);
    setRecordedAccelerator("");
    setRecordingWarning("");
    setConflictKey(null);
    // Disable global shortcuts while recording
    updateState({ recordingKeybinding: true });
  }, []);

  // Cancel recording
  const cancelRecording = useCallback(() => {
    setRecordingKey(null);
    setRecordedAccelerator("");
    setRecordingWarning("");
    setConflictKey(null);
    updateState({ recordingKeybinding: false });
  }, []);

  // Save the recorded keybinding
  const saveRecording = useCallback(() => {
    if (!recordingKey || !recordedAccelerator) return;

    const newKeybindings = { ...keybindings, [recordingKey]: recordedAccelerator };
    updateState({
      keybindings: newKeybindings,
      recordingKeybinding: false,
    });

    setRecordingKey(null);
    setRecordedAccelerator("");
    setRecordingWarning("");
    setConflictKey(null);
  }, [recordingKey, recordedAccelerator, keybindings]);

  // Check for conflicts with other keybindings
  const checkConflict = useCallback(
    (accelerator: string, excludeKey: KeybindingKey): KeybindingKey | null => {
      for (const [key, value] of Object.entries(keybindings)) {
        if (key !== excludeKey && value === accelerator) {
          return key as KeybindingKey;
        }
      }
      return null;
    },
    [keybindings],
  );

  // Handle keydown during recording
  useEffect(() => {
    if (!recordingKey) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      e.preventDefault();
      e.stopPropagation();

      // Escape cancels recording
      if (e.key === "Escape") {
        cancelRecording();
        return;
      }

      const result = keyboardEventToAccelerator(e);
      if (!result) return;

      if (result.isModifierOnly) {
        setRecordedAccelerator(result.accelerator);
        setRecordingWarning("Press a non-modifier key to complete");
        return;
      }

      setRecordedAccelerator(result.accelerator);

      // Check for conflicts
      const conflict = checkConflict(result.accelerator, recordingKey);
      if (conflict) {
        setConflictKey(conflict);
        setRecordingWarning(`Conflicts with "${KEYBINDING_CONFIG[conflict].label}"`);
      } else if (result.isSystemShortcut) {
        setRecordingWarning("This is a system shortcut and may cause conflicts");
        setConflictKey(null);
      } else {
        setRecordingWarning("");
        setConflictKey(null);
      }
    };

    window.addEventListener("keydown", handleKeyDown, true);
    return () => window.removeEventListener("keydown", handleKeyDown, true);
  }, [recordingKey, cancelRecording, checkConflict]);

  // Toggle keybinding enabled/disabled
  const toggleEnabled = useCallback(
    (key: KeybindingKey) => {
      const newDisabled: KeybindingsDisabled = {
        ...keybindingsDisabled,
        [key]: !keybindingsDisabled[key],
      };
      updateState({ keybindingsDisabled: newDisabled });
    },
    [keybindingsDisabled],
  );

  // Reset a keybinding to default
  const resetToDefault = useCallback(
    (key: KeybindingKey) => {
      const newKeybindings = { ...keybindings, [key]: DEFAULT_KEYBINDINGS[key] };
      updateState({ keybindings: newKeybindings });
    },
    [keybindings],
  );

  // Reset all keybindings to default
  const resetAllToDefault = useCallback(() => {
    updateState({
      keybindings: DEFAULT_KEYBINDINGS,
      keybindingsDisabled: {},
    });
  }, []);

  return (
    <div className="pb-8">
      {/* Header Section */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-semibold text-zinc-100">Keybindings</h1>
          <p className="text-sm text-zinc-500">Customize keyboard shortcuts</p>
        </div>
        <button
          onClick={resetAllToDefault}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-zinc-400 hover:text-zinc-300 hover:bg-zinc-800 border border-zinc-700/50 transition-all duration-150"
        >
          <LuRotateCcw className="w-3.5 h-3.5" />
          Reset All
        </button>
      </div>

      {/* Search Bar */}
      <div className="relative mb-6">
        <LuSearch className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Search keybindings..."
          className="w-full h-10 pl-10 pr-4 rounded-lg text-sm bg-zinc-900/50 border border-zinc-800 text-zinc-300 placeholder-zinc-600 focus:outline-none focus:ring-1 focus:ring-zinc-600 focus:border-zinc-600 transition-all duration-150"
        />
      </div>

      {/* Keybindings List */}
      <div className="space-y-6">
        {groupedKeybindings.map(({ category, items }) => (
          <div key={category}>
            <h2 className="text-xs font-medium text-zinc-500 uppercase tracking-wider mb-3">
              {category}
            </h2>
            <div className="space-y-2">
              {items.map(([key, config]) => {
                const keybindingKey = key as KeybindingKey;
                const accelerator = keybindings[keybindingKey];
                const isDisabled = keybindingsDisabled[keybindingKey];
                const isDefault = accelerator === DEFAULT_KEYBINDINGS[keybindingKey];

                return (
                  <div
                    key={key}
                    className={cn(
                      "flex items-center justify-between p-3 rounded-xl border transition-all duration-200",
                      isDisabled
                        ? "bg-zinc-900/20 border-zinc-800/50 opacity-60"
                        : "bg-zinc-900/30 border-zinc-700/50",
                    )}
                  >
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium text-zinc-200">{config.label}</span>
                        {!isDefault && (
                          <span className="text-[10px] text-amber-400/80 px-1.5 py-0.5 rounded bg-amber-500/10 border border-amber-500/20">
                            Modified
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-zinc-500 mt-0.5">{config.description}</p>
                    </div>

                    <div className="flex items-center gap-2">
                      {/* Current Shortcut Display */}
                      <div className="px-3 py-1.5 rounded-lg text-xs font-mono bg-zinc-800/50 border border-zinc-700/50 text-zinc-300 min-w-[100px] text-center">
                        {formatAcceleratorForDisplay(accelerator, platform)}
                      </div>

                      {/* Edit Button */}
                      <button
                        onClick={() => startRecording(keybindingKey)}
                        className="p-1.5 rounded-lg text-zinc-500 hover:text-blue-400 hover:bg-blue-500/10 transition-all duration-150"
                        title="Edit keybinding"
                      >
                        <FiEdit className="w-3.5 h-3.5" />
                      </button>

                      {/* Reset Button */}
                      {!isDefault && (
                        <button
                          onClick={() => resetToDefault(keybindingKey)}
                          className="p-1.5 rounded-lg text-zinc-500 hover:text-zinc-300 hover:bg-zinc-800 transition-all duration-150"
                          title="Reset to default"
                        >
                          <LuRotateCcw className="w-3.5 h-3.5" />
                        </button>
                      )}

                      {/* Enable/Disable Toggle */}
                      <button
                        onClick={() => toggleEnabled(keybindingKey)}
                        className={cn(
                          "relative w-9 h-5 rounded-full transition-colors duration-300 focus:outline-none focus:ring-2 focus:ring-blue-500/20",
                          isDisabled
                            ? "bg-zinc-700 hover:bg-zinc-650"
                            : "bg-blue-600 hover:bg-blue-500",
                        )}
                        title={isDisabled ? "Enable keybinding" : "Disable keybinding"}
                      >
                        <div
                          className={cn(
                            "absolute top-0.5 w-4 h-4 rounded-full bg-white shadow-sm transition-all duration-300 transform",
                            isDisabled
                              ? "left-0.5 translate-x-0"
                              : "left-[calc(100%-1.125rem)] translate-x-0",
                          )}
                        >
                          {/* Optional: Add iconic indicators inside the thumb if desired, sticking to clean look for now */}
                        </div>
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        ))}
      </div>

      {/* Recording Modal */}
      {recordingKey && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          {/* Backdrop */}
          <div
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            onClick={cancelRecording}
          />

          {/* Modal Content */}
          <div className="relative z-10 w-full max-w-md mx-4 p-6 rounded-2xl bg-zinc-900 border border-zinc-700/50 shadow-2xl">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h3 className="text-base font-semibold text-zinc-100">Recording Keybinding</h3>
                <p className="text-sm text-zinc-500 mt-0.5">
                  {KEYBINDING_CONFIG[recordingKey].label}
                </p>
              </div>
              <button
                onClick={cancelRecording}
                className="p-1.5 rounded-lg text-zinc-500 hover:text-zinc-300 hover:bg-zinc-800 transition-all duration-150"
              >
                <LuX className="w-5 h-5" />
              </button>
            </div>

            {/* Recording Display */}
            <div className="flex flex-col items-center py-8">
              <LuKeyboard className="w-12 h-12 text-zinc-600 mb-4" />
              <div
                className={cn(
                  "text-2xl font-mono font-medium mb-2 min-h-[36px]",
                  recordedAccelerator ? "text-zinc-100" : "text-zinc-600",
                )}
              >
                {recordedAccelerator
                  ? formatAcceleratorForDisplay(recordedAccelerator, platform)
                  : "Press keys..."}
              </div>
              <p className="text-xs text-zinc-500">Press Escape to cancel</p>
            </div>

            {/* Warning/Error Messages */}
            {recordingWarning && (
              <div
                className={cn(
                  "flex items-start gap-2 p-3 rounded-lg mb-4",
                  conflictKey
                    ? "bg-red-500/10 border border-red-500/20"
                    : "bg-amber-500/10 border border-amber-500/20",
                )}
              >
                {conflictKey ? (
                  <GoAlert className="w-4 h-4 text-red-400 mt-0.5 flex-shrink-0" />
                ) : (
                  <LuInfo className="w-4 h-4 text-amber-400 mt-0.5 flex-shrink-0" />
                )}
                <p className={cn("text-xs", conflictKey ? "text-red-300" : "text-amber-300")}>
                  {recordingWarning}
                </p>
              </div>
            )}

            {/* Action Buttons */}
            <div className="flex justify-end gap-2">
              <button
                onClick={cancelRecording}
                className="px-4 py-2 rounded-lg text-sm font-medium text-zinc-400 hover:text-zinc-300 hover:bg-zinc-800 transition-all duration-150"
              >
                Cancel
              </button>
              <button
                onClick={saveRecording}
                disabled={!recordedAccelerator || recordingWarning.includes("non-modifier")}
                className={cn(
                  "px-4 py-2 rounded-lg text-sm font-medium transition-all duration-150",
                  recordedAccelerator && !recordingWarning.includes("non-modifier")
                    ? "bg-blue-600 text-white hover:bg-blue-500"
                    : "bg-zinc-800 text-zinc-600 cursor-not-allowed",
                )}
              >
                Save
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default KeybindingsPage;
