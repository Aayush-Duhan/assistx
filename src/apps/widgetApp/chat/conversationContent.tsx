import { IoImage } from "react-icons/io5";
import { TbBubble } from "react-icons/tb";
import { useSharedState } from "@/shared";
import { Popover } from "@base-ui-components/react/popover";
import type { ModelMessage } from "ai";
import { animate } from "motion";
import { AnimatePresence, motion, useMotionValue } from "motion/react";
import { type ReactNode, useEffect, useLayoutEffect, useRef, useState } from "react";
import { PulseLoader } from "react-spinners";
import { twMerge } from "tailwind-merge";
import { AiResponseMarkdown } from "./aiResponseMarkdown";
import { CHAT_INPUT_CONTAINER_ID } from "./chatContent";
import { ScrollingContainer } from "../components/scrollingContainer";
import { useKeybindings } from "@/hooks/useKeybindings";
import { MessageCopyButton } from "../insights/transcriptContent";
import { useShowConversation } from "../hooks/useShowConversation";
import { useAiResponse } from "../hooks/useAiResponse";
import type { ConversationResponse, PendingResponse } from "@/services/AiResponseService";

const CONVERSATION_SCROLL_ANIMATION_DURATION = 0.3;
const CONVERSATION_PADDING_BOTTOM = 16; // px

export function ConversationContent() {
  const readyToShowConversation = useReadyToShowConversation();

  const { conversation, triggerAiState } = useAiResponse();

  const keybindings = useKeybindings();

  const scrollDownAccelerator = keybindings.scroll_response_down;
  const scrollUpAccelerator = keybindings.scroll_response_up;

  const [isFirstRender, setIsFirstRender] = useState(true);

  useEffect(() => {
    setIsFirstRender(false);
  }, []);

  const scrollRef = useRef<HTMLDivElement>(null);

  useLayoutEffect(() => {
    if (readyToShowConversation) {
      scrollRef.current?.scrollTo({
        top: scrollRef.current.scrollHeight - scrollRef.current.clientHeight,
      });
    }
  }, [readyToShowConversation]);

  const allResponses: UnifiedResponse[] = conversation.responses.map((response) => ({
    type: "done",
    response,
  }));

  if (conversation.pendingResponse) {
    allResponses.push({ type: "pending", response: conversation.pendingResponse });
  }

  return (
    <div className="relative h-full">
      <ScrollingContainer
        scrollDownAccelerator={scrollDownAccelerator}
        scrollUpAccelerator={scrollUpAccelerator}
        ref={scrollRef}
        className="[overflow-anchor:none]"
      >
        <div
          className={twMerge(
            "flex flex-col gap-2 transition-opacity duration-150",
            !readyToShowConversation && "opacity-0",
          )}
          style={{ paddingBottom: CONVERSATION_PADDING_BOTTOM }}
        >
          {allResponses.map((response, i) => (
            <MessageGroup
              key={
                response.type === "done"
                  ? response.response.id
                  : response.response.state === "streaming"
                    ? response.response.id
                    : `pending-${i}`
              }
              response={response}
              isLatestResponse={i === allResponses.length - 1 && readyToShowConversation}
              isFirstRender={isFirstRender}
              scrollRef={scrollRef}
            />
          ))}
          {readyToShowConversation && triggerAiState && (
            <OptimisticMessageGroup
              userText={triggerAiState.displayInput}
              screenshot={triggerAiState.screenshot}
              hasScreenshot={triggerAiState.hasScreenshot}
              scrollRef={scrollRef}
              assistedWith={triggerAiState.assistedWith}
            />
          )}
        </div>
      </ScrollingContainer>
    </div>
  );
}

function OptimisticMessageGroup({
  userText,
  screenshot,
  hasScreenshot,
  scrollRef,
  assistedWith,
}: {
  userText: string | null;
  screenshot: string | null;
  hasScreenshot: boolean;
  scrollRef: React.RefObject<HTMLDivElement | null>;
  assistedWith: string | null;
}) {
  const [minHeight] = useState(getVisibleHeight(scrollRef));

  useEffect(() => {
    if (scrollRef.current) {
      const currentScrollTop = scrollRef.current.scrollTop;
      const desiredScrollTop = scrollRef.current.scrollHeight - scrollRef.current.clientHeight;

      animate(currentScrollTop, desiredScrollTop, {
        duration: CONVERSATION_SCROLL_ANIMATION_DURATION,
        onUpdate: (value) => {
          if (scrollRef.current) {
            scrollRef.current.scrollTop = value;
          }
        },
        ease: "circInOut",
      });
    }
  }, [scrollRef]);

  return (
    <div
      data-message-block
      className="flex flex-col gap-2"
      style={{ minHeight: `min(calc(var(--height) - 24px), ${minHeight}px)` }}
    >
      <UserMessage
        text={userText}
        screenshot={screenshot}
        hasScreenshot={hasScreenshot}
        assistedWith={assistedWith}
      />
      <PulseLoader size={6} color="white" className="opacity-90" />
    </div>
  );
}

type UnifiedResponse =
  | { type: "done"; response: ConversationResponse }
  | { type: "pending"; response: PendingResponse };

function MessageGroup({
  response,
  isLatestResponse,
  isFirstRender,
  scrollRef,
}: {
  response: UnifiedResponse;
  isLatestResponse: boolean;
  isFirstRender: boolean;
  scrollRef: React.RefObject<HTMLDivElement | null>;
}) {
  const [minHeight, setMinHeight] = useState(
    isFirstRender ? undefined : getVisibleHeight(scrollRef),
  );

  // clean up height when no longer the latest response, but wait for
  // scroll animation to finish
  useEffect(() => {
    let timeout: NodeJS.Timeout;
    if (isLatestResponse) {
      const chatInput = document.getElementById(CHAT_INPUT_CONTAINER_ID);
      if (!scrollRef.current || !chatInput) {
        console.error("Couldn't find chat input container or scroll container");
        return;
      }
      const currentScrollTop = scrollRef.current.scrollTop;
      const desiredScrollTop = scrollRef.current.scrollHeight - scrollRef.current.clientHeight;

      if (Math.abs(currentScrollTop - desiredScrollTop) / scrollRef.current.clientHeight < 0.15) {
        return;
      }

      animate(currentScrollTop, desiredScrollTop, {
        duration: CONVERSATION_SCROLL_ANIMATION_DURATION,
        onUpdate: (value) => {
          if (!scrollRef.current) return;
          scrollRef.current.scrollTop = value;
        },
        ease: "circInOut",
      });
    } else {
      timeout = setTimeout(() => {
        setMinHeight(undefined);
      }, CONVERSATION_SCROLL_ANIMATION_DURATION * 1000);
    }
    return () => {
      clearTimeout(timeout);
    };
  }, [isLatestResponse, scrollRef]);

  const getImage = () => {
    if (response.type === "done") {
      const messages = response.response.input.messages;
      const latestMessage = messages[messages.length - 1];
      if (latestMessage) {
        return extractAttachmentUrl(latestMessage);
      }
    } else if (response.type === "pending" && response.response.state === "streaming") {
      if (response.response.hasScreenshot) {
        return response.response.screenshot;
      }
    }
    return null;
  };

  const image = getImage();

  const getAssistedWith = (): string | null => {
    if (response.type === "done") {
      return response.response.input.assistedWith;
    }
    if (response.type === "pending" && response.response.state === "streaming") {
      return response.response.assistedWith;
    }
    return null;
  };

  return (
    <div
      data-message-block
      className="flex flex-col gap-2"
      style={{ minHeight: `min(calc(var(--height) - 24px), ${minHeight}px)` }}
    >
      <UserMessage
        text={
          response.type === "done"
            ? response.response.input.displayInput
            : response.response.displayInput
        }
        screenshot={image}
        hasScreenshot={!!image}
        assistedWith={getAssistedWith()}
      />
      <AssistantMessage response={response} animate={!isFirstRender} />
    </div>
  );
}

function UserMessage({
  text,
  screenshot,
  hasScreenshot,
  assistedWith,
}: {
  text: string | null;
  screenshot: string | null;
  hasScreenshot: boolean;
  assistedWith: string | null;
}) {
  const isAssist = !text || text === "Assist";
  const [isCopied, setIsCopied] = useState(false);

  const handleCopy = () => {
    if (didSelectText()) {
      return;
    }
    navigator.clipboard.writeText(text ?? "");
    setIsCopied(true);
  };

  return (
    <div className="flex flex-col gap-1 justify-end items-end">
      <div className="w-full justify-end flex group/message relative text-primary-foreground">
        <MessageCopyButton
          onClick={handleCopy}
          side="left"
          isCopied={isCopied}
          setIsCopied={setIsCopied}
        />
        <div
          className={twMerge(
            "px-2.5 py-1.5 w-fit max-w-72 rounded-xl rounded-br-sm text-xs select-text! cursor-pointer",
            isAssist ? "accent-button text-white/80" : "primary-button",
          )}
          onClick={handleCopy}
        >
          {isAssist ? "Assist" : text}
        </div>
      </div>
      {hasScreenshot ? (
        <ScreenshotTool url={screenshot} />
      ) : assistedWith ? (
        <div className="text-xs text-white/60 flex items-center">
          <span>Assisting with "</span>
          <span className="inline-block min-w-0 max-w-[240px] truncate">{assistedWith}</span>
          <span>"</span>
        </div>
      ) : null}
    </div>
  );
}

const ScreenshotTool = ({ url }: { url: string | null }) => {
  const { windowHidden } = useSharedState();
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    if (windowHidden) {
      setIsOpen(false);
    }
  }, [windowHidden]);

  return (
    <Popover.Root open={isOpen} onOpenChange={(open) => setIsOpen(open)}>
      <Popover.Trigger openOnHover={!windowHidden} delay={0}>
        <div className="flex pr-2 items-center gap-1 text-[11px] font-medium text-white/40 text-shadow-[0_0_1px_2px_rgba(0,0,0,0.1)]">
          Sent with screenshot
          <IoImage className="size-3.5 drop-shadow-[0_0_1px_2px_rgba(0,0,0,0.1)]" />
        </div>
      </Popover.Trigger>
      <AnimatePresence>
        {isOpen && !!url && (
          <Popover.Portal keepMounted>
            <Popover.Positioner>
              <Popover.Popup
                render={
                  <motion.div
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.95 }}
                    transition={{ type: "spring", stiffness: 600, damping: 36 }}
                    className="origin-top bg-white/20 rounded-lg p-1 w-64"
                    style={{
                      boxShadow:
                        "0 137px 38px 0 rgba(0, 0, 0, 0.00), 0 88px 35px 0 rgba(0, 0, 0, 0.02), 0 49px 30px 0 rgba(0, 0, 0, 0.07), 0 22px 22px 0 rgba(0, 0, 0, 0.12), 0 5px 12px 0 rgba(0, 0, 0, 0.14)",
                    }}
                  />
                }
              >
                <img src={url} alt="Screenshot" className="rounded-[4px]" />
              </Popover.Popup>
            </Popover.Positioner>
          </Popover.Portal>
        )}
      </AnimatePresence>
    </Popover.Root>
  );
};

function AssistantMessage({ response, animate }: { response: UnifiedResponse; animate: boolean }) {
  const [isCopied, setIsCopied] = useState(false);

  let content: ReactNode;

  if (response.type === "pending" && response.response.state === "error") {
    content =
      response.response.reason === "network" ? (
        <AiResponseMarkdown>
          Connection failed. If the problem persists, please check your internet connection or VPN.
        </AiResponseMarkdown>
      ) : (
        <AiResponseMarkdown>
          Response generation failed. Please try again momentarily. If the problem persists, please
          contact support.
        </AiResponseMarkdown>
      );
  } else if (
    response.type === "pending" &&
    response.response.state === "streaming" &&
    !response.response.text
  ) {
    content = <AssistantReasoningMessage response={response} />;
  } else {
    let text: string;
    if (response.type === "done") {
      text = response.response.text;
    } else {
      if (response.response.state !== "streaming") {
        throw Error("this can't happen");
      }
      text = response.response.text;
    }

    content = (
      <div className="flex flex-col group/message">
        <AiResponseMarkdown className="select-text!">{text}</AiResponseMarkdown>
        {text && (
          <MessageCopyButton
            side="bottom"
            onClick={() => {
              navigator.clipboard.writeText(text);
            }}
            isCopied={isCopied}
            setIsCopied={setIsCopied}
          />
        )}
      </div>
    );
  }

  return (
    <motion.div
      className="max-w-[90%]"
      initial={animate ? { y: 12, opacity: 0 } : undefined}
      animate={{ y: 0, opacity: 1 }}
      transition={{ duration: 0.3, ease: "easeOut", delay: 0.3 }}
    >
      {content}
    </motion.div>
  );
}

function AssistantReasoningMessage({ response }: { response: UnifiedResponse }) {
  if (response.type !== "pending" || response.response.state !== "streaming") {
    return null;
  }

  // concatenate all reasoning steps into one body
  const combinedText = response.response.reasoningSteps
    .map((step) => step.text.replace(/\*\*/g, "")) // remove expected markdown formatting
    .filter((text) => !!text)
    .join(" ");

  if (combinedText.length === 0) {
    return <PulseLoader size={6} color="white" className="opacity-90" />;
  }

  return (
    <div>
      <div className="text-sm text-white/60 flex items-center gap-1">
        <TbBubble className="size-3" />
        Thinking about your question
      </div>
      <div
        className="w-72 overflow-hidden"
        style={{
          maskImage:
            "linear-gradient(to right, transparent, black 20px, black calc(100% - 20px), transparent)",
        }}
      >
        <MarqueeText>{combinedText}</MarqueeText>
      </div>
    </div>
  );
}

function MarqueeText({ children }: { children: string }) {
  const paragraphRef = useRef<HTMLParagraphElement>(null);
  const translateX = useMotionValue(0);

  // biome-ignore lint/correctness/useExhaustiveDependencies: we want to continue animation when children change
  useEffect(() => {
    let timeoutId: NodeJS.Timeout;

    const scheduleNext = () => {
      const randomDelay = Math.random() * (100 - 10) + 10;

      timeoutId = setTimeout(() => {
        if (!paragraphRef.current) {
          scheduleNext();
          return;
        }

        const scrollWidth = paragraphRef.current.scrollWidth;
        const clientWidth = paragraphRef.current.clientWidth;
        const maxScroll = -(scrollWidth - clientWidth);
        const currentX = translateX.get();

        if (scrollWidth > clientWidth && currentX > maxScroll) {
          const randomStep = Math.random() * 50 + 30;
          const newX = Math.max(maxScroll, currentX - randomStep);

          translateX.stop();
          animate(translateX, newX, {
            type: "spring",
            stiffness: 300,
            damping: 30,
          });
        }

        scheduleNext();
      }, randomDelay);
    };

    scheduleNext();

    return () => {
      clearTimeout(timeoutId);
    };
  }, [children]);

  return (
    <motion.p
      ref={paragraphRef}
      className="text-xs text-white/30 whitespace-nowrap"
      style={{ x: translateX }}
    >
      {children}
    </motion.p>
  );
}

// when conversation is expanded, let it render first in an opacity-0
// state for one frame such that the <OptimisticMessageGroup> can measure
// the visible height correctly
function useReadyToShowConversation() {
  const showConversation = useShowConversation();
  const [readyToShow, setReadyToShow] = useState(showConversation);

  useEffect(() => {
    if (showConversation) {
      const timeout = setTimeout(() => {
        setReadyToShow(true);
      }, 30);
      return () => clearTimeout(timeout);
    } else {
      setReadyToShow(false);
    }
  }, [showConversation]);

  return readyToShow;
}

function getVisibleHeight(scrollRef: React.RefObject<HTMLDivElement | null>) {
  if (!scrollRef.current) return undefined;

  return scrollRef.current.clientHeight - CONVERSATION_PADDING_BOTTOM - 2; // extra to avoid glitches
}

export function didSelectText() {
  const selection = window.getSelection();
  return selection && selection.type === "Range";
}

function extractAttachmentUrl(message: ModelMessage): string | null {
  if (message.role !== "user" || !Array.isArray(message.content)) {
    return null;
  }

  for (const part of message.content) {
    if (part.type === "file" && typeof part.data === "string") {
      return part.data;
    }
    if (part.type === "image" && typeof part.image === "string") {
      return part.image;
    }
  }

  return null;
}
