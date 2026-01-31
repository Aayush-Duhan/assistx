import { invokeIpcMain } from "@/shared";
import type { Buffer } from "buffer";

const MAX_SCREENSHOT_HEIGHT = 1080;
const SCREENSHOT_CONTENT_TYPE = "image/webp";
const SCREENSHOT_QUALITY = 0.7;
const SCREENSHOT_RETRIES = 3;

export type Screenshot = {
  contentType: string;
  url: string;
};

export async function captureScreenshotWithRetry(): Promise<Screenshot> {
  let error: unknown;
  for (let i = 0; i < SCREENSHOT_RETRIES; i++) {
    try {
      const { contentType, data } = await invokeIpcMain("capture-screenshot", null);
      return await scaleAndCompressScreenshot(contentType, data);
    } catch (err) {
      console.warn(`Screenshot attempt #${i} failed, retrying...`);
      error = err;
    }
  }
  throw error;
}

function scaleAndCompressScreenshot(contentType: string, data: Buffer) {
  return new Promise<Screenshot>((resolve, reject) => {
    const blob = new Blob([data as Buffer<ArrayBuffer>], { type: contentType });
    const url = URL.createObjectURL(blob);

    const img = new Image();
    img.src = url;

    img.addEventListener("load", () => {
      const canvas = document.createElement("canvas");
      const context = canvas.getContext("2d");

      if (!context) {
        URL.revokeObjectURL(url);
        reject(new Error("Failed to get canvas context"));
        return;
      }

      const scale = img.height > MAX_SCREENSHOT_HEIGHT ? MAX_SCREENSHOT_HEIGHT / img.height : 1;
      canvas.width = img.width * scale;
      canvas.height = img.height * scale;

      context.drawImage(img, 0, 0, canvas.width, canvas.height);
      URL.revokeObjectURL(url);

      resolve({
        contentType: SCREENSHOT_CONTENT_TYPE,
        url: canvas.toDataURL(SCREENSHOT_CONTENT_TYPE, SCREENSHOT_QUALITY),
      });
    });

    img.addEventListener("error", (error) => {
      URL.revokeObjectURL(url);
      reject(error);
    });
  });
}
