import { AnimatePresence, motion } from "framer-motion";
import { LuCommand } from "react-icons/lu";
import { Collapse } from "@/assets/collapse";
import { Expand } from "@/assets/expand";
import Kbd from "@/components/catalyst/kbd";
import { kit } from "@/components/kit";
import { useGlobalServices } from "@/services/GlobalServicesContextProvider";

type Props = {
  setMode: (mode: "chat" | "transcript") => void;
};

export function ToggleSize({ setMode }: Props) {
  const { aiResponsesService } = useGlobalServices();
  const {
    ignoreCurrentConversation,
    conversation,
    triggerAiState,
    revealCurrentConversation,
    clearConversation,
    setClickedClear,
  } = aiResponsesService;

  const hasConversationContent =
    conversation.responses.length > 0 || conversation.pendingResponse !== null || !!triggerAiState;

  if (!hasConversationContent) {
    return null;
  }

  return (
    <kit.Tooltip
      tooltipContent={
        ignoreCurrentConversation ? (
          <span className="inline-flex items-center justify-center h-5.5">Expand conversation</span>
        ) : (
          <div className="flex items-center gap-1.5 h-5.5">
            <span>Collapse conversation</span>
            <div className="inline-flex items-center gap-1">
              <Kbd>
                <LuCommand className="size-2.5" />
              </Kbd>
              <Kbd className="text-[10px]">R</Kbd>
            </div>
          </div>
        )
      }
    >
      <kit.HeadlessButton
        onClick={() => {
          if (ignoreCurrentConversation) {
            revealCurrentConversation();
          } else {
            clearConversation({ onlyClearVisually: true });
            setMode("chat");

            setClickedClear(true);
          }
        }}
        className="relative cursor-pointer z-10 group/button before:z-0 before:absolute before:-inset-1 hover:before:bg-white/15 before:rounded-full before:transition-colors before:duration-150"
      >
        <AnimatePresence mode="popLayout">
          <motion.div
            key={ignoreCurrentConversation ? "collapsed" : "expanded"}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2, ease: "easeOut" }}
          >
            {ignoreCurrentConversation ? (
              <Expand className="size-5.5 text-white/60 group-hover/button:text-white group-hover/button:scale-110 transition-transform duration-200" />
            ) : (
              <Collapse className="size-5.5 text-white/60 group-hover/button:text-white group-hover/button:scale-90 transition-transform duration-200" />
            )}
          </motion.div>
        </AnimatePresence>
      </kit.HeadlessButton>
    </kit.Tooltip>
  );
}
