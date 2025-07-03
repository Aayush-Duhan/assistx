import { ReactNode, ReactElement, createElement } from 'react';
import { clsx } from 'clsx';
import { CSSProperties } from 'react';

interface InlineWindowProps {
    children: ReactNode;
    width?: number;
    height?: number;
    className?: string;
    contentClassName?: string;
    title?: string;
}

export function InlineWindow({ 
    children, 
    width, 
    height, 
    className, 
    contentClassName,
    title 
}: InlineWindowProps): ReactElement {
    const style: CSSProperties = {};
    
    if (width !== undefined) {
        style.width = width;
    }
    
    if (height !== undefined) {
        style.height = height;
    }

    return createElement(
        'div',
        {
            className: clsx(
                "bg-black/80 backdrop-blur-md rounded-lg border border-white/10 shadow-lg",
                "text-white overflow-hidden",
                className
            ),
            style
        },
        title && createElement(
            'div',
            {
                className: "px-4 py-2 border-b border-white/10 text-sm font-medium"
            },
            title
        ),
        createElement(
            'div',
            {
                className: clsx("p-4", contentClassName)
            },
            children
        )
    );
} 