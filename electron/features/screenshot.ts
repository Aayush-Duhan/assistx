import { desktopCapturer } from "electron";
import { Buffer } from "node:buffer";
import { IS_MAC } from "@/shared/constants";
import { windowManager } from "../windows/WindowManager";
import { loadOnboardingState } from "../utils/utils";
import { updateSharedState } from "../utils/shared/stateManager";

/**
 * Reset onboarding state
 */
function resetOnboarding(): void {
  updateSharedState({
    onboardingState: {
      ...loadOnboardingState(),
      completed: false,
    },
  });
}

interface Screenshot {
  data: Buffer;
  contentType: "image/png";
}

/**
 * Captures a screenshot of the entire desktop using Electron's desktopCapturer.
 * This avoids the __dirname issue with the screenshot-desktop library.
 */
export async function captureScreenshot(): Promise<Screenshot> {
  const currentDisplay = windowManager.getTargetDisplay();
  try {
    const sources = await desktopCapturer.getSources({
      types: ["screen"],
      thumbnailSize: {
        width: currentDisplay.bounds.width,
        height: currentDisplay.bounds.height,
      },
    });

    const source = sources.find((s) => s.display_id === currentDisplay.id.toString());
    if (!source) {
      throw new Error("Unable to capture screenshot: no display source found");
    }
    return { data: source.thumbnail.toPNG(), contentType: "image/png" };
  } catch (error) {
    if (IS_MAC) {
      resetOnboarding();
    }
    throw error;
  }
}
