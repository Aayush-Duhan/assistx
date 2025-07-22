import { existsSync, unlinkSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { app } from 'electron';
import { windowManager } from './windows/WindowManager';

const ONBOARDING_DONE_PATH = join(app.getPath('userData'), 'onboarding.done');

let onboardingDone = existsSync(ONBOARDING_DONE_PATH);

/**
 * Checks if the user has completed the onboarding process.
 */
export function getOnboardingStatus(): boolean {
  return onboardingDone;
}

/**
 * Marks the onboarding process as complete and recreates the window.
 */
export function finishOnboarding(): void {
  writeFileSync(ONBOARDING_DONE_PATH, '');
  onboardingDone = true;
  windowManager.createOrRecreateWindow({ finishedOnboarding: true });
}

export function resetOnboarding(): void {
  try {
    unlinkSync(ONBOARDING_DONE_PATH);
  } catch {
    // Ignore errors if the file doesn't exist
  }
  onboardingDone = false;
  windowManager.createOrRecreateWindow();
}