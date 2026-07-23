import { app } from "electron";
import { IS_DEV } from "@/shared/constants";
import type { VersionInfo } from "@/shared/updateStatus";

/** Runtime version details for About / General UI. */
export function getVersionInfo(): VersionInfo {
  return {
    version: app.getVersion(),
    electron: process.versions.electron,
    node: process.versions.node,
    platform: process.platform,
    arch: process.arch,
    isPackaged: app.isPackaged,
    isDev: IS_DEV,
  };
}
