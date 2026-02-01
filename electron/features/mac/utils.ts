import { app } from "electron";
import { join } from "node:path";
import { ChildProcess, spawn } from "node:child_process";
import { IS_DEV } from "@/shared/constants";

const MACOS_MIN_VERSION = 13; // Ventura

export async function checkMacOsVersion(): Promise<{ isSupported: boolean }> {
  const swVersProc = spawn("sw_vers", ["-productVersion"]);
  const { stdout } = await getChildProcessOutput(swVersProc, "sw_vers");
  const majorVersion = Number.parseInt(stdout.split(".")[0] ?? "", 10);
  return { isSupported: !Number.isNaN(majorVersion) && majorVersion >= MACOS_MIN_VERSION };
}

const MAC_EXTRA_RESOURCES_PATH = join(
  IS_DEV ? app.getAppPath() : process.resourcesPath,
  "macExtraResources",
);

export function getMacExtraResourcePath(fileName: string): string {
  return join(MAC_EXTRA_RESOURCES_PATH, fileName);
}

export async function getChildProcessOutput(
  process: ChildProcess,
  processName: string,
): Promise<{ stdout: string }> {
  return await new Promise((resolve, reject) => {
    let stdout = "";
    process.stdout?.on("data", (data: Buffer) => {
      stdout += data.toString();
    });
    process.stderr?.on("data", (data: Buffer) => {
      console.error(`[${processName}] stderr: ${data}`);
    });
    process.on("close", (code: number | null) => {
      if (code !== 0) {
        console.error(`[${processName}] process exited with code ${code}`);
        reject(new Error(`Process exited with code ${code}`));
      } else {
        resolve({ stdout });
      }
    });
    process.on("error", (err: Error) => {
      console.error(`[${processName}] process error: ${err}`);
      reject(err);
    });
  });
}
