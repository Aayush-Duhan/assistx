import React, { useState, useEffect } from 'react';
import { cn } from '@/lib/utils';
import { Check, Copy, RotateCcw } from 'lucide-react';
import { MouseEventsCapture } from '../Portal';
import { HeadlessButton } from './HeadlessButton';
import { Tooltip } from './Tooltip';

// Type definitions
interface CopyButtonProps {
    content: string;
    className?: string;
    showText?: boolean;
    size?: number;
}

interface ResetButtonProps {
    onReset: () => void;
    className?: string;
    size?: number;
    shortcut?: string;
}

/**
 * A button that copies a given string to the clipboard when clicked.
 * It shows a "Copied" state temporarily after a successful copy.
 */
export function CopyButton({ content, className, showText = false, size = 16 }: CopyButtonProps): React.ReactElement {
    const [isCopied, setIsCopied] = useState(false);

    const handleCopy = (): void => {
        navigator.clipboard.writeText(content);
        setIsCopied(true);
    };

    // Reset the "Copied" state after 2 seconds.
    useEffect(() => {
        if (isCopied) {
            const timer = setTimeout(() => {
                setIsCopied(false);
            }, 2000);
            return () => clearTimeout(timer);
        }
    }, [isCopied]);

    return (
        <MouseEventsCapture>
            <HeadlessButton
                type="button"
                className={cn(
                    "text-white/50 hover:text-white cursor-pointer flex gap-x-2 items-center",
                    className
                )}
                onClick={handleCopy}
            >
                {isCopied ? <Check size={size} /> : <Copy size={size} />}
                {showText && <span className="font-sans">{isCopied ? "Copied" : "Copy"}</span>}
            </HeadlessButton>
        </MouseEventsCapture>
    );
}

/**
 * A button that resets the chat conversation when clicked.
 * Shows a tooltip with the keyboard shortcut when hovered.
 */
export function ResetButton({ onReset, className, size = 16, shortcut = "Ctrl+R" }: ResetButtonProps): React.ReactElement {
    const [isResetting, setIsResetting] = useState(false);

    const handleReset = (): void => {
        setIsResetting(true);
        onReset();
        // Reset the visual state after a short delay
        setTimeout(() => setIsResetting(false), 300);
    };

    return (
        <MouseEventsCapture>
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
                    <RotateCcw 
                        size={size} 
                        className={cn(
                            "transition-transform duration-200",
                            isResetting && "rotate-180"
                        )}
                    />
                </HeadlessButton>
            </Tooltip>
        </MouseEventsCapture>
    );
} 