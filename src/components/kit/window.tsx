import { motion, useAnimate } from "motion/react";
import { useEffect, useRef } from "react";
import { twMerge } from "tailwind-merge";
import { CaptureMouseEventsWrapper } from "@/components/captureMouseEventsWrapper";
import { NotificationsPortal } from "@/components/notifications/portal";

interface CluelyWindowProps {
    ref?: React.Ref<HTMLDivElement>;
    backgroundClassname?: string;
    positionClassName?: string;
    contentClassName?: string;
    width?: number | "fit-content";
    fullBorderRadius?: boolean;
    opaque?: boolean;
    captureMouseEvents?: boolean;
    captureMouseEventsEvenWhenHidden?: boolean;
    fastAnimations?: boolean;
    onMouseEnter?: () => void;
    onMouseLeave?: () => void;
    children?: React.ReactNode;
}

function CluelyInlineWindow({
    ref,
    positionClassName,
    backgroundClassname,
    backgroundStyle,
    contentClassName,
    width = "fit-content",
    fullBorderRadius = false,
    opaque = false,
    captureMouseEvents = false,
    captureMouseEventsEvenWhenHidden = false,
    fastAnimations = false,
    onMouseEnter,
    onMouseLeave,
    layoutTransition = false,
    children,
}: CluelyWindowProps & { layoutTransition?: boolean; backgroundStyle?: React.CSSProperties }) {
    const animationDuration = fastAnimations ? 0.02 : 0.15;
    const animationEasing = fastAnimations ? "linear" : "easeOut";

    const borderRadius = fullBorderRadius ? 999 : 12;

    return (
        <div
            className={twMerge("relative", positionClassName)}
            style={{ width }}
            onMouseEnter={onMouseEnter}
            onMouseLeave={onMouseLeave}
        >
            <CaptureMouseEventsWrapper
                enabled={captureMouseEvents}
                enabledEvenWhenHidden={captureMouseEventsEvenWhenHidden}
            >
                <motion.div
                    className={twMerge(
                        // match macOS window border
                        "absolute inset-0 shadow-md inset-ring-1 inset-ring-zinc-400/33 border-[0.5px] border-black/80",
                        opaque ? "bg-zinc-950/95" : "bg-black/60",
                        backgroundClassname,
                    )}
                    style={{
                        // set borderRadius here so framer motion corrects distortion on layout change
                        borderRadius,
                        ...backgroundStyle,
                    }}
                    transition={{ duration: animationDuration, ease: animationEasing }}
                    layout={layoutTransition}
                    layoutDependency={children} // only trigger layout on explicit children changes
                />
                <motion.div
                    ref={ref}
                    className={twMerge("relative", contentClassName)}
                    transition={{ duration: animationDuration, ease: animationEasing }}
                    layout={layoutTransition ? "position" : false}
                    layoutDependency={children} // only trigger layout on explicit children changes
                    // also set borderRadius here so overflow-hidden in contentClassName works correctly
                    style={{ borderRadius }}
                >
                    {children}
                </motion.div>
            </CaptureMouseEventsWrapper>
        </div>
    );
}

const AUTO_DISMISS_SECONDS = 10;

export function NotificationWindow({
    show = true,
    onDismiss,
    ...rest
}: { show?: boolean; onDismiss?: () => void } & CluelyWindowProps) {
    const [scope, animate] = useAnimate();
    const dismissTimeout = useRef<NodeJS.Timeout | null>(null);

    useEffect(() => {
        if (show && onDismiss) {
            dismissTimeout.current = setTimeout(() => {
                onDismiss();
            }, AUTO_DISMISS_SECONDS * 1000);
        }

        return () => {
            if (dismissTimeout.current) {
                clearTimeout(dismissTimeout.current);
                dismissTimeout.current = null;
            }
        };
    }, [show, onDismiss]);

    return (
        <NotificationsPortal>
            {show && (
                <motion.div
                    initial={{ x: 500 }}
                    animate={{
                        x: 0,
                    }}
                    exit={{ opacity: 0 }}
                    transition={{
                        type: "spring",
                        stiffness: 400,
                        damping: 35,
                    }}
                    drag={onDismiss ? "x" : false}
                    dragConstraints={{ left: 0, right: 0 }}
                    dragElastic={{ left: 0, right: 1 }}
                    ref={scope}
                    onDragEnd={async (_, info) => {
                        if (!onDismiss) return;

                        if (info.offset.x * info.velocity.x > 1_000 && info.offset.x > 0) {
                            await animate(
                                scope.current,
                                { x: 500 },
                                // Make sure it's fast enough, but doesn't look like it glitches out
                                { velocity: Math.min(Math.max(info.velocity.x, 1000), 5000), type: "inertia" },
                            );

                            onDismiss();
                        }
                    }}
                >
                    <CluelyInlineWindow
                        {...rest}
                        backgroundClassname={twMerge(
                            "absolute inset-0 shadow-md inset-ring-0 border-0",
                            rest.backgroundClassname,
                        )}
                        backgroundStyle={{
                            background:
                                "radial-gradient(187.42% 161.62% at 20.13% 5.15%, rgb(16 16 18) 0%, rgb(29, 31, 35) 100%)",
                            boxShadow:
                                "0 0 0 1px rgba(117, 129, 148, 0.24), 0 0 8px 0 rgba(117, 142, 196, 0.2), 0 65px 18px 0 rgba(0, 0, 0, 0.00), 0 42px 17px 0 rgba(0, 0, 0, 0.03), 0 23px 14px 0 rgba(0, 0, 0, 0.11), 0 10px 10px 0 rgba(0, 0, 0, 0.19), 0 3px 6px 0 rgba(0, 0, 0, 0.22)",
                        }}
                        contentClassName={twMerge("p-3.5", rest.contentClassName)}
                        width={400}
                    />
                </motion.div>
            )}
        </NotificationsPortal>
    );
}
