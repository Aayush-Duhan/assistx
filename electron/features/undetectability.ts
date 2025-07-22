import { app } from 'electron';
import { join } from 'node:path';
import { existsSync, writeFileSync, unlinkSync } from 'node:fs';
import { windowManager } from '../windows/WindowManager';

const UNDETECTABILITY_ENABLED_PATH = join(app.getPath('userData'), 'undetectability.enabled');

let undetectabilityEnabled = existsSync(UNDETECTABILITY_ENABLED_PATH);

export function isUndetectabilityEnabled(): boolean {
  return undetectabilityEnabled;
}

export function toggleUndetectability(): void {
    if (isUndetectabilityEnabled()) {
        disableUndetectability();
    } else {
        enableUndetectability();
    }
}

function enableUndetectability(): void {
  writeFileSync(UNDETECTABILITY_ENABLED_PATH, '');
  undetectabilityEnabled = true;
  windowManager.createOrRecreateWindow();
}

function disableUndetectability(): void {
  try {
    unlinkSync(UNDETECTABILITY_ENABLED_PATH);
  } catch {
    // Ignore if the file doesn't exist       
  }
  undetectabilityEnabled = false;
  windowManager.createOrRecreateWindow();
}