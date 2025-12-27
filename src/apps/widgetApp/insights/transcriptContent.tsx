import { sendToIpcMain } from "@/shared";
import { motion } from "framer-motion";
import { LuChevronRight, LuMic } from "react-icons/lu";
import { useEffect, useRef, useState } from "react";
import { twMerge } from "tailwind-merge";
import { didSelectText } from "../chat/conversationContent";
import { CopyIconButton } from "../components/copy";
import { ScrollingContainer } from "../components/scrollingContainer";
import { kit } from "@/components/kit";
import { useMicDeviceName } from "@/lib/audio/mic";
import { isMac } from "@/lib/platform";
import { useGlobalServices } from "@/services/GlobalServicesContextProvider";

type ParagraphTranscripts = {
  transcripts: Array<{ createdAt: Date; role: string; text: string }>;
  remainingMicText: string;
  remainingSystemText: string;
};

type TranscriptEntry = {
  /** Date string */
  createdAt: string;
  role: string;
  text: string;
};

export function TranscriptContent({ mode }: { mode: "chat" | "transcript" }) {
  const { contextService } = useGlobalServices();
  const paragraphTranscripts: ParagraphTranscripts = contextService.fullContext.paragraphTranscripts;

  const scrollRef = useRef<HTMLDivElement>(null);

  const micDeviceName = useMicDeviceName();

  const [isFirstRender, setIsFirstRender] = useState(true);

  useEffect(() => {
    setIsFirstRender(false);
  }, []);

  useEffect(() => {
    if (mode === "transcript") {
      scrollRef.current?.scrollTo({
        top: scrollRef.current.scrollHeight,
        behavior: "instant",
      });
    }
  }, [mode]);

  const partialMic = paragraphTranscripts.remainingMicText;
  const partialSystem = paragraphTranscripts.remainingSystemText;
  const hasContent =
    paragraphTranscripts.transcripts.length > 0 || !!partialMic || !!partialSystem;

  if (!hasContent) {
    return (
      <div className="my-1 text-sm px-3 pb-3 flex flex-col gap-2">
        <kit.HeadlessButton
          onClick={() => {
            if (isMac) {
              sendToIpcMain("mac-open-system-settings", {
                section: "sound > input",
              });
            } else {
              sendToIpcMain("windows-open-system-settings", {
                section: "sound-settings",
              });
            }
          }}
          className="flex items-center gap-1 cursor-pointer transition-colors text-muted-foreground hover:text-primary-foreground"
        >
          <LuMic className="size-4 inline-block" /> <span className="text-xs">{micDeviceName}</span>
          <LuChevronRight className="size-4 inline-block" />
        </kit.HeadlessButton>
        <p className="text-shade-11">Start speaking to see real-time transcriptions...</p>
      </div>
    );
  }

  const pulsingMicText = `${partialMic ?? ""}`.trim();
  const pulsingSystemText = `${partialSystem ?? ""}`.trim();

  return (
    <ScrollingContainer ref={scrollRef} className="space-y-1.5 px-3 pb-3" enableSnapToBottom>
      {paragraphTranscripts.transcripts.map((transcript, index) => (
        <TranscriptionEntry
          key={`${transcript.createdAt.getTime()}-${transcript.role}-${index}`}
          transcription={{
            createdAt: transcript.createdAt.toISOString(),
            role: transcript.role,
            text: transcript.text,
          }}
          skipAnimate={isFirstRender}
        />
      ))}

      {pulsingSystemText.length > 0 && (
        <SystemBubble skipAnimate={isFirstRender}>
          <span>
            {pulsingSystemText} <div className="size-2 rounded-full bg-current inline-block" />
          </span>
        </SystemBubble>
      )}
      {pulsingMicText.length > 0 && (
        <MicBubble skipAnimate={isFirstRender}>
          <span>
            {pulsingMicText} <div className="size-2 rounded-full bg-current inline-block" />
          </span>
        </MicBubble>
      )}
    </ScrollingContainer>
  );
}

function TranscriptionEntry({
  transcription,
  skipAnimate,
}: {
  transcription: TranscriptEntry;
  skipAnimate: boolean;
}) {
  switch (transcription.role) {
    case "mic":
      return <MicBubble skipAnimate={skipAnimate}>{transcription.text}</MicBubble>;
    case "system":
      return <SystemBubble skipAnimate={skipAnimate}>{transcription.text}</SystemBubble>;
  }
}

function MicBubble({
  skipAnimate,
  children,
}: {
  skipAnimate: boolean;
  children?: React.ReactNode;
}) {
  const [isCopied, setIsCopied] = useState(false);
  const contentRef = useRef<HTMLDivElement>(null);

  const handleCopy = () => {
    if (didSelectText()) {
      return;
    }
    const text = contentRef.current?.textContent || "";
    if (text) {
      navigator.clipboard.writeText(text);
      setIsCopied(true);
    }
  };

  return (
    <div className="w-full justify-end flex group/message relative text-primary-foreground">
      <MessageCopyButton
        onClick={handleCopy}
        side="left"
        isCopied={isCopied}
        setIsCopied={setIsCopied}
      />
      <motion.div
        ref={contentRef}
        className="px-2.5 py-1.5 w-fit max-w-72 rounded-xl rounded-br-sm text-xs primary-button !select-text cursor-pointer"
        initial={skipAnimate ? false : { scale: 0.8, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ duration: 0.2, ease: "easeOut" }}
        onClick={handleCopy}
      >
        {children}
      </motion.div>
    </div>
  );
}

function SystemBubble({
  skipAnimate,
  children,
}: {
  skipAnimate: boolean;
  children?: React.ReactNode;
}) {
  const [isCopied, setIsCopied] = useState(false);
  const contentRef = useRef<HTMLDivElement>(null);

  const handleCopy = () => {
    if (didSelectText()) {
      return;
    }
    const text = contentRef.current?.textContent || "";
    if (text) {
      navigator.clipboard.writeText(text);
      setIsCopied(true);
    }
  };

  return (
    <div className="w-full justify-start flex group/message relative text-primary-foreground">
      <motion.div
        ref={contentRef}
        className="pr-2 pl-2.5 py-2 w-fit max-w-72 rounded-xl rounded-bl-sm text-white/90 text-xs secondary-button !select-text cursor-pointer relative"
        initial={skipAnimate ? false : { scale: 0.8, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ duration: 0.2, ease: "easeOut" }}
        onClick={handleCopy}
      >
        {children}
      </motion.div>
      <MessageCopyButton
        onClick={handleCopy}
        side="right"
        isCopied={isCopied}
        setIsCopied={setIsCopied}
      />
    </div>
  );
}

export function MessageCopyButton({
  onClick,
  side,
  isCopied,
  setIsCopied,
}: {
  onClick: () => void;
  side: "left" | "right" | "bottom";
  isCopied: boolean;
  setIsCopied: (value: boolean) => void;
}) {
  return (
    <CopyIconButton
      onCopy={onClick}
      className={twMerge(
        "group/button group-hover/message:opacity-100 delay-75 group-hover/message:translate-x-0 group-hover/message:translate-y-0 transition-all duration-200",
        side === "left" && "translate-x-1",
        side === "bottom" && "-translate-y-1",
        side === "right" && "-translate-x-1",
        "[&[data-copied=true]]:opacity-100 [&[data-copied=true]]:translate-x-0 [&[data-copied=true]]:translate-y-0",
      )}
      isCopied={isCopied}
      setIsCopied={setIsCopied}
    />
  );
}
