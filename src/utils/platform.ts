/**
 * Platform detection utilities using IPC communication
 */

let cachedPlatform: string | null = null;
import { electron } from '@/services/electron';
/**
 * Get the current platform via IPC
 * Results are cached after the first call for performance
 */
export async function getPlatform(): Promise<string> {
  if (cachedPlatform) {
    return cachedPlatform;
  }
  
  try {
    const platform = await electron.getPlatform();
    cachedPlatform = platform;
    return platform;
  } catch (error) {
    console.error('Failed to get platform:', error);
    cachedPlatform = 'unknown';
    return 'unknown';
  }
}

/**
 * Check if the current platform is macOS
 */
export async function isMac(): Promise<boolean> {
  const platform = await getPlatform();
  return platform === 'darwin';
}

/**
 * Check if the current platform is Windows
 */
export async function isWindows(): Promise<boolean> {
  const platform = await getPlatform();
  return platform === 'win32';
}

/**
 * Check if the current platform is Linux
 */
export async function isLinux(): Promise<boolean> {
  const platform = await getPlatform();
  return platform === 'linux';
}

/**
 * Synchronous platform detection for cases where async is not possible
 * This should be used sparingly and only after getPlatform() has been called at least once
 */
export function getPlatformSync(): string {
  if (cachedPlatform) {
    return cachedPlatform;
  }
  
  try {
    const platform = navigator.platform.toLowerCase();
    if (platform.includes('mac')) {
      cachedPlatform = 'darwin';
      return 'darwin';
    } else if (platform.includes('win')) {
      cachedPlatform = 'win32';
      return 'win32';
    } else if (platform.includes('linux')) {
      cachedPlatform = 'linux';
      return 'linux';
    }
  } catch (error) {
    console.error('Failed to get platform synchronously:', error);
  }
  
  cachedPlatform = 'unknown';
  return 'unknown';
}

/**
 * Synchronous macOS check
 */
export function isMacSync(): boolean {
  return getPlatformSync() === 'darwin';
}

/**
 * Synchronous Windows check
 */
export function isWindowsSync(): boolean {
  return getPlatformSync() === 'win32';
}

/**
 * Synchronous Linux check
 */
export function isLinuxSync(): boolean {
  return getPlatformSync() === 'linux';
} 