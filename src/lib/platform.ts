export const isMac = window.electron.process.platform === "darwin";
export const isWin = window.electron.process.platform === "win32";

export const isDevelopment = window.electron.process.env.NODE_ENV === "development";
