import { Check, Copy } from "lucide-react";
import { observer } from "mobx-react-lite";
import { AnimatePresence, motion } from "motion/react";
import { useState } from "react";
import { twMerge } from "tailwind-merge";
import { kit } from "@/components/kit";
import { useGlobalServices } from "@/services/GlobalServicesContextProvider";

type ParagraphTranscripts = {
  transcripts: Array<{ createdAt: Date; role: string; text: string }>;
  remainingMicText: string;
  remainingSystemText: string;
};

export const CopyAll = observer(function CopyAll() {
  const { contextService } = useGlobalServices();
  const { paragraphTranscripts } = contextService.fullContext;
  const [didCopy, setDidCopy] = useState(false);

  return (
    <motion.div
      key="copy-transcript"
      className="size-fit"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
    >
      <kit.HeadlessButton
        onClick={() => {
          navigator.clipboard.writeText(getFormattedTranscript(paragraphTranscripts));
          setDidCopy(true);
          setTimeout(() => {
            setDidCopy(false);
          }, 2000);
        }}
        className={twMerge(
          "shadow-pane-action relative bg-surface-action border-white/20 border-[0.5px]  hover:bg-surface-action-hover whitespace-nowrap w-full overflow-hidden flex justify-center items-center px-1.5 py-1 text-xs text-primary-foreground rounded-lg",
        )}
      >
        <AnimatePresence>
          <motion.span
            key="copy-all"
            variants={{
              hidden: {
                opacity: 0,
                scale: 0.9,
              },
              visible: {
                opacity: 1,
                scale: 1,
              },
            }}
            initial={false}
            animate={didCopy ? "hidden" : "visible"}
            className="inline-block"
          >
            <Copy className="size-3 inline-block mr-1" />
            Copy All
          </motion.span>
          {didCopy && (
            <motion.div
              key="check"
              initial={{ opacity: 0, scale: 0.9, x: "-50%", y: "-50%" }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              transition={{ duration: 0.1, ease: "easeOut" }}
              className="pointer-events-none absolute left-1/2 top-1/2"
            >
              <Check className="size-4" />
            </motion.div>
          )}
        </AnimatePresence>
      </kit.HeadlessButton>
    </motion.div>
  );
});

function getFormattedTranscript(paragraphTranscripts: ParagraphTranscripts) {
  const formatTime = (timestamp: string) => {
    const date = new Date(timestamp);
    return date.toLocaleTimeString("en-US", {
      hour: "numeric",
      minute: "2-digit",
    });
  };

  let text = paragraphTranscripts.transcripts
    .map((transcript) => {
      const time = formatTime(transcript.createdAt.toISOString());
      const role = transcript.role === "system" ? "Them" : "Me";
      return `${role} | ${time}\n${transcript.text}`;
    })
    .join("\n");

  const remainingMicText = paragraphTranscripts.remainingMicText;
  const remainingSystemText = paragraphTranscripts.remainingSystemText;
  const currentTime = formatTime(new Date().toISOString());

  if (remainingMicText) {
    text += `\nMe | ${currentTime}\n${remainingMicText}`;
  }
  if (remainingSystemText) {
    text += `\nThem | ${currentTime}\n${remainingSystemText}`;
  }

  return text;
}
