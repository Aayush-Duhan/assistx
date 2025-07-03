import React, { useState, useEffect, useRef, useContext, createContext } from 'react';
import ReactMarkdown from 'react-markdown';
import rehypeKatex from 'rehype-katex';
import remarkGfm from 'remark-gfm';
import remarkMath from 'remark-math';
import { cn } from '@/lib/utils';
import hljs from 'highlight.js';

// --- UI Components & Icons ---
import { MouseEventsCapture } from '../Portal';
import { CopyIcon, CircleCheckIcon } from './icons';

// --- Syntax Highlighter Component ---
interface SyntaxHighlighterProps {
  children: string;
  language?: string;
  className?: string;
}

function SyntaxHighlighter({ children, language, className }: SyntaxHighlighterProps) {
  const [highlightedCode, setHighlightedCode] = useState<string>('');

  useEffect(() => {
    try {
      let detectedLanguage = language;
      
      // Auto-detect language if not provided
      if (!detectedLanguage) {
        const detection = hljs.highlightAuto(children);
        detectedLanguage = detection.language || 'plaintext';
      }

      // Highlight the code
      const result = hljs.highlight(children, { 
        language: detectedLanguage,
        ignoreIllegals: true 
      });
      
      setHighlightedCode(result.value);
    } catch (error) {
      // Fallback to plain text if highlighting fails
      setHighlightedCode(children);
    }
  }, [children, language]);

  return (
    <pre className={cn(
      'bg-gray-900/50 rounded-lg p-4 overflow-x-auto text-sm',
      'border border-white/10',
      className
    )}>
      <code 
        className="text-white/90 font-mono text-sm leading-relaxed"
        dangerouslySetInnerHTML={{ __html: highlightedCode }}
      />
    </pre>
  );
}

// --- Context for Hover State ---

interface HoverContextValue {
  hoveredRef: React.RefObject<HTMLElement> | null;
  setHoveredRef: (ref: React.RefObject<HTMLElement> | null) => void;
  containerY: number | null;
  setContainerY: (y: number | null) => void;
  hoveredContent: string;
  setHoveredContent: (content: string) => void;
  containerRef: React.RefObject<HTMLDivElement> | null;
}

const HoverContext = createContext<HoverContextValue>({
  hoveredRef: null,
  setHoveredRef: () => {},
  containerY: null,
  setContainerY: () => {},
  hoveredContent: '',
  setHoveredContent: () => {},
  containerRef: null,
});

/**
 * A component that tracks which of its children is currently being hovered.
 * It uses React context to share this hover state with its descendants.
 */
function HoverableContent({
  content,
  children,
  tag = 'div',
}: {
  content: string;
  children: React.ReactNode;
  tag?: keyof JSX.IntrinsicElements;
}) {
  const {
    hoveredRef,
    setHoveredRef,
    setContainerY,
    setHoveredContent,
    containerRef,
  } = useContext(HoverContext);

  const elementRef = useRef<HTMLElement>(null);
  const isHovered = hoveredRef === elementRef;

  const handleMouseEnter = () => {
    setHoveredRef(elementRef);
    setHoveredContent(content);
    updatePosition();
  };

  const handleMouseMove = () => {
    if (isHovered) {
      updatePosition();
    }
  };

  const updatePosition = () => {
    if (!containerRef?.current || !elementRef.current) return;
    const containerTop = containerRef.current.getBoundingClientRect().top || 0;
    const elementTop = elementRef.current.getBoundingClientRect().top || 0;
    setContainerY(elementTop - containerTop);
  };

  const Component = tag as React.ElementType;

  return (
    <Component ref={elementRef} className="relative" onMouseEnter={handleMouseEnter} onMouseMove={handleMouseMove}>
      {children}
    </Component>
  );
}

/**
 * A utility to recursively extract all text content from a React node or tree.
 * @param node - The React node to process.
 */
function getTextFromNode(node: React.ReactNode): string {
  if (typeof node === 'string') return node;
  if (typeof node === 'number') return node.toString();
  if (Array.isArray(node)) return node.map(getTextFromNode).join('');
  if (node && typeof node === 'object' && 'props' in node) {
    const element = node as React.ReactElement;
    if (element.props && typeof element.props === 'object' && 'children' in element.props) {
      return getTextFromNode(element.props.children);
    }
  }
  return '';
}

// --- Custom Markdown Components ---

const markdownComponents: React.ComponentProps<typeof ReactMarkdown>['components'] = {
  code({ children, className }) {
    const codeString = String(children);
    const match = /language-(\w+)/.exec(className || '');
    const language = match ? match[1] : undefined;
    
    // Render a syntax-highlighted block for code that ends with a newline,
    // otherwise render it as a simple inline code element.
    if (codeString.endsWith('\n')) {
      return (
        <HoverableContent content={codeString}>
          <SyntaxHighlighter language={language}>{codeString}</SyntaxHighlighter>
        </HoverableContent>
      );
    }
    return <code className={className}>{children}</code>;
  },
  // Wrap all standard block elements in HoverableContent to track hover state.
  ...['p', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'blockquote', 'ul', 'ol', 'li', 'table', 'tr', 'td', 'th', 'pre'].reduce(
    (acc, tagName) => {
      acc[tagName] = ({ children }) => {
        const content = getTextFromNode(children);
        return (
          <HoverableContent content={content} tag={tagName as keyof JSX.IntrinsicElements}>
            {children}
          </HoverableContent>
        );
      };
      return acc;
    },
    {} as { [key: string]: React.ElementType }
  ),
};

// --- Copy Button ---

function CopyButton({
  content,
  className,
  showText = false,
  size = 'md',
}: {
  content: string;
  className?: string;
  showText?: boolean;
  size?: 'sm' | 'md';
}) {
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(content);
    setCopied(true);
  };

  useEffect(() => {
    if (copied) {
      const timeout = setTimeout(() => setCopied(false), 2000);
      return () => clearTimeout(timeout);
    }
  }, [copied]);

  return (
    <MouseEventsCapture>
      <button
        type="button"
        className={cn(
          'text-white/50 hover:text-white cursor-pointer flex gap-x-2 items-center',
          className,
          size === 'sm' && 'p-1',
          size === 'md' && 'p-2'
        )}
        onClick={handleCopy}
      >
        {copied ? <CircleCheckIcon size={12} /> : <CopyIcon size={12} />}
        {showText && <span className="font-sans">{copied ? 'Copied' : 'Copy'}</span>}
      </button>
    </MouseEventsCapture>
  );
}

// --- Main Markdown Component ---

interface MarkdownProps {
  hideCopyButton?: boolean;
  children: string;
}

/**
 * A wrapper around ReactMarkdown that provides custom styling, plugins,
 * and an interactive copy button for hovered elements.
 */
export function Markdown({ hideCopyButton = false, children }: MarkdownProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [hoveredRef, setHoveredRef] = useState<React.RefObject<HTMLElement> | null>(null);
  const [hoveredContent, setHoveredContent] = useState('');
  const [containerY, setContainerY] = useState<number | null>(null);
  const [isCopyButtonHovered, setIsCopyButtonHovered] = useState(false);

  // Sanitize and prepare the markdown content, especially for math.
  const sanitizedContent = children
    .replace(/\\\[([\s\S]*?)\\\]/g, (_, equation) => `$$${equation.trim()}$$`)
    .replace(/\\\(([\s\S]*?)\\\)/g, (_, equation) => `$${equation.trim()}$`);

  // This effect ensures that any layout shifts (like images loading)
  // will correctly reposition the floating copy button.
  useEffect(() => {
    const timeout = setTimeout(() => {
      if (containerRef.current) {
        const resizeEvent = new Event('resize');
        window.dispatchEvent(resizeEvent);
      }
    }, 100);
    return () => clearTimeout(timeout);
  }, [sanitizedContent]);

  return (
    <HoverContext.Provider
      value={{
        hoveredRef,
        setHoveredRef,
        containerY,
        setContainerY,
        hoveredContent,
        setHoveredContent,
        containerRef,
      }}
    >
      <div
        ref={containerRef}
        className="prose prose-sm prose-light pl-4 prose-invert max-w-none relative [&_*]:select-text"
      >
        <ReactMarkdown
          components={markdownComponents}
          remarkPlugins={[remarkGfm, remarkMath]}
          rehypePlugins={[rehypeKatex]}
        >
          {sanitizedContent}
        </ReactMarkdown>

        {/* Floating Copy Button */}
        {!hideCopyButton && containerY !== null && hoveredContent && (
          <>
            <div
              className="absolute -left-4 z-50 pointer-events-none transition-transform duration-100"
              style={{
                top: 0,
                transform: `translateY(${containerY || 0}px)`,
              }}
            >
              <div
                className="pointer-events-auto"
                onMouseEnter={() => {
                  setIsCopyButtonHovered(true);
                }}
                onMouseLeave={() => {
                  setIsCopyButtonHovered(false);
                }}
              >
                <CopyButton content={hoveredContent} size="md" />
              </div>
            </div>

            {/* Highlight effect for the hovered element */}
            {isCopyButtonHovered && (
              <div
                className="absolute top-0 left-0 right-0 z-1 pointer-events-none transition-transform duration-100 bg-blue-500/10 rounded-md"
                style={{
                  transform: `translateY(${containerY || 0}px)`,
                  height: hoveredRef?.current?.offsetHeight || 'auto',
                }}
              />
            )}
          </>
        )}
      </div>
    </HoverContext.Provider>
  );
}