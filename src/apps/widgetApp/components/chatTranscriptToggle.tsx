import { AnimatePresence, motion } from "motion/react";
import { twMerge } from "tailwind-merge";
import { kit } from "@/components/kit";
import { useGlobalServices } from "@/services/GlobalServicesContextProvider";

export default function ChatTranscriptToggle({
  mode,
  setMode,
}: {
  mode: "chat" | "transcript";
  setMode: (mode: "chat" | "transcript") => void;
}) {
  const { aiResponsesService } = useGlobalServices();

  return (
    <div className="flex relative items-center space-x-0.5 text-white/50">
      <kit.HeadlessButton
        onClick={() => {
          aiResponsesService.revealCurrentConversation();
          setMode("chat");
        }}
        className={twMerge(
          "relative rounded-full px-2 py-1 text-sm",
          mode === "chat" ? "text-white bg-white/" : "hover:bg-white/2",
        )}
      >
        Chat <AnimatePresence>{mode === "chat" && <SelectedBackground />}</AnimatePresence>
      </kit.HeadlessButton>
      <kit.HeadlessButton
        onClick={() => {
          aiResponsesService.clearConversation({ onlyClearVisually: true });
          setMode("transcript");
        }}
        className={twMerge(
          "relative rounded-full px-2 py-1 text-sm",
          mode === "transcript" ? "text-white bg-white/2" : "hover:bg-white/2",
        )}
      >
        Transcript
        <AnimatePresence>{mode === "transcript" && <SelectedBackground />}</AnimatePresence>
      </kit.HeadlessButton>
    </div>
  );
}

function SelectedBackground() {
  return (
    <motion.div
      className="absolute inset-0 bg-white/2 shadow-pane-action border-[0.5px] border-white/10"
      layoutId="chat-transcript-toggle"
      style={{
        borderRadius: "9999px",
        boxShadow:
          "0 11px 4px 0 rgba(0, 0, 0, 0.01), 0 6px 4px 0 rgba(0, 0, 0, 0.05), 0 3px 3px 0 rgba(0, 0, 0, 0.09), 0 1px 1px 0 rgba(0, 0, 0, 0.10)",
      }}
      transition={{ type: "spring", damping: 32, stiffness: 500 }}
    />
  );
}
