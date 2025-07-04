// --- Constants ---

/**
 * The maximum height for a screenshot. Images taller than this will be scaled down
 * while preserving their aspect ratio. This helps manage the size of the data
 * sent to the AI model and reduces processing time.
 */
const MAX_HEIGHT = 1080;

/**
 * The content type for the final, processed screenshot. WebP is used for its
 * excellent balance of quality and compression.
 */
const FINAL_CONTENT_TYPE = 'image/webp';

/**
 * The quality setting for the final WebP image, ranging from 0.0 (lowest) to 1.0 (highest).
 * 0.7 is a good default for balancing quality and file size.
 */
const FINAL_IMAGE_QUALITY = 0.7;

// Type definitions
export interface ScreenshotData {
    contentType: string;
    url: string;
}

interface RawScreenshotData {
    contentType: string;
    data: Buffer;
}

type ScreenshotResolver = (result: ScreenshotData | null) => void;

/**
 * A queue of resolver functions for pending screenshot requests.
 * This handles cases where multiple requests might be made before one completes,
 * ensuring all callers get the result of the single capture operation.
 */
let screenshotResolverQueue: ScreenshotResolver[] = [];

/**
 * Listens for the 'new-screenshot' event from the main process.
 * When a screenshot is received, it processes the image and resolves the
 * promises for all pending requests.
 */
if (typeof window !== 'undefined' && window.electron.ipcRenderer) {
    window.electron.ipcRenderer.on('new-screenshot', async (_event: any, { contentType, data }: RawScreenshotData) => {
        try {
            // Process the raw image data (resize, convert to WebP).
            const processedImage = await processScreenshot(contentType, data);
            
            // Resolve all pending promises with the processed image data.
            for (const resolve of screenshotResolverQueue) {
                resolve(processedImage);
            }
        } catch (error) {
            console.error("Failed to process screenshot:", error);
            // Reject all pending promises if an error occurs.
            for (const resolve of screenshotResolverQueue) {
                // Resolve with null to avoid unhandled promise rejections in the calling code.
                resolve(null); 
            }
        } finally {
            // Clear the queue after processing is complete (or has failed).
            screenshotResolverQueue = [];
        }
    });
}

/**
 * Initiates a screen capture and returns a promise that resolves with the
 * processed screenshot data (a data URL).
 *
 * @returns A promise resolving with the screenshot data or null on error.
 */
export async function captureScreenshot(): Promise<ScreenshotData | null> {
    // Tell the main process to start capturing the screen.
    if (window.electron.ipcRenderer) {
        window.electron.ipcRenderer.send('capture-screenshot', null);
    }

    // Return a new promise and add its resolver to the queue. The promise will
    // be resolved when the 'new-screenshot' listener above receives the data.
    return new Promise<ScreenshotData | null>(resolve => {
        screenshotResolverQueue.push(resolve);
    });
}

/**
 * Processes the raw screenshot data received from the main process. It loads the image,
 * resizes it if necessary, and converts it to the final format (WebP).
 *
 * @param contentType - The MIME type of the raw image data (e.g., 'image/png').
 * @param data - The raw image data as a buffer.
 * @returns A promise that resolves with the processed image data.
 */
function processScreenshot(contentType: string, data: Buffer): Promise<ScreenshotData> {
    return new Promise<ScreenshotData>((resolve, reject) => {
        // 1. Create a Blob from the raw data and create an object URL for it.
        //    This is necessary to load the image data into an HTMLImageElement.
        const blob = new Blob([data], { type: contentType });
        const objectUrl = URL.createObjectURL(blob);

        // 2. Load the blob into an Image element to get its dimensions.
        const image = new Image();
        image.src = objectUrl;

        image.onload = () => {
            const canvas = document.createElement('canvas');
            const context = canvas.getContext('2d');

            if (!context) {
                URL.revokeObjectURL(objectUrl);
                return reject(new Error('Failed to get canvas context'));
            }

            // 3. Calculate the new dimensions, scaling down if the height exceeds MAX_HEIGHT.
            const scaleFactor = image.height > MAX_HEIGHT ? MAX_HEIGHT / image.height : 1;
            canvas.width = image.width * scaleFactor;
            canvas.height = image.height * scaleFactor;

            // 4. Draw the (potentially resized) image onto the canvas.
            context.drawImage(image, 0, 0, canvas.width, canvas.height);

            // 5. Clean up the object URL as it's no longer needed.
            URL.revokeObjectURL(objectUrl);

            // 6. Convert the canvas content to a data URL in the final format and quality.
            //    This string can be directly used in an `<img>` src or sent to an API.
            resolve({
                contentType: FINAL_CONTENT_TYPE,
                url: canvas.toDataURL(FINAL_CONTENT_TYPE, FINAL_IMAGE_QUALITY)
            });
        };

        image.onerror = (error) => {
            URL.revokeObjectURL(objectUrl);
            reject(error);
        };
    });
}
 