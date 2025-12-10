import "@speed-highlight/core/themes/dark.css";

import { highlightText, type ShjLanguage } from "@speed-highlight/core";
import { useEffect, useState } from "react";

const DEBOUNCE_MS = 500;

export function SpeedHighlightCodeBlock({
  language,
  children,
}: {
  language: string;
  children: string;
}) {
  const [highlightInnerHtml, setHighlightInnerHtml] = useState<string | null>(null);

  useEffect(() => {
    const speedHighlightLanguage = parseSpeedHighlightLanguage(language);

    if (!speedHighlightLanguage) {
      setHighlightInnerHtml(null);
      return;
    }

    let aborted = false;

    const highlight = async () => {
      const innerHtml = await highlightText(children, speedHighlightLanguage, true, {
        hideLineNumbers: true,
      });
      if (aborted) return;

      setHighlightInnerHtml(innerHtml);
    };

    const timeout = setTimeout(highlight, DEBOUNCE_MS);

    return () => {
      aborted = true;
      clearTimeout(timeout);
    };
  }, [language, children]);

  return (
    <code className="whitespace-pre-wrap break-words">
      {highlightInnerHtml != null ? (
        // biome-ignore lint/security/noDangerouslySetInnerHtml: we trust the content
        <div dangerouslySetInnerHTML={{ __html: highlightInnerHtml }} />
      ) : (
        <div>{children}</div>
      )}
    </code>
  );
}

// convert markdown language to speed-highlight language
function parseSpeedHighlightLanguage(language: string): ShjLanguage | null {
  // GPT prompt:
  // "write a switch statement to match all possible variants of markdown language to a ShjLanguage value (null if unknown). Eg both javascript and js should map to js"
  // for context, type ShjLanguage = ("asm" | "bash" | "bf" | "c" | "css" | "csv" | "diff" | "docker" | "git" | "go" | "html" | "http" | "ini" | "java" | "js" | "jsdoc" | "json" | "leanpub-md" | "log" | "lua" | "make" | "md" | "pl" | "plain" | "py" | "regex" | "rs" | "sql" | "todo" | "toml" | "ts" | "uri" | "xml" | "yaml")
  switch (language.toLowerCase()) {
    case "asm":
      return "asm";
    case "bash":
    case "sh":
    case "shell":
      return "bash";
    case "bf":
    case "brainfuck":
      return "bf";
    case "c":
      return "c";
    case "css":
      return "css";
    case "csv":
      return "csv";
    case "diff":
      return "diff";
    case "docker":
    case "dockerfile":
      return "docker";
    case "git":
      return "git";
    case "go":
    case "golang":
      return "go";
    case "html":
    case "xml":
      return "html";
    case "http":
      return "http";
    case "ini":
      return "ini";
    case "java":
      return "java";
    case "js":
    case "javascript":
    case "node":
    case "nodejs":
      return "js";
    case "jsdoc":
      return "jsdoc";
    case "json":
      return "json";
    case "leanpub-md":
      return "leanpub-md";
    case "log":
      return "log";
    case "lua":
      return "lua";
    case "make":
    case "makefile":
      return "make";
    case "md":
    case "markdown":
      return "md";
    case "pl":
    case "perl":
      return "pl";
    case "plain":
    case "plaintext":
    case "text":
      return "plain";
    case "py":
    case "python":
      return "py";
    case "regex":
    case "regexp":
      return "regex";
    case "rs":
    case "rust":
      return "rs";
    case "sql":
      return "sql";
    case "todo":
      return "todo";
    case "toml":
      return "toml";
    case "ts":
    case "typescript":
      return "ts";
    case "uri":
    case "url":
      return "uri";
    case "yaml":
    case "yml":
      return "yaml";
    default:
      return null;
  }
}
