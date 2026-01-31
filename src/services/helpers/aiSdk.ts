import { ModelMessage } from "ai";

export function extractAttachmentUrl(message: ModelMessage): string | null {
  if (message.role !== "user" || !Array.isArray(message.content)) {
    return null;
  }

  for (const part of message.content) {
    if (part.type === "file" && typeof part.data === "string") {
      return part.data;
    }
    if (part.type === "image" && typeof part.image === "string") {
      return part.image;
    }
  }

  return null;
}
