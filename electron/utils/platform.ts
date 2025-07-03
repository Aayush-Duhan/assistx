export const isMac: boolean = process.platform === 'darwin';
export const isWindows: boolean = process.platform === 'win32';
export const isDevelopment: boolean = process.env.NODE_ENV === 'development';