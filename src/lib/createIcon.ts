import type { RefAttributes, SVGProps } from "react";
import { createElement, forwardRef } from "react";

export type SVGElementType =
    | "circle"
    | "ellipse"
    | "g"
    | "line"
    | "path"
    | "polygon"
    | "polyline"
    | "rect";

export type IconNode = [elementName: SVGElementType, attrs: Record<string, string | number>][];

export type SVGAttributes = Partial<SVGProps<SVGSVGElement>>;

export type ElementAttributes = RefAttributes<SVGSVGElement> & SVGAttributes;

export interface IconProps extends ElementAttributes {
    size?: string | number;
    absoluteStrokeWidth?: boolean;
}

export interface IconComponentProps extends IconProps {
    iconNode: IconNode;
}

export const defaultAttributes = {
    xmlns: "http://www.w3.org/2000/svg",
    width: 24,
    height: 24,
    fill: "none",
    // stroke: "currentColor",
    // strokeWidth: 2,
    // strokeLinecap: "round",
    // strokeLinejoin: "round",
};

export const Icon = forwardRef<SVGSVGElement, IconComponentProps>(
    (
        {
            color = "currentColor",
            size = 24,
            strokeWidth = 0,
            absoluteStrokeWidth,
            children,
            iconNode,
            ...rest
        },
        ref,
    ) => {
        return createElement(
            "svg",
            {
                ref,
                ...defaultAttributes,
                width: size,
                height: size,
                stroke: color,
                strokeWidth: absoluteStrokeWidth ? (Number(strokeWidth) * 24) / Number(size) : strokeWidth,
                ...rest,
            },
            [
                // Provide stable keys for generated SVG child elements
                ...iconNode.map(([tag, attrs], index) => createElement(tag, { ...attrs, key: `${tag}-${index}` })),
                ...(Array.isArray(children) ? children : [children]),
            ],
        );
    },
);

export const createIcon = (iconName: string, iconNode: IconNode, viewBox?: string) => {
    const Component = forwardRef<SVGSVGElement, IconProps>(({ className = "", ...props }, ref) =>
        createElement(Icon, {
            ref,
            viewBox,
            iconNode,
            className,
            ...props,
        }),
    );

    Component.displayName = iconName;

    return Component;
};
