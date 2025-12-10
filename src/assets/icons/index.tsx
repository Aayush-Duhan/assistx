import React from "react";

interface IconProps extends React.SVGProps<SVGSVGElement> {
    size?: number;
}

/**
 * Cluely logo icon component
 */
export function Cluely({ size = 24, className, fill = "currentColor", ...props }: IconProps) {
    return (
        <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 24 24"
            width={size}
            height={size}
            className={className}
            fill={fill}
            {...props}
        >
            {/* Simple circular logo with 'C' shape */}
            <circle cx="12" cy="12" r="10" />
        </svg>
    );
}
