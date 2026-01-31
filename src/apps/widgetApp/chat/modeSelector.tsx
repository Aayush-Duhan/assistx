import { useState, useEffect, useCallback } from "react";
import { LuPlus } from "react-icons/lu";
import { AnimatePresence, motion } from "motion/react";
import { PulseLoader } from "react-spinners";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectSeparator,
  SelectTrigger,
  SelectValue,
} from "@/components/catalyst/select";
import { modesApi, type Mode } from "@/lib/api";

const openCreateMode = () => {
  // TODO: Implement navigation to dashboard modes page
  console.log("[ModeSelector] Open dashboard to create mode");
};

export default function ModeSelector() {
  const [modes, setModes] = useState<Mode[]>([]);
  const [activeMode, setActiveMode] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Fetch modes from server API
  const fetchModes = useCallback(async (showLoading = true) => {
    if (showLoading) setIsLoading(true);
    try {
      const dbModes = await modesApi.list();
      setModes(dbModes);
      const active = dbModes.find((m) => m.isActive);
      setActiveMode(active?.id ?? null);
    } catch (e) {
      console.error("[ModeSelector] Failed to load modes:", e);
    }
    if (showLoading) setIsLoading(false);
  }, []);

  // Load modes on mount
  useEffect(() => {
    fetchModes();
  }, [fetchModes]);

  // Set active mode handler with optimistic update
  const setActiveModeHandler = async (modeId: string) => {
    const previousActive = activeMode;

    // Optimistic update
    setActiveMode(modeId);

    try {
      await modesApi.activate(modeId);
    } catch (e) {
      console.error("[ModeSelector] Failed to set active mode:", e);
      // Rollback on failure
      setActiveMode(previousActive);
    }
  };

  // Get the active mode name for display
  const activeModeObj = modes.find((m) => m.id === activeMode);
  const displayName = activeModeObj?.name ?? "Select Mode";

  return (
    <AnimatePresence initial={false}>
      {isLoading && (
        <div className="opacity-50">
          <PulseLoader size={4} color="white" />
        </div>
      )}
      {!isLoading && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.1, ease: "easeOut" }}
        >
          <Select
            value={activeMode ?? undefined}
            onValueChange={(value) => {
              if (value === "create-mode") {
                openCreateMode();
              } else {
                setActiveModeHandler(value);
              }
            }}
          >
            <SelectTrigger className="truncate [&>span]:truncate rounded-full py-1 pl-2 pr-1 bg-surface-action-hover/70">
              <SelectValue placeholder={displayName} />
            </SelectTrigger>
            <SelectContent>
              <SelectGroup>
                <SelectLabel>Your Modes</SelectLabel>
                {modes.length > 0 ? (
                  modes.map((mode) => (
                    <SelectItem key={mode.id} value={mode.id}>
                      {mode.name}
                    </SelectItem>
                  ))
                ) : (
                  <div className="px-2 py-1.5 text-xs text-zinc-500">No modes available</div>
                )}
              </SelectGroup>
              <SelectSeparator />
              <SelectItem value="create-mode">
                <div className="flex items-center gap-1 text-primary-foreground">
                  <LuPlus className="size-3.5" />
                  Create Mode
                </div>
              </SelectItem>
            </SelectContent>
          </Select>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
