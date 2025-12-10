import { motion } from "framer-motion";
import { X } from "lucide-react";
import { twMerge } from "tailwind-merge";
import { Cluely } from "@/assets/icons";
import { CaptureMouseEventsWrapper } from "./captureMouseEventsWrapper";
import { kit } from "@/components/kit";
import { NotificationWindow } from "./kit/window";

type Action = {
    label: string;
    variant: "primary" | "secondary" | "destructive";
    onClick: () => void;
};

export function ActionableNotification({
    title,
    message,
    show = true,
    actions = [],
    onDismiss,
    type = "secondary",
}: {
    title: string;
    message: React.ReactNode;
    show?: boolean;
    actions?: Action[] | Action;
    onDismiss?: () => void;
    type?: "primary" | "secondary";
}) {
    const actionsArray = Array.isArray(actions) ? actions : [actions];

    return (
        <NotificationWindow
            show={show}
            onDismiss={onDismiss}
            captureMouseEvents
            captureMouseEventsEvenWhenHidden
            opaque
            contentClassName="relative overflow-hidden"
            positionClassName="group"
        >
            {type === "primary" && (
                <motion.div
                    className="absolute inset-0 pointer-events-none"
                    initial={{
                        top: -32,
                        right: -32,
                    }}
                    animate={{
                        top: 0,
                        right: 0,
                    }}
                    transition={{
                        duration: 6,
                        ease: "circOut",
                    }}
                    style={{
                        background:
                            "radial-gradient(120% 185% at 21% 98%, #17181C 64%, #0029A2 67%, #00CCFC 76%, #ECF9FC 80%)",
                        maxHeight: "260px",
                    }}
                />
            )}
            <CaptureMouseEventsWrapper enabledEvenWhenHidden>
                <div className="flex flex-col gap-4 w-full z-10 relative">
                    <div className="flex justify-between items-center w-full gap-4">
                        <div className="flex flex-col gap-1 w-full">
                            <div className="w-full justify-between flex items-center text-[#7c7e86]">
                                <span className="font-semibold text-xs">{title}</span>
                                <div className="flex items-center gap-1.5 font-medium text-xs">
                                    {onDismiss && type !== "primary" && (
                                        <X onClick={onDismiss} className="size-4 cursor-pointer" />
                                    )}
                                </div>
                            </div>
                            <div
                                className={twMerge("text-[15px] tracking-[-0.1px]")}
                                style={{
                                    textShadow: type === "primary" ? "0 0 8px rgba(237, 238, 242, 0.50)" : undefined,
                                    color: type === "primary" ? "#EDEEF2" : "#c5c7ce",
                                }}
                            >
                                {message}
                            </div>
                        </div>
                        {type === "primary" && (
                            <Cluely
                                className="size-10 shrink-0"
                                fill="white"
                                style={{
                                    filter: "drop-shadow(0 0 10px rgba(255, 255, 255, 1))",
                                }}
                            />
                        )}
                    </div>
                    <div className="flex w-full gap-2.5 h-10">
                        {actionsArray.map((action) => (
                            <ActionButton key={action.label} action={action} />
                        ))}
                    </div>
                </div>
            </CaptureMouseEventsWrapper>
        </NotificationWindow>
    );
}

const ActionButton = ({ action }: { action: Action }) => {
    return (
        <kit.Button
            onClick={action.onClick}
            className={twMerge(
                "h-full w-full rounded-full text-sm tracking-[-0.24px] font-medium transition-all duration-200 transform",
                action.variant === "primary"
                    ? "bg-[#072452] border border-[#196ACC] text-white hover:bg-[#0F2B57]"
                    : action.variant === "secondary"
                        ? "bg-[#212227] border border-[#373944] text-[#AFB3C4] hover:bg-[#28292D]"
                        : "bg-[#2E0E0D] border border-[#7B2322] text-white hover:bg-[#371615]",
            )}
            style={{
                boxShadow:
                    action.variant === "primary"
                        ? "0 29px 8px 0 rgba(15, 83, 219, 0.00), 0 18px 7px 0 rgba(15, 83, 219, 0.01), 0 10px 6px 0 rgba(15, 83, 219, 0.05), 0 5px 5px 0 rgba(15, 83, 219, 0.09), 0 1px 3px 0 rgba(15, 83, 219, 0.10)"
                        : action.variant === "destructive"
                            ? "0 29px 8px 0 rgba(15, 83, 219, 0.00), 0 18px 7px 0 rgba(219, 18, 15, 0.01), 0 10px 6px 0 rgba(219, 18, 15, 0.05), 0 5px 5px 0 rgba(219, 18, 15, 0.09), 0 1px 3px 0 rgba(219, 18, 15, 0.10)"
                            : undefined,
            }}
        >
            {action.label}
        </kit.Button>
    );
};
