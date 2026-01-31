import { FaChevronRight } from "react-icons/fa6";
import { LuUserSearch } from "react-icons/lu";
import { PiPaperPlaneTiltFill } from "react-icons/pi";
import { updateState, useSharedState } from "@/shared/shared";
import { animate } from "motion";
import { motion } from "motion/react";
import {
  type ButtonHTMLAttributes,
  forwardRef,
  type SVGProps,
  useEffect,
  useRef,
  useState,
} from "react";
import { twMerge } from "tailwind-merge";
import { useDarkMode } from "usehooks-ts";
import {
  AssistantMessage,
  ChatInput,
  CommandBar,
  Overlay,
  StaticAction,
  StaticActions,
  UserMessage,
} from "../components/desktop-ui";
import HintHighlight from "../components/hint-highlight";
import { Send } from "../components/icons";
// import Meeting from "../components/meeting";
import OnboardingButton from "../components/ob-button";
import { OnboardingDemo, OnboardingForm, OnboardingPage } from "../components/onboarding-page";

type Message = {
  id: string;
  userMessage: string;
  assistantMessage?: string;
};

const assistantMessages = [
  "\"So just to recap—you need new cabinets and lighting. I'll get a quote over to you within the hour, and let's do a kickoff call next Wednesday if that works for you?\"",
  "Actually, can we make it Tuesday instead? Just checking!",
  "Sorry, one sec, my cat's on my keyboard.",
  "Can we pause? My son just brought me a drawing he made and wants me to hang it up right now",
  "Let's put a pin in that, touch base offline, and run it up the flagpole so we can double down on our strategy",
  "We're going to pivot, boil the ocean, stay aligned on the same page, and leverage our bandwidth to move the needle and take things to the next level",
  "Can you guys see my screen?",
  "Hold on, I think you're having network issues.",
];

export default function CmdEnter() {
  const { onboardingState } = useSharedState();
  const conversationRef = useRef<HTMLDivElement>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("What should I say next?");
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const { isDarkMode } = useDarkMode();

  const handleSend = () => {
    const newMessageId = crypto.randomUUID();
    const newMessage: Message = {
      id: newMessageId,
      userMessage: input || "Assist",
    };

    setMessages([...messages, newMessage]);
    const currentScrollTop = conversationRef.current?.scrollTop ?? 0;

    animate(currentScrollTop, currentScrollTop + 244, {
      ease: "circInOut",
      duration: 0.3,
      onUpdate: (value) => {
        if (conversationRef.current) {
          conversationRef.current.scrollTop = value;
        }
      },
      onComplete: () => {
        const buffer = document.getElementById("buffer");
        if (buffer) {
          buffer.style.height = "0px";
        }
        const lastMessage = messages[messages.length - 1];
        if (lastMessage) {
          const lastMessageElement = document.getElementById(`message-${lastMessage.id}`);
          if (lastMessageElement) {
            lastMessageElement.style.minHeight = "0px";
          }
        }
      },
    }).then(() => {
      const numAssistantMessages = messages.filter((message) => message.assistantMessage).length;

      const assistantMessage =
        numAssistantMessages === 0
          ? assistantMessages[0]
          : assistantMessages[Math.floor(Math.random() * (assistantMessages.length - 1)) + 1];

      if (!assistantMessage) return;

      const appendToAssistantMessage = (content: string) => {
        setMessages((currentMessages) =>
          currentMessages.map((msg) =>
            msg.id === newMessageId
              ? {
                  ...msg,
                  assistantMessage: `${
                    msg.assistantMessage ? `${msg.assistantMessage} ` : ""
                  }${content}`,
                }
              : msg,
          ),
        );
      };

      const messageParts = assistantMessage.split(" ");
      let currentIndex = 0;

      if (intervalRef.current) clearInterval(intervalRef.current);

      intervalRef.current = setInterval(() => {
        if (currentIndex < messageParts.length) {
          const nextPart = messageParts
            .slice(currentIndex, currentIndex + Math.min(3, messageParts.length - currentIndex))
            .join(" ");

          appendToAssistantMessage(nextPart);
          currentIndex += 3;
        } else {
          if (intervalRef.current) clearInterval(intervalRef.current);
        }
      }, 100);
    });

    setInput("");
  };

  useEffect(() => {
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, []);

  const didSendMessage = messages.length > 0;

  return (
    <OnboardingPage className={isDarkMode ? "bg-[#0f0f0f]" : "bg-[#EDEEF2]"}>
      <OnboardingForm className={`justify-between ${isDarkMode ? "bg-[#0f0f0f]" : ""}`}>
        <div />
        <div className="flex flex-col gap-20 items-center text-center">
          <div className="flex flex-col gap-4">
            <h2
              className={`font-semibold text-sm ${isDarkMode ? "text-white/40" : "text-black/40"}`}
            >
              Try AssistX
            </h2>
            <h1
              className={`text-4xl tracking-[-1.254px] font-medium ${isDarkMode ? "text-[#F0F0F0]" : "text-[#1a1a1a]"}`}
            >
              Ask AssistX a question about the meeting
            </h1>
            <p className={`leading-6 ${isDarkMode ? "text-[#A0A0A0]" : "text-[#6B6B6D]"}`}>
              AssistX listens to your meetings and <br /> transcribes everything in real-time.
            </p>
          </div>
          <div className="flex flex-col w-full items-center gap-2">
            <OnboardingButton
              disabled={!didSendMessage}
              onClick={() =>
                updateState({
                  onboardingState: {
                    ...onboardingState,
                    learn: { ...onboardingState.learn, didCompleteSend: true },
                  },
                })
              }
            >
              {!didSendMessage ? (
                <>
                  Click
                  <SendButton className="inline-flex opacity-80" />
                  to continue
                </>
              ) : (
                <>
                  Continue <FaChevronRight className="size-3" />
                </>
              )}
            </OnboardingButton>
          </div>
        </div>
        <OnboardingButton
          size="fit"
          variant="ghost"
          className="opacity-60"
          onClick={() => {
            updateState({
              onboardingState: {
                ...onboardingState,
                learn: { ...onboardingState.learn, didCompleteSend: true },
              },
            });
          }}
        >
          Skip
          <FaChevronRight className="size-3" />
        </OnboardingButton>
      </OnboardingForm>
      <OnboardingDemo className="px-4 overflow-hidden relative">
        {didSendMessage && (
          <motion.div
            className="absolute -bottom-[28rem] flex justify-center items-center w-full"
            initial={{ y: 0, scaleY: 1 }}
            animate={{ y: "-80rem", scaleY: 1.6 }}
            transition={{
              duration: 0.3,
              ease: "easeIn",
            }}
          >
            <GradientShimmer className="scale-200 opacity-60" />
          </motion.div>
        )}
        <div className="relative w-full h-fit pt-12">
          {/* <Meeting /> */}
          <div className="absolute -top-12 flex flex-col items-center gap-2 -translate-x-1/2 left-1/2">
            <CommandBar />
            <Overlay className="p-0">
              <div
                ref={conversationRef}
                className="flex flex-col h-[236px] overflow-y-auto no-scrollbar p-4 pb-0 rounded-t-3xl"
              >
                <div className="flex flex-col h-fit">
                  <div id="buffer" className="h-[228px] shrink-0" />
                  {messages.map((message) => (
                    <Message key={message.id} message={message} />
                  ))}
                </div>
              </div>
              <div className="flex flex-col h-fit gap-2 p-4 pt-0">
                <StaticActions className="opacity-40">
                  <StaticAction>
                    <PiPaperPlaneTiltFill className="!size-3" />
                    Send recap email
                  </StaticAction>
                  <StaticAction>
                    <LuUserSearch className="!size-3" />
                    Research meeting participants
                  </StaticAction>
                </StaticActions>
                <ChatInput
                  id="ob3-submit"
                  autoFocus
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      handleSend();
                    }
                  }}
                  disabled={!didSendMessage}
                  className="[&>input]:disabled:cursor-not-allowed"
                >
                  <div className="relative size-6">
                    {input && <HintHighlight />}
                    <SendButton
                      className="inline-flex relative"
                      onClick={() => {
                        handleSend();
                        const inputElement = document.getElementById("ob3-submit");
                        if (inputElement) {
                          inputElement.focus();
                        }
                      }}
                    />
                  </div>
                </ChatInput>
              </div>
            </Overlay>
          </div>
        </div>
      </OnboardingDemo>
    </OnboardingPage>
  );
}

const SendButton = ({ className, ...props }: ButtonHTMLAttributes<HTMLButtonElement>) => {
  return (
    <button
      className={twMerge(
        "size-6 p-0.5 rounded-full flex justify-center items-center cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed",
        className,
      )}
      style={{
        background: "linear-gradient(180deg, #e8913f 0%, #b35f18 100%)",
        boxShadow:
          "0 0 0 0.543px #b35f18, 0 143.48px 40.218px 0 rgba(0, 0, 0, 0.00), 0 92.393px 36.957px 0 rgba(0, 0, 0, 0.02), 0 52.175px 31.522px 0 rgba(0, 0, 0, 0.08), 0 22.826px 22.826px 0 rgba(0, 0, 0, 0.13), 0 5.435px 13.044px 0 rgba(0, 0, 0, 0.16), 0 -1.087px 0 0 #8a430c inset, 0 0.543px 0 0 #ffb366 inset",
      }}
      {...props}
    >
      <Send className="size-full" />
    </button>
  );
};

const Message = ({ message }: { message: Message }) => {
  return (
    <div
      id={`message-${message.id}`}
      className="mb-4 flex flex-col gap-4"
      style={{ minHeight: 204 }}
    >
      <UserMessage variant={message.userMessage === "Assist" ? "accent" : "default"}>
        <p>{message.userMessage}</p>
      </UserMessage>
      {message.assistantMessage && <AssistantMessage>{message.assistantMessage}</AssistantMessage>}
    </div>
  );
};

export const GradientShimmer = forwardRef<SVGSVGElement, SVGProps<SVGSVGElement>>((props, ref) => {
  return (
    <svg
      ref={ref}
      width="1417"
      height="584"
      viewBox="0 0 1417 584"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      {...props}
    >
      <g opacity="0.56" filter="url(#filter0_f_82_3261)">
        <path
          fillRule="evenodd"
          clipRule="evenodd"
          d="M422.627 265.307C515.538 159.938 601.928 61.9643 690.363 59.0713C789.477 55.8289 890.808 163.683 996.729 276.423C1110.84 397.877 1230.27 525 1358 525H1179C1086.47 525 999.954 478.625 917.294 434.317C840.565 393.189 767.16 353.843 695.361 355.026C631.299 356.081 568.718 391.823 501.412 430.262C423.226 474.916 338.664 523.211 238 525H59C197.961 520.095 314.694 387.711 422.627 265.307Z"
          fill="url(#paint0_linear_82_3261)"
        />
        <path
          fillRule="evenodd"
          clipRule="evenodd"
          d="M422.627 265.307C515.538 159.938 601.928 61.9643 690.363 59.0713C789.477 55.8289 890.808 163.683 996.729 276.423C1110.84 397.877 1230.27 525 1358 525H1179C1086.47 525 999.954 478.625 917.294 434.317C840.565 393.189 767.16 353.843 695.361 355.026C631.299 356.081 568.718 391.823 501.412 430.262C423.226 474.916 338.664 523.211 238 525H59C197.961 520.095 314.694 387.711 422.627 265.307Z"
          fill="url(#paint1_radial_82_3261)"
        />
      </g>
      <defs>
        <filter
          id="filter0_f_82_3261"
          x="0.0999985"
          y="0.0999985"
          width="1416.8"
          height="583.8"
          filterUnits="userSpaceOnUse"
          colorInterpolationFilters="sRGB"
        >
          <feFlood floodOpacity="0" result="BackgroundImageFix" />
          <feBlend mode="normal" in="SourceGraphic" in2="BackgroundImageFix" result="shape" />
          <feGaussianBlur stdDeviation="29.45" result="effect1_foregroundBlur_82_3261" />
        </filter>
        <linearGradient
          id="paint0_linear_82_3261"
          x1="700.54"
          y1="59"
          x2="700.54"
          y2="525.141"
          gradientUnits="userSpaceOnUse"
        >
          <stop stopColor="#e8913f" />
          <stop offset="0.322115" stopColor="#ffb366" />
          <stop offset="1" stopColor="#ffd9b3" stopOpacity="0.4" />
        </linearGradient>
        <radialGradient
          id="paint1_radial_82_3261"
          cx="0"
          cy="0"
          r="1"
          gradientUnits="userSpaceOnUse"
          gradientTransform="translate(709 432) rotate(-90) scale(412.5 1149.87)"
        >
          <stop stopColor="#ffb366" stopOpacity="0" />
          <stop offset="1" stopColor="#b35f18" />
        </radialGradient>
      </defs>
    </svg>
  );
});
