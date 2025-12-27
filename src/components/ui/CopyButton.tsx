import React, { useState } from 'react';
import { useCopyToClipboard } from 'usehooks-ts';
import { cn } from '@/lib/utils';
import { LuCheck, LuCopy, LuRotateCcw } from 'react-icons/lu';
import { HeadlessButton } from './HeadlessButton';
import { Tooltip } from './Tooltip';
import { AnimatePresence } from 'framer-motion';

interface CopyButtonProps {
    content: string | (() => string);
    className?: string;
    showText?: boolean;
    size?: 'sm' | 'md' | 'lg';
    onMouseOver?: () => void;
    onMouseOut?: () => void;
}

interface ResetButtonProps {
    onReset: () => void;
    className?: string;
    size?: number;
    shortcut?: string;
}


export function CopyButton({ content, className, showText = false, size = 'md', onMouseOver, onMouseOut }: CopyButtonProps): React.ReactElement {
    const [, copy] = useCopyToClipboard();
    const [justCopied, setJustCopied] = useState(false);

    const handleCopy = (): void => {
        const textToCopy = typeof content === 'function' ? content() : content;
        copy(textToCopy);
        setJustCopied(true);
        setTimeout(() => setJustCopied(false), 2000); // Reset after 2 seconds
    };

    return (
        <AnimatePresence>
            <HeadlessButton
                type="button"
                className={cn(
                    "text-white/50 hover:text-white cursor-pointer flex gap-x-2 items-center",
                    className,
                    size === 'sm' && 'p-1',
                    size === 'md' && 'p-2',
                    size === 'lg' && 'p-1'
                )}
                onClick={handleCopy}
                onMouseOver={onMouseOver}
                onMouseOut={onMouseOut}
            >
                {justCopied ? (
                    <LuCheck size={size === 'lg' ? 14 : 12} />
                ) : (
                    <LuCopy size={size === 'lg' ? 14 : 12} />
                )}
                {showText && <span className="font-sans">{justCopied ? "Copied" : "Copy"}</span>}
            </HeadlessButton>
        </AnimatePresence>
    );
}


export function ResetButton({ onReset, className, size = 16, shortcut = "Ctrl+R" }: ResetButtonProps): React.ReactElement {
    const [isResetting, setIsResetting] = useState(false);

    const handleReset = (): void => {
        setIsResetting(true);
        onReset();
        setTimeout(() => setIsResetting(false), 300);
    };

    return (
        <Tooltip tooltipContent={`Reset Chat (${shortcut})`} position="bottom">
            <HeadlessButton
                type="button"
                className={cn(
                    "text-white/50 hover:text-white cursor-pointer flex gap-x-2 items-center transition-all duration-200",
                    isResetting && "text-white scale-95",
                    className
                )}
                onClick={handleReset}
            >
                <LuRotateCcw
                    size={size}
                    className={cn(
                        "transition-transform duration-200",
                        isResetting && "rotate-180"
                    )}
                />
            </HeadlessButton>
        </Tooltip>
    );
} 