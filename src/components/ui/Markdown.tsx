import React, { useState, useEffect, useRef, useContext, createContext } from 'react';
import ReactMarkdown from 'react-markdown';
import rehypeKatex from 'rehype-katex';
import remarkGfm from 'remark-gfm';
import remarkMath from 'remark-math';
import { cn } from '@/lib/utils';
import { highlightElement } from '@speed-highlight/core';

// --- UI Components & Icons ---
import { MouseEventsCapture } from '../Portal';
import { CopyIcon, CircleCheckIcon } from './icons';

// --- Enhanced Syntax Highlighter Component ---
interface SyntaxHighlighterProps {
  children: string;
  language?: string;
  className?: string;
}

function SyntaxHighlighter({ children, language, className }: SyntaxHighlighterProps) {
  const codeRef = useRef<HTMLElement>(null);
  const [, setIsHighlighted] = useState(false);

  useEffect(() => {
    const highlightCode = async () => {
      if (!codeRef.current) return;
      
      try {
        // Clean the content first
        codeRef.current.textContent = children;
        
        // Detect or use provided language
        let detectedLanguage = language;
        
        // Map common language aliases to speed-highlight language names
        const languageMap: Record<string, string> = {
          'javascript': 'js',
          'typescript': 'ts',
          'python': 'py',
          'markdown': 'md',
          'shell': 'bash',
          'sh': 'bash',
          'html': 'html',
          'css': 'css',
          'json': 'json',
          'yaml': 'yaml',
          'yml': 'yaml',
          'xml': 'xml',
          'sql': 'sql',
          'java': 'java',
          'c': 'c',
          'cpp': 'c',
          'go': 'go',
          'rust': 'rs',
          'ruby': 'rb',
          'php': 'php',
          'perl': 'pl',
          'lua': 'lua',
          'docker': 'docker',
          'dockerfile': 'docker',
          'makefile': 'make',
          'plaintext': 'plain',
          'text': 'plain'
        };

        if (detectedLanguage && languageMap[detectedLanguage.toLowerCase()]) {
          detectedLanguage = languageMap[detectedLanguage.toLowerCase()];
        }

        // Apply speed-highlight class and highlight
        if (detectedLanguage) {
          codeRef.current.className = `shj-lang-${detectedLanguage}`;
          highlightElement(codeRef.current);
        } else {
          // Auto-detect language (basic heuristics)
          const code = children.trim();
          if (code.includes('import ') || code.includes('export ') || code.includes('const ') || code.includes('function ')) {
            codeRef.current.className = 'shj-lang-js';
          } else if (code.includes('def ') || code.includes('import ') || code.includes('print(')) {
            codeRef.current.className = 'shj-lang-py';
          } else if (code.includes('<') && code.includes('>')) {
            codeRef.current.className = 'shj-lang-html';
          } else {
            codeRef.current.className = 'shj-lang-plain';
          }
          highlightElement(codeRef.current);
        }
        
        setIsHighlighted(true);
      } catch (error) {
        console.warn('Failed to highlight code:', error);
        // Fallback to plain text
        if (codeRef.current) {
          codeRef.current.textContent = children;
        }
      }
    };

    highlightCode();
  }, [children, language]);

  return (
    <div className="relative group my-4">
      <pre className={cn(
        'bg-gray-900/60 backdrop-blur-sm rounded-xl p-6 overflow-x-auto text-sm',
        'border border-white/10 shadow-lg',
        'transition-all duration-300 hover:bg-gray-900/70 hover:border-white/20',
        className
      )}>
        <code 
          ref={codeRef}
          className="text-gray-100 font-mono text-sm leading-relaxed block"
          style={{ fontFamily: '"JetBrains Mono", "Fira Code", Consolas, monospace' }}
        >
          {children}
        </code>
      </pre>
      
      {/* Language indicator */}
      {language && (
        <div className="absolute top-3 right-3 px-2 py-1 text-xs text-white/60 bg-black/30 rounded backdrop-blur-sm">
          {language}
        </div>
      )}
    </div>
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
 * Enhanced with better visual feedback and smoother transitions.
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
    <Component 
      ref={elementRef} 
      className={cn(
        "relative transition-all duration-200",
        isHovered && "bg-white/5 rounded-md px-2 -mx-2"
      )} 
      onMouseEnter={handleMouseEnter} 
      onMouseMove={handleMouseMove}
    >
      {children}
    </Component>
  );
}

/**
 * A utility to recursively extract all text content from a React node or tree.
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

// --- Enhanced Markdown Components ---
const markdownComponents: React.ComponentProps<typeof ReactMarkdown>['components'] = {
  code({ children, className }) {
    const codeString = String(children);
    const match = /language-(\w+)/.exec(className || '');
    const language = match ? match[1] : undefined;
    
    // Enhanced block code rendering
    if (codeString.endsWith('\n') || codeString.includes('\n')) {
      return (
        <HoverableContent content={codeString}>
          <SyntaxHighlighter language={language}>{codeString}</SyntaxHighlighter>
        </HoverableContent>
      );
    }
    
    // Enhanced inline code
    return (
      <code className={cn(
        "px-2 py-1 rounded-md bg-white/10 text-white/90 font-mono text-sm",
        "border border-white/10 transition-colors hover:bg-white/15",
        className
      )}>
        {children}
      </code>
    );
  },
  
  // Enhanced paragraph with better spacing
  p({ children }) {
    const content = getTextFromNode(children);
    return (
      <HoverableContent content={content} tag="p">
        <p className="mb-4 leading-7 text-white/90 [&:not(:first-child)]:mt-6">
          {children}
        </p>
      </HoverableContent>
    );
  },
  
  // Enhanced headings with better hierarchy
  h1({ children }) {
    const content = getTextFromNode(children);
    return (
      <HoverableContent content={content} tag="h1">
        <h1 className="scroll-m-20 text-3xl font-bold tracking-tight text-white mb-6 mt-8 first:mt-0 border-b border-white/20 pb-3">
          {children}
        </h1>
      </HoverableContent>
    );
  },
  
  h2({ children }) {
    const content = getTextFromNode(children);
    return (
      <HoverableContent content={content} tag="h2">
        <h2 className="scroll-m-20 text-2xl font-semibold tracking-tight text-white mb-4 mt-8 first:mt-0">
          {children}
        </h2>
      </HoverableContent>
    );
  },
  
  h3({ children }) {
    const content = getTextFromNode(children);
    return (
      <HoverableContent content={content} tag="h3">
        <h3 className="scroll-m-20 text-xl font-semibold tracking-tight text-white mb-3 mt-6 first:mt-0">
          {children}
        </h3>
      </HoverableContent>
    );
  },
  
  h4({ children }) {
    const content = getTextFromNode(children);
    return (
      <HoverableContent content={content} tag="h4">
        <h4 className="scroll-m-20 text-lg font-semibold tracking-tight text-white mb-2 mt-4 first:mt-0">
          {children}
        </h4>
      </HoverableContent>
    );
  },
  
  h5({ children }) {
    const content = getTextFromNode(children);
    return (
      <HoverableContent content={content} tag="h5">
        <h5 className="scroll-m-20 text-base font-semibold tracking-tight text-white mb-2 mt-4 first:mt-0">
          {children}
        </h5>
      </HoverableContent>
    );
  },
  
  h6({ children }) {
    const content = getTextFromNode(children);
    return (
      <HoverableContent content={content} tag="h6">
        <h6 className="scroll-m-20 text-sm font-semibold tracking-tight text-white mb-2 mt-4 first:mt-0">
          {children}
        </h6>
      </HoverableContent>
    );
  },
  
  // Enhanced lists with better spacing
  ul({ children }) {
    const content = getTextFromNode(children);
    return (
      <HoverableContent content={content} tag="ul">
        <ul className="my-4 ml-6 list-disc space-y-2 text-white/90 [&>li]:mt-2">
          {children}
        </ul>
      </HoverableContent>
    );
  },
  
  ol({ children }) {
    const content = getTextFromNode(children);
    return (
      <HoverableContent content={content} tag="ol">
        <ol className="my-4 ml-6 list-decimal space-y-2 text-white/90 [&>li]:mt-2">
          {children}
        </ol>
      </HoverableContent>
    );
  },
  
  li({ children }) {
    const content = getTextFromNode(children);
    return (
      <HoverableContent content={content} tag="li">
        <li className="leading-7">
          {children}
        </li>
      </HoverableContent>
    );
  },
  
  // Enhanced blockquote
  blockquote({ children }) {
    const content = getTextFromNode(children);
    return (
      <HoverableContent content={content} tag="blockquote">
        <blockquote className="mt-6 border-l-4 border-white/30 pl-6 italic text-white/80 bg-white/5 py-4 rounded-r-lg">
          {children}
        </blockquote>
      </HoverableContent>
    );
  },
  
  // Enhanced table
  table({ children }) {
    const content = getTextFromNode(children);
    return (
      <HoverableContent content={content} tag="div">
        <div className="my-6 w-full overflow-y-auto rounded-lg border border-white/20">
          <table className="w-full border-collapse text-sm">
            {children}
          </table>
        </div>
      </HoverableContent>
    );
  },
  
  tr({ children }) {
    const content = getTextFromNode(children);
    return (
      <HoverableContent content={content} tag="tr">
        <tr className="border-b border-white/10 transition-colors hover:bg-white/5">
          {children}
        </tr>
      </HoverableContent>
    );
  },
  
  td({ children }) {
    const content = getTextFromNode(children);
    return (
      <HoverableContent content={content} tag="td">
        <td className="border-r border-white/10 px-4 py-3 text-left text-white/90 last:border-r-0">
          {children}
        </td>
      </HoverableContent>
    );
  },
  
  th({ children }) {
    const content = getTextFromNode(children);
    return (
      <HoverableContent content={content} tag="th">
        <th className="border-r border-white/10 px-4 py-3 text-left font-medium text-white bg-white/5 last:border-r-0">
          {children}
        </th>
      </HoverableContent>
    );
  },
  
  // Enhanced links
  a({ children, href }) {
    const content = getTextFromNode(children);
    return (
      <HoverableContent content={content} tag="a">
        <a 
          href={href}
          className="font-medium text-blue-400 underline underline-offset-4 transition-colors hover:text-blue-300"
          target="_blank"
          rel="noopener noreferrer"
        >
          {children}
        </a>
      </HoverableContent>
    );
  },
  
  // Enhanced horizontal rule
  hr() {
    return <hr className="my-8 border-white/20" />;
  },
  
  // Enhanced emphasis
  em({ children }) {
    return <em className="italic text-white/90">{children}</em>;
  },
  
  strong({ children }) {
    return <strong className="font-semibold text-white">{children}</strong>;
  }
};

// --- Enhanced Copy Button ---
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
          'transition-all duration-200 hover:scale-105 active:scale-95',
          'rounded-lg p-2 hover:bg-white/10 backdrop-blur-sm',
          className,
          size === 'sm' && 'p-1',
          size === 'md' && 'p-2'
        )}
        onClick={handleCopy}
      >
        {copied ? <CircleCheckIcon size={12} /> : <CopyIcon size={12} />}
        {showText && <span className="font-sans text-xs">{copied ? 'Copied!' : 'Copy'}</span>}
      </button>
    </MouseEventsCapture>
  );
}

// --- Main Enhanced Markdown Component ---
interface MarkdownProps {
  hideCopyButton?: boolean;
  children: string;
}

/**
 * Enhanced Markdown component with improved spacing, highlighting, and visual presentation.
 * Uses speed-highlight for better syntax highlighting performance.
 */
export function Markdown({ hideCopyButton = false, children }: MarkdownProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [hoveredRef, setHoveredRef] = useState<React.RefObject<HTMLElement> | null>(null);
  const [hoveredContent, setHoveredContent] = useState('');
  const [containerY, setContainerY] = useState<number | null>(null);
  const [isCopyButtonHovered, setIsCopyButtonHovered] = useState(false);

  // Sanitize and prepare the markdown content, especially for math
  const sanitizedContent = children
    .replace(/\\\[([\s\S]*?)\\\]/g, (_, equation) => `$${equation.trim()}$`)
    .replace(/\\\(([\s\S]*?)\\\)/g, (_, equation) => `$${equation.trim()}$`);

  // Load speed-highlight CSS theme
  useEffect(() => {
    // Load default theme CSS for speed-highlight
    const link = document.createElement('link');
    link.rel = 'stylesheet';
    link.href = 'https://unpkg.com/@speed-highlight/core/dist/themes/default.css';
    document.head.appendChild(link);
    
    return () => {
      document.head.removeChild(link);
    };
  }, []);

  // Handle layout shifts
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
        className="prose prose-sm prose-light max-w-none relative [&_*]:select-text"
        style={{
          lineHeight: '1.7'
        } as React.CSSProperties}
      >
        <ReactMarkdown
          components={markdownComponents}
          remarkPlugins={[remarkGfm, remarkMath]}
          rehypePlugins={[rehypeKatex]}
        >
          {sanitizedContent}
        </ReactMarkdown>

        {/* Enhanced Floating Copy Button */}
        {!hideCopyButton && containerY !== null && hoveredContent && (
          <>
            <div
              className="absolute -left-4 z-50 pointer-events-none transition-all duration-200 ease-out"
              style={{
                top: 0,
                transform: `translateY(${containerY || 0}px)`,
              }}
            >
              <div
                className="pointer-events-auto"
                onMouseEnter={() => setIsCopyButtonHovered(true)}
                onMouseLeave={() => setIsCopyButtonHovered(false)}
              >
                <CopyButton 
                  content={hoveredContent} 
                  size="md" 
                  className="shadow-lg border border-white/10"
                />
              </div>
            </div>

            {/* Enhanced highlight effect */}
            {isCopyButtonHovered && (
              <div
                className="absolute top-0 left-0 right-0 z-1 pointer-events-none transition-all duration-200 bg-gradient-to-r from-blue-500/10 to-purple-500/10 rounded-md border border-white/10"
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