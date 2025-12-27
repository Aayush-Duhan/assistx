import { FaChevronRight } from "react-icons/fa6";
import { updateState, useSharedState } from "@/shared/shared";
import { type OnboardingMode } from "@/shared/onboardingState";
import { motion } from "motion/react";
import React from "react";
import { useDarkMode } from "usehooks-ts";
import {
    OnboardingDemo,
    OnboardingDescription,
    OnboardingForm,
    OnboardingPage,
} from "../components/onboarding-page";
import curious from "@/assets/icons/onboarding/curious.png";
import lookingForAJob from "@/assets/icons/onboarding/looking-for-a-job.png";
import professional from "@/assets/icons/onboarding/professional.png";
import student from "@/assets/icons/onboarding/student.png";
import peopleSearch from "@/assets/media/onboarding/people-search.png";
import { HeadlessButton } from "@/components/ui/HeadlessButton";

type ModeOption = {
    icon: string;
    title: string;
    description: string;
    key: OnboardingMode;
};

const MODES: ModeOption[] = [
    {
        icon: lookingForAJob,
        title: "Looking for a job",
        description: "Interviews, networking calls, career chats",
        key: "looking-for-a-job",
    },
    {
        icon: student,
        title: "Student",
        description: "Presentations, research help, office hours",
        key: "student",
    },
    {
        icon: professional,
        title: "Professional",
        description: "Client calls, sales pitches, stakeholder meetings",
        key: "professional",
    },
    {
        icon: curious,
        title: "Curious",
        description: "Explore how AssistX fits in with your workflow",
        key: "curious",
    },
];

export default function Mode() {
    const { onboardingState } = useSharedState();
    const { surveys } = onboardingState;
    const { isDarkMode } = useDarkMode();

    return (
        <OnboardingPage className={isDarkMode ? "bg-[#0f0f0f]" : "bg-[#EDEEF2]"}>
            <OnboardingForm className={`justify-center ${isDarkMode ? "bg-[#0f0f0f]" : ""}`}>
                <div className="flex flex-col gap-12 items-center w-full">
                    <h1 className={`text-4xl tracking-[-1.254px] text-center font-medium ${isDarkMode ? "text-[#F0F0F0]" : "ob3-secondary-header"}`}>
                        Which one fits you best?
                    </h1>
                    <div className="flex flex-col gap-1.5 w-full">
                        {MODES.map((mode, index) => (
                            <React.Fragment key={mode.key}>
                                <ModeItem
                                    icon={mode.icon}
                                    title={mode.title}
                                    description={mode.description}
                                    isDarkMode={isDarkMode}
                                    onSelect={() => {
                                        updateState({
                                            onboardingState: {
                                                ...onboardingState,
                                                surveys: { ...surveys, mode: mode.key },
                                            },
                                        });
                                    }}
                                />
                                {index < MODES.length - 1 && (
                                    <div className={`h-px ml-13 mr-3 ${isDarkMode ? "bg-white/10" : "bg-black/10"}`} />
                                )}
                            </React.Fragment>
                        ))}
                    </div>
                </div>
            </OnboardingForm>
            <OnboardingDemo className="h-full justify-center" isDarkMode={isDarkMode}>
                <motion.img
                    src={peopleSearch}
                    alt="People search notification"
                    className="w-[400px] aspect-[1.44]"
                    initial={{ opacity: 0, x: 400 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, transition: { duration: 0.2, ease: "easeOut" } }}
                    transition={{
                        type: "spring",
                        stiffness: 400,
                        damping: 33,
                        delay: 0.4,
                    }}
                />
                <OnboardingDescription>
                    <h2 className="-translate-y-12">
                        <span className={`text-2xl mb-4 w-[400px] inline-block ${isDarkMode ? "text-[#A0A0A0]" : "ob3-secondary-header"}`}>
                            80% of people don't research who they're meeting with.
                        </span>
                        <br />
                        <span className="ob3-primary-header">With AssistX, you'll never have to.</span>
                    </h2>
                </OnboardingDescription>
            </OnboardingDemo>
        </OnboardingPage>
    );
}

export function ModeItem({
    icon,
    title,
    description,
    isDarkMode,
    onSelect,
}: {
    icon: string;
    title: string;
    description: string;
    isDarkMode: boolean;
    onSelect: () => void;
}) {
    return (
        <HeadlessButton
            onClick={onSelect}
            className={`flex items-center justify-between group relative transition-colors duration-75 rounded-xl p-2 cursor-pointer ${isDarkMode ? "hover:bg-[#2a2a2a]" : "hover:bg-[#F6F6F6]"
                }`}
        >
            <div className="flex items-center gap-4">
                <img
                    src={icon}
                    alt={title}
                    className="size-8 shrink-0 group-hover:scale-125 group-hover:-rotate-6 transition-transform duration-200"
                />
                <div className="flex flex-col text-left gap-1">
                    <h3 className={isDarkMode ? "text-[#F0F0F0]" : "text-ob3-foreground"}>{title}</h3>
                    <p className={`text-sm ${isDarkMode ? "text-[#888888]" : "text-[#A3A3A5]"}`}>{description}</p>
                </div>
            </div>
            <FaChevronRight className={`size-4 ${isDarkMode ? "text-[#666666]" : "text-[#BABABB]"}`} />
        </HeadlessButton>
    );
}
