import { createElement, type ReactNode, useEffect, useRef } from "react";
import Markdown from "react-markdown";
import rehypeKatex from "rehype-katex";
import remarkGfm from "remark-gfm";
import remarkMath from "remark-math";
import { twMerge } from "tailwind-merge";
import { SpeedHighlightCodeBlock } from "./speedHighlightCodeBlock";

const ACCENTED_TAGS = ["h1", "h2", "h3", "h4", "h5", "h6", "b", "strong"];

const COMPONENTS: React.ComponentProps<typeof Markdown>["components"] = {
  code({ className, children }) {
    const childrenStr = String(children);
    const isBlock = childrenStr.endsWith("\n");

    if (!isBlock) {
      return <code>{childrenStr}</code>;
    }

    const language = /language-(\w+)/.exec(className ?? "")?.[1] ?? "";

    return <SpeedHighlightCodeBlock language={language}>{childrenStr}</SpeedHighlightCodeBlock>;
  },

  // make links open in a new window
  a({ children, href }) {
    return (
      <a href={href} target="_blank" rel="noopener noreferrer">
        {children}
      </a>
    );
  },

  ...ACCENTED_TAGS.reduce(
    (acc, tag) => {
      acc[tag] = ({ children }: { children: ReactNode }) => {
        return createElement(tag, {}, children);
      };
      return acc;
    },
    {} as Record<string, React.ComponentType<{ children: ReactNode }>>,
  ),
};

export function AiResponseMarkdown({
  className,
  children,
}: {
  className?: string;
  children: string;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const processedContent = preprocessMath(children);

  useKatexLayoutCalculation(containerRef, processedContent);

  if (!children) return null;

  return (
    <div
      ref={containerRef}
      className={twMerge("prose prose-sm prose-light max-w-none", className)}
      data-testid="ai-response"
    >
      <Markdown
        components={COMPONENTS}
        remarkPlugins={[remarkGfm, remarkMath]}
        rehypePlugins={[
          [
            rehypeKatex,
            {
              strict: false,
              throwOnError: false,
              errorColor: "#cc0000",
              macros: {
                "\\RR": "\\mathbb{R}",
                "\\NN": "\\mathbb{N}",
                "\\ZZ": "\\mathbb{Z}",
                "\\QQ": "\\mathbb{Q}",
                "\\CC": "\\mathbb{C}",
              },
            },
          ],
        ]}
      >
        {processedContent}
      </Markdown>
    </div>
  );
}

// Function to convert LaTeX delimiters to formats that remark-math understands
function preprocessMath(content: string): string {
  // Convert \[ ... \] to $$ ... $$ (trim whitespace from captured content)
  let processed = content.replace(/\\\[([\s\S]*?)\\\]/g, (_match, mathContent) => {
    return `$$${mathContent.trim()}$$`;
  });

  // Convert \( ... \) to $ ... $ (inline math)
  processed = processed.replace(/\\\(([\s\S]*?)\\\)/g, (_match, mathContent) => {
    return `$${mathContent.trim()}$`;
  });

  // Handle any remaining LaTeX commands that might not be properly delimited
  // This is a fallback for cases where LaTeX is written without proper delimiters
  processed = processed.replace(/\$\$([\s\S]*?)\$\$/g, (_match, mathContent) => {
    // Ensure the content is properly formatted for KaTeX
    return `$$${mathContent.trim()}$$`;
  });

  // Also handle single $ delimiters for inline math, but be very conservative
  // Only process if it contains obvious LaTeX commands to avoid currency conflicts
  processed = processed.replace(/\$([^$\n]+?)\$/g, (_match, mathContent) => {
    // Only process if it contains LaTeX commands (backslashes)
    if (mathContent.includes("\\")) {
      return `$${mathContent.trim()}$`;
    }
    return _match; // Keep original for currency, simple text, etc.
  });

  return processed;
}

// KaTeX renders asynchronously, so we need to force a layout recalculation after it renders
function useKatexLayoutCalculation(
  containerRef: React.RefObject<HTMLDivElement | null>,
  content: string,
) {
  useEffect(() => {
    const timer = setTimeout(() => {
      if (containerRef.current && content) {
        const event = new Event("resize");
        window.dispatchEvent(event);
      }
    }, 100);

    return () => clearTimeout(timer);
  }, [containerRef, content]);
}
