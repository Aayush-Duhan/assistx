import React, { createContext, useContext, useRef, createElement } from 'react';

export const HoverableContentContext = createContext<{
  hoveredRef: React.RefObject<HTMLElement> | null;
  setHoveredRef: (ref: React.RefObject<HTMLElement> | null) => void;
  containerY: number | null;
  setContainerY: (y: number | null) => void;
  hoveredContent: string;
  setHoveredContent: (content: string) => void;
  containerRef: React.RefObject<HTMLDivElement> | null;
}>({
  hoveredRef: null,
  setHoveredRef: () => {},
  containerY: null,
  setContainerY: () => {},
  hoveredContent: '',
  setHoveredContent: () => {},
  containerRef: null,
});

const BOLD_TAGS = ['h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'b', 'strong'];

export function HoverableContent({
  children,
  content,
  tag,
}: {
  children: React.ReactNode;
  content: string;
  tag?: keyof JSX.IntrinsicElements;
}) {
  const { hoveredRef, setHoveredRef, setContainerY, setHoveredContent, containerRef } = useContext(HoverableContentContext);
  const elementRef = useRef<HTMLElement>(null);
  const isCurrentlyHovered = hoveredRef === elementRef;

  const handleMouseEnter = () => {
    setHoveredRef(elementRef);
    setHoveredContent(content);
    const containerTop = containerRef?.current?.getBoundingClientRect().top || 0;
    const elementTop = elementRef?.current?.getBoundingClientRect().top || 0;
    setContainerY(elementTop - containerTop);
  };

  const handleMouseMove = () => {
    if (isCurrentlyHovered) {
      const containerTop = containerRef?.current?.getBoundingClientRect().top || 0;
      const elementTop = elementRef?.current?.getBoundingClientRect().top || 0;
      setContainerY(elementTop - containerTop);
    }
  };

  const isBold = BOLD_TAGS.includes(tag ?? 'div');

  return createElement(
    tag || 'div',
    {
      ref: elementRef,
      onMouseEnter: handleMouseEnter,
      onMouseMove: handleMouseMove,
      style: {
        fontFamily: isBold ? 'var(--font-family-bold)' : undefined,
        color: isBold ? 'var(--color-accent)' : undefined,
      },
    },
    children
  );
}

export function getInnerText(node: React.ReactNode): string {
  if (typeof node === 'string') return node;
  if (typeof node === 'number') return node.toString();
  if (Array.isArray(node)) return node.map(getInnerText).join('');

  if (node && typeof node === 'object' && 'props' in node) {
    const element = node as React.ReactElement;
    if (element.props && typeof element.props === 'object' && 'children' in element.props) {
      return getInnerText(element.props.children);
    }
  }

  return '';
}