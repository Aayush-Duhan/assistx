import { updateState, useSharedState } from "@/shared/shared";
import { type OnboardingMode } from "@/shared/onboardingState";
import { motion, type Variants } from "motion/react";
import type React from "react";
import { useState } from "react";
import { twMerge } from "tailwind-merge";
import OnboardingButton from "../components/ob-button";
import {
  OnboardingDemo,
  OnboardingDescription,
  OnboardingForm,
  OnboardingPage,
} from "../components/onboarding-page";
// import technicalInterview from "#/renderer/assets/media/onboarding/technical-interview.png";
import { HeadlessButton } from "@/components/ui/HeadlessButton";

interface SurveyOption {
  id: string;
  label: string;
}

const EDUCATION_OPTIONS: SurveyOption[] = [
  { id: "high-school", label: "High School" },
  { id: "undergraduate", label: "Undergraduate" },
  { id: "graduate", label: "Graduate" },
  { id: "trade", label: "Trade" },
];

const INDUSTRY_OPTIONS: SurveyOption[] = [
  { id: "sales-gtm", label: "Sales / GTM" },
  { id: "recruiting", label: "Recruiting" },
  { id: "finance", label: "Finance" },
  { id: "consulting", label: "Consulting" },
  { id: "engineering", label: "Engineering" },
  { id: "marketing", label: "Marketing" },
  { id: "founder", label: "Founder" },
  { id: "management", label: "Management" },
  { id: "legal", label: "Legal" },
  { id: "data-analytics", label: "Data Analytics" },
  { id: "design", label: "Design" },
  { id: "product", label: "Product" },
  { id: "operations", label: "Operations" },
  { id: "hr", label: "HR" },
  { id: "video-editing", label: "Video Editing" },
];

const JOB_ROLE_OPTIONS: SurveyOption[] = [
  { id: "sales-gtm", label: "Sales / GTM" },
  { id: "recruiting", label: "Recruiting" },
  { id: "finance", label: "Finance" },
  { id: "consulting", label: "Consulting" },
  { id: "engineering", label: "Engineering" },
  { id: "marketing", label: "Marketing" },
  { id: "management", label: "Management" },
  { id: "legal", label: "Legal" },
  { id: "design", label: "Design" },
  { id: "product", label: "Product" },
  { id: "operations", label: "Operations" },
  { id: "hr", label: "HR" },
  { id: "video-editing", label: "Video Editing" },
];

const OPTIONS: Record<OnboardingMode, SurveyOption[]> = {
  "looking-for-a-job": JOB_ROLE_OPTIONS,
  student: EDUCATION_OPTIONS,
  professional: INDUSTRY_OPTIONS,
  curious: INDUSTRY_OPTIONS,
};

const QUESTION = {
  "looking-for-a-job": "What industry are you in?",
  student: "What level of education are you pursuing?",
  professional: "What do you do?",
  curious: "What industry are you in?",
};

export default function Survey() {
  const { onboardingState } = useSharedState();
  const { mode, surveyAnswer } = onboardingState.surveys;
  const [otherSurveyAnswer, setOtherSurveyAnswer] = useState<string>("");

  if (!mode) {
    return null;
  }

  const onSubmit = () => {
    const value = surveyAnswer === "other" ? otherSurveyAnswer : surveyAnswer;
    if (!value) {
      return;
    }

    updateState({
      onboardingState: {
        ...onboardingState,
        surveys: { ...onboardingState.surveys, submitted: true },
      },
    });
  };

  const updateSurveyAnswer = (answer: string | undefined) => {
    updateState({
      onboardingState: {
        ...onboardingState,
        surveys: { ...onboardingState.surveys, surveyAnswer: answer },
      },
    });
  };

  const isComplete =
    (surveyAnswer === "other" ? !!otherSurveyAnswer : !!surveyAnswer);

  return (
    <OnboardingPage>
      <OnboardingForm className="justify-center">
        <div className="flex flex-col gap-12 items-center w-full">
          <h1 className="text-4xl tracking-[-1.254px] ob3-secondary-header text-center font-medium">
            Tell us more
          </h1>
          <div className="flex flex-col gap-2 w-full">
            <div className="flex flex-col gap-1.5">
              <h2 className="text-lg font-medium">{QUESTION[mode]}</h2>
              <div className="flex flex-wrap">
                {OPTIONS[mode].map((option) => (
                  <Pill
                    key={option.id}
                    isSelected={surveyAnswer === option.id}
                    onClick={() => {
                      updateSurveyAnswer(option.id);
                    }}
                  >
                    {option.label}
                  </Pill>
                ))}
                <OtherInput
                  isSelected={surveyAnswer === "other"}
                  onChange={(value) => {
                    setOtherSurveyAnswer(value);
                    updateSurveyAnswer("other");
                  }}
                  select={() => {
                    updateSurveyAnswer("other");
                  }}
                  deselect={() => {
                    if (surveyAnswer === "other") {
                      updateSurveyAnswer(undefined);
                    }
                  }}
                />
              </div>
            </div>

            <hr className="border-black/10 my-4" />

            {/* <div className="flex flex-col gap-1.5">
              <h2 className="text-lg font-medium">How did you hear about Cluely?</h2>
              <div className="flex flex-wrap">
                {HEAR_ABOUT_OPTIONS.map((option) => (
                  <Pill
                    key={option.id}
                  >
                    {option.label}
                  </Pill>
                ))}
              </div>
            </div> */}
          </div>
          <OnboardingButton onClick={onSubmit} disabled={!isComplete}>
            Continue
          </OnboardingButton>
        </div>
      </OnboardingForm>
      <OnboardingDemo className="h-full justify-center relative">
        {/* <img
          src={technicalInterview}
          alt="Technical interview"
          className="w-[400px] shadow-2xl -translate-y-12 rounded-xl aspect-[0.82]"
        /> */}
        <OnboardingDescription>
          <Description />
        </OnboardingDescription>
      </OnboardingDemo>
    </OnboardingPage>
  );
}

const Pill = ({
  children,
  isSelected,
  onClick,
  variants,
  disabled,
}: {
  children: React.ReactNode;
  isSelected: boolean;
  onClick?: () => void;
  variants?: Variants;
  disabled?: boolean;
}) => {
  return (
    <HeadlessButton
      className={twMerge(
        "p-[3px] group/pill cursor-pointer",
        disabled && "cursor-default !pointer-events-none",
      )}
      disabled={disabled}
      onClick={onClick}
    >
      <motion.div
        variants={variants}
        className={twMerge(
          "flex px-3 py-1.5 items-center gap-1.5 rounded-full border transition-all duration-200 ease-out group-hover/pill:scale-[1.03] group-active/pill:scale-[0.97] text-sm",
          disabled && "cursor-default !pointer-events-none",
          isSelected
            ? "bg-[#535360] border-transparent text-white shadow-lg"
            : "border-[#D7D7DA] text-[#939293]",
        )}
      >
        {children}
      </motion.div>
    </HeadlessButton>
  );
};

const OtherInput = ({
  onChange,
  isSelected,
  select,
  deselect,
  variants,
}: {
  onChange: (value: string) => void;
  isSelected: boolean;
  select: () => void;
  deselect: () => void;
  variants?: Variants;
}) => {
  const [value, setValue] = useState<string>("");
  const [isFocused, setIsFocused] = useState<boolean>(false);

  return (
    <div className="p-[3px] cursor-pointer">
      <motion.div
        variants={variants}
        className={twMerge(
          "rounded-full border relative text-sm h-[34px] transition-all duration-200 ease-out",
          isFocused
            ? "bg-[#535360] border-transparent text-white shadow-lg"
            : isSelected
              ? "bg-[#535360] border-transparent text-white shadow-lg"
              : "border-[#D7D7DA] text-[#939293] hover:scale-[1.03] active:scale-[0.97]",
        )}
      >
        <div
          style={{
            pointerEvents: isFocused ? "auto" : "none",
            opacity: isFocused ? 1 : 0,
          }}
          className="absolute inset-0"
        >
          <input
            className="min-w-full px-3 py-1.5 rounded-full text-sm absolute inset-0 focus:outline-none"
            ref={(el) => {
              if (isFocused) {
                el?.focus();
              }
            }}
            onChange={(e) => setValue(e.target.value)}
            value={value}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                (e.target as HTMLElement).blur();
              }
            }}
            onBlur={(e) => {
              setIsFocused(false);
              const value = e.target.value;
              if (!value) {
                deselect();
              } else {
                onChange(value);
              }
            }}
            placeholder="Please specify"
            maxLength={25}
          />
        </div>
        <div
          style={{
            pointerEvents: isFocused ? "none" : "auto",
            opacity: isFocused ? 0 : 1,
          }}
        >
          <HeadlessButton
            onClick={() => {
              setIsFocused(true);
              if (value) {
                select();
              }
            }}
            style={{
              marginRight: value.endsWith(" ") ? "0.5em" : "0",
            }}
            className="flex h-full cursor-pointer before:cursor-pointer items-center px-3 py-1.5 before:absolute before:-inset-[3px]"
          >
            <span>{value || (isFocused ? "Please specify" : "Other")}</span>
          </HeadlessButton>
        </div>
      </motion.div>
    </div>
  );
};

const Description = () => {
  const {
    onboardingState: {
      surveys: { mode },
    },
  } = useSharedState();

  if (mode === "looking-for-a-job") {
    return (
      <h2 className="text-3xl font-medium text-center inline-block w-[400px] mx-auto">
        <span className="text-[#3B3B45]">People perform</span>{" "}
        <span className="ob3-primary-header font-semibold">25% better</span> <br />
        <span className="text-[#3B3B45]">on interviews with Cluely</span>
      </h2>
    );
  }

  if (mode === "student") {
    return (
      <h2 className="text-3xl font-medium text-center w-[400px] mx-auto">
        <span className="text-[#3B3B45]">Students who use Cluely save</span>{" "}
        <span className="ob3-primary-header font-semibold">10 hours</span>{" "}
        <span className="text-[#3B3B45]">a week</span>
      </h2>
    );
  }

  return (
    <h2 className="text-3xl font-medium text-center w-[500px] mx-auto">
      <span className="ob3-primary-header font-semibold">430,000+ users</span>{" "}
      <span className="text-[#3B3B45]">
        save up to <br /> 3+ hours a week with Cluely
      </span>
    </h2>
  );
};
