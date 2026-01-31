import { useState, useEffect, useMemo, useCallback } from "react";
import { LuSearch, LuPlus, LuTrash2, LuSave, LuPower, LuPowerOff, LuX } from "react-icons/lu";
import { cn } from "@/lib/utils";
import { modesApi } from "@/lib/api";

// Mode interface (matches database schema)
interface Mode {
  id: string;
  name: string;
  description: string;
  systemPrompt: string;
}

// Draft object for editing
interface Draft {
  name: string;
  description: string;
  systemPrompt: string;
}

const emptyDraft: Draft = { name: "", description: "", systemPrompt: "" };

// Confirmation modal types
type ConfirmationType = "delete" | "unsaved" | null;
interface ConfirmationState {
  type: ConfirmationType;
  modeName?: string;
  isActiveMode?: boolean;
  pendingAction?: () => void;
}

const ModesPage = () => {
  const [modes, setModes] = useState<Mode[]>([]);
  const [activeMode, setActiveMode] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");

  // Selected mode for viewing/editing
  const [selectedModeId, setSelectedModeId] = useState<string | null>(null);

  // Editing state (also used for creating)
  const [isCreating, setIsCreating] = useState(false);
  const [draft, setDraft] = useState<Draft>(emptyDraft);

  // Confirmation modal state
  const [confirmation, setConfirmation] = useState<ConfirmationState>({ type: null });

  // Centralized DB reload logic
  const fetchModes = useCallback(async () => {
    try {
      const dbModes = await modesApi.list();

      const loadedModes: Mode[] = dbModes.map((m) => ({
        id: m.id,
        name: m.name,
        description: m.description || "",
        systemPrompt: m.systemPrompt,
      }));

      setModes(loadedModes);

      const activeDbMode = dbModes.find((m) => m.isActive);
      setActiveMode(activeDbMode?.id ?? null);
    } catch (e) {
      console.error("Failed to load modes:", e);
    }
  }, []);

  // Load modes on mount
  useEffect(() => {
    fetchModes();
  }, [fetchModes]);

  // Get selected mode object
  const selectedMode = useMemo(() => {
    if (!selectedModeId) return null;
    return modes.find((m) => m.id === selectedModeId) || null;
  }, [modes, selectedModeId]);

  // Check if there are unsaved changes
  const hasChanges = useMemo(() => {
    if (isCreating) {
      return (
        draft.name.trim() !== "" ||
        draft.description.trim() !== "" ||
        draft.systemPrompt.trim() !== ""
      );
    }
    if (!selectedMode) return false;
    return (
      draft.name !== selectedMode.name ||
      draft.description !== selectedMode.description ||
      draft.systemPrompt !== selectedMode.systemPrompt
    );
  }, [isCreating, selectedMode, draft]);

  // Filter modes based on search
  const filteredModes = modes.filter((mode) => {
    if (!searchQuery) return true;
    const query = searchQuery.toLowerCase();
    return (
      mode.name.toLowerCase().includes(query) || mode.description.toLowerCase().includes(query)
    );
  });

  // Check unsaved changes before action
  const guardUnsavedChanges = (action: () => void): boolean => {
    if (hasChanges) {
      setConfirmation({ type: "unsaved", pendingAction: action });
      return true;
    }
    return false;
  };

  // Select a mode to view/edit (internal, no guard)
  const doSelectMode = (mode: Mode) => {
    setIsCreating(false);
    setSelectedModeId(mode.id);
    setDraft({ name: mode.name, description: mode.description, systemPrompt: mode.systemPrompt });
  };

  // Select a mode (with unsaved changes guard)
  const selectMode = (mode: Mode) => {
    if (mode.id === selectedModeId) return;
    if (guardUnsavedChanges(() => doSelectMode(mode))) return;
    doSelectMode(mode);
  };

  // Start creating a new mode (internal, no guard)
  const doStartCreating = () => {
    setSelectedModeId(null);
    setIsCreating(true);
    setDraft(emptyDraft);
  };

  // Start creating a new mode (with unsaved changes guard)
  const startCreating = () => {
    if (isCreating) return;
    if (guardUnsavedChanges(doStartCreating)) return;
    doStartCreating();
  };

  // Cancel selection/creation
  const clearSelection = () => {
    setSelectedModeId(null);
    setIsCreating(false);
    setDraft(emptyDraft);
  };

  // Toggle mode activation with optimistic update and rollback
  const toggleModeActive = async () => {
    if (!selectedModeId) return;

    const previousActiveMode = activeMode;
    const newActiveMode = activeMode === selectedModeId ? null : selectedModeId;

    // Optimistic update
    setActiveMode(newActiveMode);

    try {
      if (newActiveMode) {
        await modesApi.activate(newActiveMode);
      } else {
        await modesApi.deactivate();
      }
    } catch (e) {
      console.error("Failed to set active mode:", e);
      // Rollback on failure
      setActiveMode(previousActiveMode);
    }
  };

  // Handle create mode
  const handleCreateMode = async () => {
    if (!draft.name.trim() || !draft.systemPrompt.trim()) return;

    try {
      const result = await modesApi.create({
        name: draft.name.trim(),
        description: draft.description.trim() || "Custom mode",
        systemPrompt: draft.systemPrompt.trim(),
      });

      const newMode: Mode = {
        id: result.id,
        name: draft.name.trim(),
        description: draft.description.trim() || "Custom mode",
        systemPrompt: draft.systemPrompt.trim(),
      };
      setModes([...modes, newMode]);

      // Select the newly created mode and reset draft to match
      setIsCreating(false);
      setSelectedModeId(result.id);
      setDraft({
        name: newMode.name,
        description: newMode.description,
        systemPrompt: newMode.systemPrompt,
      });
    } catch (e) {
      console.error("Failed to create mode:", e);
      await fetchModes();
    }
  };

  // Handle update mode
  const handleUpdateMode = async () => {
    if (!draft.name.trim() || !draft.systemPrompt.trim() || !selectedModeId) return;

    try {
      await modesApi.update(selectedModeId, {
        name: draft.name.trim(),
        description: draft.description.trim() || "Custom mode",
        systemPrompt: draft.systemPrompt.trim(),
      });

      // Update local state
      const updated = modes.map((m: Mode) =>
        m.id === selectedModeId
          ? {
              ...m,
              name: draft.name.trim(),
              description: draft.description.trim() || "Custom mode",
              systemPrompt: draft.systemPrompt.trim(),
            }
          : m,
      );
      setModes(updated);
    } catch (e) {
      console.error("Failed to update mode:", e);
      await fetchModes();
    }
  };

  // Request delete mode (with confirmation and unsaved changes guard)
  const requestDeleteMode = (id: string) => {
    const mode = modes.find((m) => m.id === id);
    if (!mode) return;

    const isActive = activeMode === id;
    const doDelete = () => {
      setConfirmation({
        type: "delete",
        modeName: mode.name,
        isActiveMode: isActive,
        pendingAction: () => executeDeleteMode(id),
      });
    };

    if (hasChanges && selectedModeId === id) {
      setConfirmation({ type: "unsaved", pendingAction: doDelete });
    } else {
      doDelete();
    }
  };

  // Execute delete mode (after confirmation)
  const executeDeleteMode = async (id: string) => {
    try {
      await modesApi.delete(id);

      setModes(modes.filter((m: Mode) => m.id !== id));

      if (activeMode === id) {
        setActiveMode(null);
      }

      if (selectedModeId === id) {
        clearSelection();
      }
    } catch (e) {
      console.error("Failed to delete mode:", e);
      await fetchModes();
    }
  };

  // Dismiss confirmation modal
  const dismissConfirmation = () => {
    setConfirmation({ type: null });
  };

  // Confirm the pending action
  const confirmAction = () => {
    const action = confirmation.pendingAction;
    setConfirmation({ type: null });
    action?.();
  };

  // Handle save (create or update)
  const handleSave = () => {
    if (isCreating) {
      handleCreateMode();
    } else {
      handleUpdateMode();
    }
  };

  return (
    <div className="pb-8">
      {/* Header Section */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-semibold text-zinc-100">Modes</h1>
          <p className="text-sm text-zinc-500">Configure AI contexts for different use cases</p>
        </div>
        <button
          onClick={startCreating}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-zinc-300 bg-zinc-800 hover:bg-zinc-700 border border-zinc-700 transition-all duration-150"
        >
          <LuPlus className="w-3.5 h-3.5" />
          Create Mode
        </button>
      </div>

      {/* Search Bar */}
      <div className="relative mb-6">
        <LuSearch className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Search modes..."
          className="w-full h-10 pl-10 pr-4 rounded-lg text-sm bg-zinc-900/50 border border-zinc-800 text-zinc-300 placeholder-zinc-600 focus:outline-none focus:ring-1 focus:ring-zinc-600 focus:border-zinc-600 transition-all duration-150"
        />
      </div>

      {/* Modes List */}
      <div className="space-y-2">
        {filteredModes.length > 0
          ? filteredModes.map((mode: Mode) => (
              <div
                key={mode.id}
                onClick={() => selectMode(mode)}
                className={cn(
                  "flex items-center justify-between p-3 rounded-xl border transition-all duration-200 cursor-pointer group",
                  selectedModeId === mode.id
                    ? "bg-zinc-800/50 border-zinc-600 ring-1 ring-zinc-500/30"
                    : activeMode === mode.id
                      ? "bg-blue-500/10 border-blue-500/30"
                      : "bg-zinc-900/30 border-zinc-700/50 hover:bg-zinc-900/50 hover:border-zinc-600/50",
                )}
              >
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium text-zinc-200">{mode.name}</span>
                    {activeMode === mode.id && (
                      <span className="text-[10px] text-blue-400 px-1.5 py-0.5 rounded bg-blue-500/10 border border-blue-500/20">
                        Active
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-zinc-500 mt-0.5 truncate">{mode.description}</p>
                </div>

                <div className="flex items-center gap-1">
                  {/* Delete Button */}
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      requestDeleteMode(mode.id);
                    }}
                    className="p-1.5 rounded-lg text-zinc-500 hover:text-red-400 hover:bg-red-500/10 transition-all duration-150 opacity-0 group-hover:opacity-100"
                    title="Delete mode"
                  >
                    <LuTrash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            ))
          : !searchQuery && (
              <button
                onClick={startCreating}
                className="w-full flex items-center justify-center gap-1.5 p-4 rounded-xl text-sm font-medium text-zinc-500 hover:text-zinc-400 bg-zinc-900/20 hover:bg-zinc-900/30 border border-dashed border-zinc-700/50 hover:border-zinc-600/50 transition-all duration-150"
              >
                <LuPlus className="w-4 h-4" />
                Create your first mode
              </button>
            )}
      </div>

      {/* Mode Details / Create Form Section */}
      <div className="mt-8">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <h2 className="text-xs font-medium text-zinc-500 uppercase tracking-wider">
              {isCreating ? "Create New Mode" : selectedMode ? "Mode Details" : "Mode Details"}
            </h2>
            {selectedMode && <span className="text-xs text-zinc-400">— {selectedMode.name}</span>}
          </div>
          {(selectedMode || isCreating) && (
            <div className="flex items-center gap-2">
              {/* Activate/Deactivate toggle (only for existing modes) */}
              {selectedMode && (
                <button
                  onClick={toggleModeActive}
                  className={cn(
                    "inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium transition-all duration-150",
                    activeMode === selectedModeId
                      ? "text-blue-400 bg-blue-500/10 hover:bg-blue-500/20 border border-blue-500/30"
                      : "text-zinc-400 hover:text-zinc-300 hover:bg-zinc-800 border border-zinc-700",
                  )}
                >
                  {activeMode === selectedModeId ? (
                    <>
                      <LuPowerOff className="w-3 h-3" />
                      Deactivate
                    </>
                  ) : (
                    <>
                      <LuPower className="w-3 h-3" />
                      Activate
                    </>
                  )}
                </button>
              )}
              {/* Save Changes button */}
              {hasChanges && (
                <button
                  onClick={handleSave}
                  disabled={!draft.name.trim() || !draft.systemPrompt.trim()}
                  className={cn(
                    "inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium transition-all duration-150",
                    draft.name.trim() && draft.systemPrompt.trim()
                      ? "bg-blue-600 text-white hover:bg-blue-500"
                      : "bg-zinc-800 text-zinc-600 cursor-not-allowed",
                  )}
                >
                  <LuSave className="w-3 h-3" />
                  {isCreating ? "Create Mode" : "Save Changes"}
                </button>
              )}
            </div>
          )}
        </div>

        {selectedMode || isCreating ? (
          <div className="rounded-xl border border-zinc-700/50 bg-zinc-900/30 overflow-hidden">
            {/* Mode Name & Description inputs */}
            <div className="p-4 border-b border-zinc-800/50 space-y-4">
              <div>
                <label className="block text-xs text-zinc-400 mb-1.5">Mode Name</label>
                <input
                  type="text"
                  value={draft.name}
                  onChange={(e) => setDraft({ ...draft, name: e.target.value })}
                  placeholder="e.g., Customer Support"
                  className="w-full h-9 px-3 rounded-lg text-sm bg-zinc-950 border border-zinc-800 text-zinc-300 placeholder-zinc-600 focus:outline-none focus:ring-1 focus:ring-zinc-600 focus:border-zinc-600 transition-all duration-150"
                />
              </div>
              <div>
                <label className="block text-xs text-zinc-400 mb-1.5">Description</label>
                <input
                  type="text"
                  value={draft.description}
                  onChange={(e) => setDraft({ ...draft, description: e.target.value })}
                  placeholder="Brief description of what this mode is for"
                  className="w-full h-9 px-3 rounded-lg text-sm bg-zinc-950 border border-zinc-800 text-zinc-300 placeholder-zinc-600 focus:outline-none focus:ring-1 focus:ring-zinc-600 focus:border-zinc-600 transition-all duration-150"
                />
              </div>
            </div>

            {/* System Prompt textarea */}
            <div className="p-4">
              <label className="block text-xs text-zinc-400 mb-1.5">System Prompt</label>
              <textarea
                value={draft.systemPrompt}
                onChange={(e) => setDraft({ ...draft, systemPrompt: e.target.value })}
                placeholder="You are a helpful assistant specialized in..."
                rows={8}
                className="w-full px-3 py-2.5 rounded-lg text-sm bg-zinc-950 border border-zinc-800 text-zinc-300 placeholder-zinc-600 focus:outline-none focus:ring-1 focus:ring-zinc-600 focus:border-zinc-600 transition-all duration-150 resize-none"
              />
            </div>

            {/* Knowledge Base placeholder */}
            <div className="p-4 border-t border-zinc-800/50">
              <div className="p-3 rounded-lg border border-dashed border-zinc-700/50 bg-zinc-900/30">
                <div className="flex items-center gap-2 text-zinc-500">
                  <LuPlus className="w-4 h-4" />
                  <span className="text-xs">Upload PDF files for context</span>
                  <span className="text-[10px] text-zinc-600 px-1.5 py-0.5 rounded bg-zinc-800/50 ml-auto">
                    Coming Soon
                  </span>
                </div>
              </div>
            </div>

            {/* Delete button for selected mode */}
            {selectedMode && (
              <div className="p-4 border-t border-zinc-800/50">
                <button
                  onClick={() => requestDeleteMode(selectedMode.id)}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-red-400 hover:text-red-300 hover:bg-red-500/10 border border-red-500/30 transition-all duration-150"
                >
                  <LuTrash2 className="w-3.5 h-3.5" />
                  Delete Mode
                </button>
              </div>
            )}
          </div>
        ) : (
          <div className="rounded-xl border border-dashed border-zinc-700/50 bg-zinc-900/20 p-8 text-center">
            <p className="text-sm text-zinc-500">
              Select a mode above to view and edit its details
            </p>
          </div>
        )}
      </div>

      {/* Confirmation Modal */}
      {confirmation.type && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          {/* Backdrop */}
          <div
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            onClick={dismissConfirmation}
          />

          {/* Modal Content */}
          <div className="relative z-10 w-full max-w-sm mx-4 p-5 rounded-2xl bg-zinc-900 border border-zinc-700/50 shadow-2xl">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-base font-semibold text-zinc-100">
                {confirmation.type === "delete" ? "Delete Mode" : "Unsaved Changes"}
              </h3>
              <button
                onClick={dismissConfirmation}
                className="p-1.5 rounded-lg text-zinc-500 hover:text-zinc-300 hover:bg-zinc-800 transition-all duration-150"
              >
                <LuX className="w-4 h-4" />
              </button>
            </div>

            <p className="text-sm text-zinc-400 mb-5">
              {confirmation.type === "delete" ? (
                <>
                  Are you sure you want to delete{" "}
                  <span className="text-zinc-200 font-medium">"{confirmation.modeName}"</span>?
                  {confirmation.isActiveMode && (
                    <span className="block mt-2 text-amber-400">
                      Warning: This is the currently active mode. Deleting it will deactivate it.
                    </span>
                  )}
                </>
              ) : (
                "You have unsaved changes. Discard them?"
              )}
            </p>

            <div className="flex justify-end gap-2">
              <button
                onClick={dismissConfirmation}
                className="px-4 py-2 rounded-lg text-sm font-medium text-zinc-400 hover:text-zinc-300 hover:bg-zinc-800 transition-all duration-150"
              >
                Cancel
              </button>
              <button
                onClick={confirmAction}
                className={cn(
                  "px-4 py-2 rounded-lg text-sm font-medium transition-all duration-150",
                  confirmation.type === "delete"
                    ? "bg-red-600 text-white hover:bg-red-500"
                    : "bg-amber-600 text-white hover:bg-amber-500",
                )}
              >
                {confirmation.type === "delete" ? "Delete" : "Discard"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ModesPage;
