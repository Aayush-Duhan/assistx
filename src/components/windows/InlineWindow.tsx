import { forwardRef } from "react";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";
import { MouseEventsCapture } from "./MouseEventCapture";

export interface InlineWindowProps {
    positionClassName?: string;
    backgroundClassname?: string;
    contentClassName?: string;
    width?: string | number;
    fullBorderRadius?: boolean;
    opaque?: boolean;
    captureMouseEvents?: boolean;
    fastAnimations?: boolean;
    onMouseEnter?: () => void;
    onMouseLeave?: () => void;
    layoutTransition?: boolean;
    children: React.ReactNode;
}

export const InlineWindow = forwardRef<HTMLDivElement, InlineWindowProps>(
    (
        {
            positionClassName,
            backgroundClassname,
            contentClassName,
            width = 'fit-content',
            fullBorderRadius = false,
            opaque = false,
            captureMouseEvents = true,
            fastAnimations = false,
            onMouseEnter,
            onMouseLeave,
            layoutTransition = false,
            children,
        },
        ref
    ) => {
        const duration = fastAnimations ? 0.02 : 0.15;
        const ease = fastAnimations ? 'linear' : 'easeOut';
        return (
            <div
                className={cn('relative', positionClassName)}
                style={{ width ,fontFamily: 'Inter'}}
                onMouseEnter={onMouseEnter}
                onMouseLeave={onMouseLeave}
            >
                <MouseEventsCapture enabled={captureMouseEvents}>
                    <motion.div
                        className={cn(
                            'absolute inset-0 shadow-md inset-ring-1 inset-ring-zinc-400/33 border-[0.5px] border-black/80',
                            opaque ? 'bg-zinc-950/95' : 'bg-black/60',
                            backgroundClassname
                        )}
                        style={{
                            borderRadius: fullBorderRadius ? 999 : 8,
                            backgroundColor: void 0
                        }}
                        transition={{ duration, ease }}
                        layout={layoutTransition}
                        layoutDependency={children}
                    />
                    <motion.div
                        ref={ref}
                        className={cn('relative', contentClassName)}
                        transition={{ duration, ease }}
                        layout={layoutTransition ? 'position' : false}
                        layoutDependency={children}
                        style={{borderRadius: fullBorderRadius ? 999 : 8}}
                    >
                        {children}
                    </motion.div>
                </MouseEventsCapture>
            </div>
        )
    }
)