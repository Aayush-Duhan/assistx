import {
  broadcastToAllWindowsFromRenderer,
  updateState,
  useIpcRendererHandler,
} from "@/shared";
import { Plus } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectSeparator,
  SelectTrigger,
  SelectValue,
} from "#/renderer/components/catalyst/select";
import { catchError, platform } from "#/renderer/lib/api/client";

const QUERY_KEY = ["dashboard.instructions.get"];
const MUTATION_KEY = ["dashboard.instructions.id.default.patch"];
const SELF_BROADCAST_ID = crypto.randomUUID();

export default function ModeSelector() {

  useIpcRendererHandler("broadcast-to-all-windows", (payload) => {
    if (payload.command === "active-mode-updated") {
      // ignore broadcasts from self
      if (payload.id !== SELF_BROADCAST_ID) {
        queryClient.invalidateQueries({ queryKey: QUERY_KEY });
      }
    }
  });

  return (
    <AnimatePresence initial={false}>
      {isSuccess && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.1, ease: "easeOut" }}
        >
          <Select
            value={data?.activeInstructionId}
            onValueChange={(value) => {
              if (value === "create-mode") {
                updateState({
                  showDashboard: true,
                });
                broadcastToAllWindowsFromRenderer("open-dashboard-page", {
                  page: "/customize",
                });
              } else {
                setDefaultMutation.mutate(value as string);
              }
            }}
            onOpenChange={(open) => {
              if (open) refetch();
            }}
          >
            <SelectTrigger className="truncate [&>span]:truncate rounded-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectGroup>
                <SelectLabel>Your Modes</SelectLabel>
                {data?.instructions.map((mode) => (
                  <SelectItem key={mode.id} value={mode.id}>
                    {mode.displayName}
                  </SelectItem>
                ))}
              </SelectGroup>
              <SelectSeparator />
              <SelectItem value="create-mode">
                <div className="flex items-center gap-1 text-primary-foreground">
                  <Plus className="size-3.5" />
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
