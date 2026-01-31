import mammoth from "mammoth";
import { extractText as extractPdfText } from "unpdf";

export async function extractText(buffer: Buffer, fileType: string): Promise<string> {
  switch (fileType.toLowerCase()) {
    case "pdf":
      return await extractFromPdf(buffer);
    case "docx":
    case "doc":
      return await extractFromDocx(buffer);
    case "txt":
      return await extractFromTxt(buffer);
    case "html":
      return await extractFromHtml(buffer);
    case "md":
      return await extractFromMarkdown(buffer);
    default:
      throw new Error(`Unsupported file type: ${fileType}`);
  }
}

async function extractFromPdf(buffer: Buffer): Promise<string> {
  const arr = new Uint8Array(buffer);
  const data = await extractPdfText(arr);
  return Array.isArray(data.text) ? data.text.join(" ") : data.text;
}

async function extractFromDocx(buffer: Buffer): Promise<string> {
  const result = await mammoth.extractRawText({
    arrayBuffer: buffer.buffer.slice(
      buffer.byteOffset,
      buffer.byteOffset + buffer.byteLength,
    ) as ArrayBuffer,
  });
  return result.value;
}

async function extractFromTxt(buffer: Buffer): Promise<string> {
  return buffer.toString("utf-8");
}

async function extractFromHtml(buffer: Buffer): Promise<string> {
  const html = buffer.toString("utf-8");

  const content = html
    .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, "") // Remove script tags
    .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, "") // Remove style tags
    .replace(/<[^>]+>/g, "") // Remove all HTML tags
    .replace(/&nbsp;/g, " ") // Replace &nbsp; with space
    .replace(/&amp;/g, "&") // Replace &amp; with &
    .replace(/&lt;/g, "<") // Replace &lt; with <
    .replace(/&gt;/g, ">") // Replace &gt; with >
    .replace(/&quot;/g, '"') // Replace &quot; with "
    .replace(/&#39;/g, "'") // Replace &#39; with '
    .replace(/\s+/g, " ") // Normalize whitespace
    .trim();

  return content;
}

async function extractFromMarkdown(buffer: Buffer): Promise<string> {
  const content = buffer.toString("utf-8");

  // Simple markdown to text conversion
  // Remove markdown syntax but keep the text
  const plainText = content
    .replace(/^#+\s+/gm, "") // Remove headers
    .replace(/\*\*(.*?)\*\*/g, "$1") // Remove bold
    .replace(/\*(.*?)\*/g, "$1") // Remove italic
    .replace(/`(.*?)`/g, "$1") // Remove inline code
    .replace(/\[([^\]]+)\]\([^)]+\)/g, "$1") // Convert links to text
    .replace(/!\[([^\]]*)\]\([^)]+\)/g, "") // Remove images
    .replace(/^\s*[-*+]\s+/gm, "") // Remove list markers
    .replace(/^\s*\d+\.\s+/gm, "") // Remove numbered list markers
    .replace(/^\s*>\s+/gm, "") // Remove blockquotes
    .replace(/```[\s\S]*?```/g, "") // Remove code blocks
    .replace(/^\s*\|.*\|.*$/gm, "") // Remove tables
    .replace(/\n{3,}/g, "\n\n") // Normalize line breaks
    .trim();

  return plainText;
}

export function getFileType(fileName: string, mimeType?: string): string {
  const extension = fileName.split(".").pop()?.toLowerCase();

  if (extension) {
    return extension;
  }

  if (mimeType) {
    // Map common MIME types to file extensions
    const mimeToExtension: Record<string, string> = {
      "application/pdf": "pdf",
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document": "docx",
      "application/msword": "doc",
      "text/plain": "txt",
      "text/html": "html",
      "text/markdown": "md",
    };

    return mimeToExtension[mimeType] || "unknown";
  }

  return "unknown";
}

export function isSupportedFileType(fileType: string): boolean {
  const supportedTypes = ["pdf", "docx", "doc", "txt", "html", "md"];
  return supportedTypes.includes(fileType.toLowerCase());
}
