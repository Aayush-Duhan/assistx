/**
 * TipTap Mention Processor
 * Processes TipTap rich text content with variable references
 */

import type { TipTapMentionJsonContent, OutputSchemaSourceKey } from "../types";

/**
 * Process TipTap mention content into a plain string
 * Resolves variable references using the provided resolver function
 */
export function processTipTapMentions(
  content: TipTapMentionJsonContent,
  resolveReference: (ref: OutputSchemaSourceKey) => unknown,
): string {
  if (!content || !content.content) {
    return "";
  }

  const parts: string[] = [];

  for (const block of content.content) {
    if (block.type === "paragraph" && block.content) {
      for (const node of block.content) {
        if (node.type === "text" && node.text) {
          parts.push(node.text);
        } else if (node.type === "mention" && node.attrs) {
          // Handle variable mentions
          const attrs = node.attrs as Record<string, unknown>;
          const nodeId = attrs.id as string;
          const label = attrs.label as string;

          if (nodeId) {
            // Parse the path from the label (e.g., "nodeId:field.subfield")
            const pathStr = typeof label === "string" ? label.split(":")[1] : undefined;
            const path = pathStr ? pathStr.split(".") : [];

            const value = resolveReference({ nodeId, path });

            // Convert value to string
            if (value === null || value === undefined) {
              parts.push("");
            } else if (typeof value === "object") {
              parts.push(JSON.stringify(value));
            } else {
              parts.push(String(value));
            }
          }
        }
      }
    } else if (block.type === "hardBreak") {
      parts.push("\n");
    }
  }

  return parts.join("");
}

/**
 * Extract all variable references from TipTap content
 */
export function extractMentionRefs(content: TipTapMentionJsonContent): OutputSchemaSourceKey[] {
  const refs: OutputSchemaSourceKey[] = [];

  if (!content || !content.content) {
    return refs;
  }

  for (const block of content.content) {
    if (block.type === "paragraph" && block.content) {
      for (const node of block.content) {
        if (node.type === "mention" && node.attrs) {
          const attrs = node.attrs as Record<string, unknown>;
          const nodeId = attrs.id as string;
          const label = attrs.label as string;

          if (nodeId) {
            const pathStr = typeof label === "string" ? label.split(":")[1] : undefined;
            const path = pathStr ? pathStr.split(".") : [];
            refs.push({ nodeId, path });
          }
        }
      }
    }
  }

  return refs;
}
