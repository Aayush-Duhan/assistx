import { invoke } from '../services/electron';

const MAX_SCREENSHOT_HEIGHT = 1080;
const SCREENSHOT_CONTENT_TYPE = 'image/webp';
const SCREENSHOT_QUALITY = 0.7;

type ScreenshotResult = {
  contentType: string;
  url: string;
};

type TryCaptureResult = {
  screenshot: ScreenshotResult | null;
  error: unknown;
};

export async function captureScreenshot(): Promise<ScreenshotResult> {
  const result1 = await tryCaptureScreenshot();
  if (result1.screenshot) return result1.screenshot;
  console.warn('First screenshot attempt failed, retrying...');
  await new Promise(resolve => setTimeout(resolve, 500));

  const result2 = await tryCaptureScreenshot();
  if (result2.screenshot) return result2.screenshot;
  console.warn('Second screenshot attempt failed, retrying...');
  await new Promise(resolve => setTimeout(resolve, 500));

  const result3 = await tryCaptureScreenshot();
  if (result3.screenshot) return result3.screenshot;

  console.warn('Third screenshot attempt failed.');
  throw result3.error;
}

async function tryCaptureScreenshot(): Promise<TryCaptureResult> {
  try {
    return { screenshot: await takeAndProcessScreenshot(), error: null };
  } catch (error) {
    return { screenshot: null, error };
  }
}

async function takeAndProcessScreenshot(): Promise<ScreenshotResult> {
  const { contentType, data } = await invoke('capture-screenshot', null);
  return processScreenshot(contentType, data);
}

function processScreenshot(contentType: string, data: ArrayBuffer): Promise<ScreenshotResult> {
  return new Promise((resolve, reject) => {
    const blob = new Blob([data], { type: contentType });
    const objectUrl = URL.createObjectURL(blob);
    const image = new Image();
    image.src = objectUrl;

    image.onload = () => {
      try {
        const canvas = document.createElement('canvas');
        const context = canvas.getContext('2d');
        if (!context) {
          throw new Error('Failed to get canvas context');
        }

        const scale = image.height > MAX_SCREENSHOT_HEIGHT 
          ? MAX_SCREENSHOT_HEIGHT / image.height 
          : 1;
          
        canvas.width = image.width * scale;
        canvas.height = image.height * scale;
        context.drawImage(image, 0, 0, canvas.width, canvas.height);

        const url = canvas.toDataURL(SCREENSHOT_CONTENT_TYPE, SCREENSHOT_QUALITY);
        resolve({ contentType: SCREENSHOT_CONTENT_TYPE, url });
      } catch (error) {
        reject(error);
      } finally {
        URL.revokeObjectURL(objectUrl);
      }
    };

    image.onerror = () => {
      URL.revokeObjectURL(objectUrl);
      reject(new Error('Failed to load image from screenshot data'));
    };
  });
}