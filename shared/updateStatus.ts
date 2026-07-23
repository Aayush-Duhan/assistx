import z from "zod";

/**
 * Main-owned auto-update lifecycle status.
 * Not part of SharedState — broadcast via `update-status-changed` IPC.
 */
export const updateStatusSchema = z.union([
  z.object({ state: z.literal("idle") }),
  z.object({ state: z.literal("checking") }),
  z.object({
    state: z.literal("available"),
    version: z.string(),
    isBelowWarningThreshold: z.boolean(),
  }),
  z.object({
    state: z.literal("downloading"),
    version: z.string(),
    percent: z.number(),
    transferred: z.number(),
    total: z.number(),
  }),
  z.object({
    state: z.literal("downloaded"),
    version: z.string(),
    isBelowWarningThreshold: z.boolean(),
  }),
  z.object({
    state: z.literal("error"),
    message: z.string(),
    version: z.string().optional(),
  }),
]);

export type UpdateStatus = z.infer<typeof updateStatusSchema>;

export const versionInfoSchema = z.object({
  version: z.string(),
  electron: z.string(),
  node: z.string(),
  platform: z.string(),
  arch: z.string(),
  isPackaged: z.boolean(),
  isDev: z.boolean(),
});

export type VersionInfo = z.infer<typeof versionInfoSchema>;

/**
 * Compare semantic version strings (MAJOR.MINOR.PATCH).
 * Strips pre-release (`-…`) and build metadata (`+…`) before comparing.
 * Returns: 1 if a > b, -1 if a < b, 0 if equal.
 */
function normalizeVersion(v: string): number[] {
  return v
    .replace(/^v/i, "")
    .split("-")[0]
    .split("+")[0]
    .split(".")
    .map((part) => {
      const n = parseInt(part, 10);
      return Number.isFinite(n) ? n : 0;
    });
}

export function compareVersions(a: string, b: string): number {
  const partsA = normalizeVersion(a);
  const partsB = normalizeVersion(b);

  for (let i = 0; i < Math.max(partsA.length, partsB.length); i++) {
    const numA = partsA[i] ?? 0;
    const numB = partsB[i] ?? 0;

    if (numA > numB) return 1;
    if (numA < numB) return -1;
  }

  return 0;
}
