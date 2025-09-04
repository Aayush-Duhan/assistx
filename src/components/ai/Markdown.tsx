import { useRef, useState, useEffect, useContext, createContext, createElement, RefObject, ReactNode, FC } from 'react';
import { Streamdown } from 'streamdown';
import remarkGfm from 'remark-gfm';
import remarkMath from 'remark-math';
import rehypeKatex from 'rehype-katex';
import { useAtom } from 'jotai';
import { isCopyingAtom } from '@/state/atoms';
import { HoverableContent, HoverableContentContext, getInnerText } from './HoverableContent';
import { CopyButton } from '../ui/CopyButton';
import { HeadlessButton } from '../ui/HeadlessButton';

interface MarkdownProps {
  hideCopyButton?: boolean;
  onBulletClick?: (text: string) => void;
  children: string;
}

const BulletClickContext = createContext<((text: string) => void) | undefined>(undefined);


const PARAGRAPH_TAGS: (keyof JSX.IntrinsicElements)[] = ['p', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'blockquote', 'ul', 'ol', 'table', 'tr', 'td', 'th'];
const BOLD_TAGS: (keyof JSX.IntrinsicElements)[] = ['h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'b', 'strong'];
const NON_PARAGRAPH_BOLD_TAGS = BOLD_TAGS.filter(tag => !PARAGRAPH_TAGS.includes(tag));

function processLatex(markdown: string): string {
  let processed = markdown.replace(/\\\[([\s\S]*?)\\\]/g, (_, content) => `$$${content.trim()}$$`);
  processed = processed.replace(/\\\(([\s\S]*?)\\\)/g, (_, content) => `$${content.trim()}$`);
  processed = processed.replace(/\$\$([\s\S]*?)\$\$/g, (_, content) => `$$${content.trim()}$$`);
  processed = processed.replace(/\$([^$\n]+?)\$/g, (match, content) => {
    if (content.includes('\\')) {
      return `$${content.trim()}$`;
    }
    return match;
  });
  return processed;
}

type MarkdownComponentProps = {
  children?: ReactNode;
  className?: string;
  href?: string;
};

const markdownComponents: any = {
  a({ children, href }: MarkdownComponentProps) {
    return <a href={href} target="_blank" rel="noopener noreferrer">{children}</a>;
  },
  li({ children }: MarkdownComponentProps) {
    const onBulletClick = useContext(BulletClickContext);
    return (
      <HoverableContent
        tag="li"
        content={getInnerText(children)}
        onClick={onBulletClick ? () => onBulletClick(getInnerText(children)) : undefined}
        className="relative"
      >
        {onBulletClick && (
          <HeadlessButton
            className="absolute -left-6 right-0 -inset-y-0.5 rounded border border-transparent hover:bg-white/10 hover:border-white/20 active:bg-white/20 transition duration-30"
            onClick={() => onBulletClick(getInnerText(children))}
          />
        )}
        {children}
      </HoverableContent>
    );
  },
  ...NON_PARAGRAPH_BOLD_TAGS.reduce((acc, tag) => {
    acc[tag] = ({ children }: MarkdownComponentProps) => createElement(tag, { style: { fontFamily: 'var(--font-family-bold)', color: 'var(--color-accent)' } }, children);
    return acc;
  }, {} as Record<string, FC<MarkdownComponentProps>>),
  ...PARAGRAPH_TAGS.reduce((acc, tag) => {
    acc[tag] = ({ children }: MarkdownComponentProps) => {
      const content = getInnerText(children);
      return <HoverableContent content={content} tag={tag}>{children}</HoverableContent>;
    };
    return acc;
  }, {} as Record<string, FC<MarkdownComponentProps>>),
};


export function Markdown({ hideCopyButton = false, onBulletClick, children }: MarkdownProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const processedMarkdown = processLatex(children);

  const [hoveredRef, setHoveredRef] = useState<RefObject<HTMLElement> | null>(null);
  const [hoveredContent, setHoveredContent] = useState('');
  const [containerY, setContainerY] = useState<number | null>(null);
  const [isHoveringCopy, setIsHoveringCopy] = useAtom(isCopyingAtom);

  useEffect(() => {
    const timeout = setTimeout(() => {
      if (containerRef.current) {
        const event = new Event('resize');
        window.dispatchEvent(event);
      }
    }, 100);
    return () => clearTimeout(timeout);
  }, [processedMarkdown]);

  return (
    <HoverableContentContext.Provider value={{ hoveredRef, setHoveredRef, containerY, setContainerY, hoveredContent, setHoveredContent, containerRef }}>
      <BulletClickContext.Provider value={onBulletClick}>
        <div className="relative">
          <div ref={containerRef} className="prose prose-xs prose-light pl-4 max-w-none relative [&_*]:select-text text-[14px]">
            <Streamdown
              components={markdownComponents}
              remarkPlugins={[[remarkMath, { singleDollarTextMath: true }], remarkGfm]}
              rehypePlugins={[[rehypeKatex, {
                strict: false,
                throwOnError: false,
                errorColor: '#cc0000',
                macros: {
                  "\\RR": "\\mathbb{R}",
                  "\\NN": "\\mathbb{N}",
                  "\\ZZ": "\\mathbb{Z}",
                  "\\QQ": "\\mathbb{Q}",
                  "\\CC": "\\mathbb{C}",
                }
              }]]}
              parseIncompleteMarkdown
            >
              {processedMarkdown}
            </Streamdown>
          </div>
          {!hideCopyButton && containerY !== null && hoveredContent && (
            <>
              <div
                className="absolute -left-4 z-50 pointer-events-none transition-transform duration-100"
                style={{ top: 0, transform: `translateY(${containerY || 0}px)` }}
              >
                <div
                  className="pointer-events-auto"
                  onMouseEnter={() => setIsHoveringCopy(true)}
                  onMouseLeave={() => setIsHoveringCopy(false)}
                >
                  <CopyButton content={hoveredContent} size="md" />
                </div>
              </div>
              {isHoveringCopy && (
                <div
                  className="absolute top-0 left-0 right-0 z-1 pointer-events-none transition-transform duration-100 bg-slate-700/10 rounded-md"
                  style={{
                    transform: `translateY(${containerY || 0}px)`,
                    height: hoveredRef?.current?.offsetHeight || 'auto',
                  }}
                />
              )}
            </>
          )}
        </div>
      </BulletClickContext.Provider>
    </HoverableContentContext.Provider>
  );
}