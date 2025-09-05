import React, { createContext, useContext, useRef, createElement, useLayoutEffect } from 'react';

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
  setHoveredRef: () => { },
  containerY: null,
  setContainerY: () => { },
  hoveredContent: '',
  setHoveredContent: () => { },
  containerRef: null,
});

const BOLD_TAGS = ['h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'b', 'strong'];

export function HoverableContent({
  children,
  content,
  tag,
  onClick,
  className,
}: {
  children: React.ReactNode;
  content: string;
  tag?: keyof JSX.IntrinsicElements;
  onClick?: () => void;
  className?: string;
}) {
  const { hoveredRef, setHoveredRef, setContainerY, setHoveredContent, containerRef } = useContext(HoverableContentContext);
  const elementRef = useRef<HTMLElement>(null);
  const isHovered = hoveredRef === elementRef;

  const recalcOffset = () => {
    const containerTop = containerRef?.current?.getBoundingClientRect().top || 0;
    const elementTop = elementRef?.current?.getBoundingClientRect().top || 0;
    setContainerY(elementTop - containerTop);
  };
  
  const handleMouseEnter = () => {
    setHoveredRef(elementRef);
    setHoveredContent(content);
    recalcOffset();
  };

  useLayoutEffect(() => {
    if (!isHovered || !elementRef.current) return;

    const element = elementRef.current;
    const container = containerRef?.current;

    recalcOffset();

    const observer = new ResizeObserver(recalcOffset);
    observer.observe(element);
    if (container) observer.observe(container);

    // Recalculate on scroll/resize while hovered
    let ticking = false;
    const scheduleRecalc = () => {
      if (ticking) return;
      ticking = true;
      requestAnimationFrame(() => {
        ticking = false;
        recalcOffset();
      });
    };

    const scrollTargets = new Set<EventTarget>();
    const addScrollAncestors = (start: Element | null) => {
      let node: Element | null = start;
      while (node && node !== document.body) {
        const style = window.getComputedStyle(node);
        const overflowY = style.overflowY;
        const overflowX = style.overflowX;
        if (/(auto|scroll|overlay)/.test(overflowY) || /(auto|scroll|overlay)/.test(overflowX)) {
          scrollTargets.add(node);
        }
        node = node.parentElement;
      }
    };

    addScrollAncestors(element);
    addScrollAncestors(container || null);
    scrollTargets.add(window);

    for (const target of scrollTargets) {
      target.addEventListener('scroll', scheduleRecalc, { passive: true });
    }
    window.addEventListener('resize', scheduleRecalc);

    return () => {
      observer.disconnect();
      for (const target of scrollTargets) {
        target.removeEventListener('scroll', scheduleRecalc);
      }
      window.removeEventListener('resize', scheduleRecalc);
    };
  }, [isHovered, containerRef]);

  const isBold = BOLD_TAGS.includes(tag ?? 'div');

  return createElement(
    tag || 'div',
    {
      ref: elementRef,
      onMouseEnter: handleMouseEnter,
      onClick,
      className,
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