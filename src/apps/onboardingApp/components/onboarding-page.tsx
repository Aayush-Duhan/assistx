import type { HTMLAttributes, PropsWithChildren } from "react";
import { twMerge } from "tailwind-merge";
import { Grid } from "./grid";

export function OnboardingPage({
    children,
    className,
    ...props
}: PropsWithChildren<HTMLAttributes<HTMLDivElement>>) {
    return (
        <div className={twMerge("flex flex-row w-full h-full bg-white", className)} {...props}>
            {children}
        </div>
    );
}

export function OnboardingForm({
    children,
    className,
    ...props
}: PropsWithChildren<HTMLAttributes<HTMLDivElement>>) {
    return (
        <div
            className={twMerge(
                "h-full min-w-lg w-lg flex flex-col justify-center items-center p-12",
                className,
            )}
            {...props}
        >
            {children}
        </div>
    );
}

export function OnboardingDemo({
    children,
    className,
    style,
    isDarkMode,
    ...props
}: PropsWithChildren<HTMLAttributes<HTMLDivElement> & { isDarkMode?: boolean }>) {
    return (
        <div
            className={twMerge(
                "w-full flex flex-col justify-center items-center p-12 relative",
                className,
            )}
            style={{
                background: isDarkMode
                    ? "radial-gradient(226.22% 147.42% at 50% 83.74%, rgba(30, 30, 30, 0.80) 0%, rgba(15, 15, 15, 0.80) 100%)"
                    : "radial-gradient(226.22% 147.42% at 50% 83.74%, rgba(255, 255, 255, 0.80) 0%, rgba(187, 197, 221, 0.80) 100%)",
                ...style,
            }}
            {...props}
        >
            <div
                style={{
                    maskImage:
                        "radial-gradient(circle at 50% 30%, black 100px, transparent calc(100% - 200px))",
                }}
                className="absolute inset-0 z-0"
            >
                <Grid />
            </div>
            <div className="z-10 flex flex-col justify-center items-center w-full h-full">{children}</div>
        </div>
    );
}

export function OnboardingDescription({
    children,
    className,
    ...props
}: PropsWithChildren<HTMLAttributes<HTMLDivElement>>) {
    return (
        <div
            className={twMerge(
                "text-3xl font-medium text-center w-[500px] left-1/2 -translate-x-1/2 absolute",
                className,
            )}
            style={{ top: "calc(100% - 120px)" }}
            {...props}
        >
            {children}
        </div>
    );
}
