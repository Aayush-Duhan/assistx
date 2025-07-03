import { existsSync, unlinkSync, writeFileSync } from 'node:fs';
import { join as joinPath } from 'node:path';
import { app } from 'electron';
import { windowManager } from './windows/WindowManager';

const onboardingDoneFilePath = joinPath(app.getPath('userData'), 'onboarding.done');

let hasOnboardedState: boolean = existsSync(onboardingDoneFilePath);

/**
 * Checks if the user has completed the onboarding process.
 */
export function getHasOnboarded(): boolean {
  return hasOnboardedState;
}

/**
 * Marks the onboarding process as complete and recreates the window.
 */
export function setOnboarded(): void {
  writeFileSync(onboardingDoneFilePath, '');
  hasOnboardedState = true;
  windowManager.recreateWindow();
}

export function resetOnboarding() {
  try {
    unlinkSync(onboardingDoneFilePath);
  } catch {
    // Ignore errors if the file doesn't exist
  }
  hasOnboardedState = false;
  windowManager.recreateWindow();
}