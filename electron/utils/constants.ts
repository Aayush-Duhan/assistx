import os from 'node:os';
import { isMac } from './platform';

export function isWindows10OrGreater(): boolean {
    if (process.platform !== 'win32') return false;
    try {
        return os.version().includes('Windows 10');
    } catch (error) {
        return false;
    }
}

export const APP_NAME = 'AssistX';

export function isMacOsSequoia(): boolean {
    return isMac && parseFloat(os.release()) === 25;
}

export const MIN_MACOS_VERSION = 14;
export const RENDERER_VERSION = '1.0.0';

export const DASHBOARD_PARAM_KEY = 'isDashboard';

export const IS_INTEL_MAC = isMac && process.arch === "x64";

export const PACKAGE_INFO = {
    name: APP_NAME,
    version: '1.0.0',
}