import React from 'react';
import { observer } from 'mobx-react-lite';
import { motion, AnimatePresence } from 'framer-motion';
import { WindowTitle } from '../ui/WindowTitle';
import { Logo } from '../app/Logo';
import { cn } from '@/lib/utils';

export const AIResponseHeader = observer(({
    title,
    titleKey,
    showPulseAnimation = false,
    children,
}: {
    title: React.ReactNode;
    titleKey: string;
    showPulseAnimation?: boolean;
    children?: React.ReactNode;
}) => {
    return (
        <WindowTitle>
            <div className="flex flex-1 items-center w-full">
                <div className="flex justify-between items-center gap-2 flex-1">
                    <div className={cn(
                        "flex flex-1 items-center",
                        showPulseAnimation && "animate-[pulse_1.5s_ease-in-out_infinite]"
                    )}>
                        <Logo className="size-3.5 fill-white mr-2 -mt-[1px]" />
                        <AnimatePresence mode="popLayout">
                            <motion.p
                                key={titleKey}
                                className="min-w-fit"
                                initial={{ opacity: 0, x: 20 }}
                                animate={{ opacity: 1, x: 0 }}
                                exit={{ opacity: 0, x: -20 }}
                            >
                                {title}
                            </motion.p>
                        </AnimatePresence>
                    </div>
                </div>
                <div className="flex items-center gap-2">
                    {children}
                </div>
            </div>
        </WindowTitle>
    );
});