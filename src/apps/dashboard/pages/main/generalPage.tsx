import { useCallback, useEffect, useState } from "react";
import { LuRefreshCw, LuDownload, LuCircleCheck, LuCircleAlert } from "react-icons/lu";
import { invokeIpcMain, sendToIpcMain } from "@/shared/ipc";
import type { VersionInfo } from "@/shared/updateStatus";
import { useUpdateStatus } from "@/hooks/useUpdateStatus";
import { GITHUB_RELEASES_URL } from "@/lib/constants";
import { cn } from "@/lib/utils";

function formatBytes(bytes: number): string {
  if (!Number.isFinite(bytes) || bytes <= 0) return "0 B";
  const units = ["B", "KB", "MB", "GB"];
  const i = Math.min(Math.floor(Math.log(bytes) / Math.log(1024)), units.length - 1);
  return `${(bytes / 1024 ** i).toFixed(i === 0 ? 0 : 1)} ${units[i]}`;
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-4 py-2 border-b border-zinc-800/80 last:border-0">
      <span className="text-sm text-zinc-500">{label}</span>
      <span className="text-sm text-zinc-200 font-medium tabular-nums">{value}</span>
    </div>
  );
}

const GeneralPage = () => {
  const updateStatus = useUpdateStatus();
  const [versionInfo, setVersionInfo] = useState<VersionInfo | null>(null);
  const [isChecking, setIsChecking] = useState(false);
  const [manualMessage, setManualMessage] = useState<string | null>(null);

  useEffect(() => {
    void invokeIpcMain("get-version-info", null)
      .then(setVersionInfo)
      .catch((err) => {
        console.error("[GeneralPage] Failed to load version info:", err);
      });
  }, []);

  const handleCheckForUpdates = useCallback(async () => {
    setIsChecking(true);
    setManualMessage(null);
    try {
      const result = await invokeIpcMain("check-for-updates", null);
      if (result === "none") {
        setManualMessage("You're on the latest version.");
      } else if (result === "failed") {
        setManualMessage("Update check failed. Check your network and try again.");
      } else {
        setManualMessage("A newer version is available.");
      }
    } catch (err) {
      console.error("[GeneralPage] check-for-updates failed:", err);
      setManualMessage("Update check failed. Check your network and try again.");
    } finally {
      setIsChecking(false);
    }
  }, []);

  const handleInstall = useCallback(() => {
    sendToIpcMain("install-update", null);
  }, []);

  const checking = isChecking || updateStatus.state === "checking";
  const downloadPercent =
    updateStatus.state === "downloading" ? Math.min(100, Math.round(updateStatus.percent)) : 0;

  return (
    <div className="max-w-2xl space-y-8">
      <div>
        <h1 className="text-xl font-semibold text-zinc-100">General</h1>
        <p className="mt-1 text-sm text-zinc-500">App version and updates</p>
      </div>

      {/* About */}
      <section className="rounded-xl border border-zinc-800 bg-zinc-900/40 p-5">
        <h2 className="text-sm font-medium text-zinc-300 mb-3">About</h2>
        <div className="space-y-0">
          <InfoRow label="Version" value={versionInfo?.version ?? "—"} />
          <InfoRow label="Electron" value={versionInfo?.electron ?? "—"} />
          <InfoRow label="Node.js" value={versionInfo?.node ?? "—"} />
          <InfoRow
            label="Platform"
            value={
              versionInfo
                ? `${versionInfo.platform} (${versionInfo.arch})${versionInfo.isPackaged ? "" : " · dev"}`
                : "—"
            }
          />
        </div>
      </section>

      {/* Updates */}
      <section className="rounded-xl border border-zinc-800 bg-zinc-900/40 p-5 space-y-4">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2 className="text-sm font-medium text-zinc-300">Updates</h2>
            <p className="mt-1 text-xs text-zinc-500">
              Updates are checked automatically when the app is packaged. You can also check
              manually.
            </p>
          </div>
          <button
            type="button"
            onClick={handleCheckForUpdates}
            disabled={checking || updateStatus.state === "downloading"}
            className={cn(
              "inline-flex items-center gap-2 rounded-lg border border-zinc-700 bg-zinc-800/80 px-3 py-1.5",
              "text-xs font-medium text-zinc-200 transition hover:bg-zinc-700/80",
              "disabled:opacity-50 disabled:cursor-not-allowed",
            )}
          >
            <LuRefreshCw className={cn("size-3.5", checking && "animate-spin")} />
            {checking ? "Checking…" : "Check for updates"}
          </button>
        </div>

        {/* Status */}
        <div className="rounded-lg border border-zinc-800/80 bg-zinc-950/50 px-4 py-3 space-y-3">
          {updateStatus.state === "idle" && (
            <StatusLine
              icon={<LuCircleCheck className="size-4 text-zinc-500" />}
              text={manualMessage ?? "No update in progress."}
            />
          )}

          {updateStatus.state === "checking" && (
            <StatusLine
              icon={<LuRefreshCw className="size-4 text-sky-400 animate-spin" />}
              text="Checking for updates…"
            />
          )}

          {updateStatus.state === "available" && (
            <StatusLine
              icon={<LuDownload className="size-4 text-sky-400" />}
              text={`Version ${updateStatus.version} is available. Download starting…`}
              warn={updateStatus.isBelowWarningThreshold}
            />
          )}

          {updateStatus.state === "downloading" && (
            <div className="space-y-2">
              <StatusLine
                icon={<LuDownload className="size-4 text-sky-400" />}
                text={`Downloading ${updateStatus.version}… ${downloadPercent}%`}
              />
              <div className="h-1.5 w-full overflow-hidden rounded-full bg-zinc-800">
                <div
                  className="h-full rounded-full bg-sky-500 transition-[width] duration-300"
                  style={{ width: `${downloadPercent}%` }}
                />
              </div>
              <p className="text-xs text-zinc-500 tabular-nums">
                {formatBytes(updateStatus.transferred)} / {formatBytes(updateStatus.total)}
              </p>
            </div>
          )}

          {updateStatus.state === "downloaded" && (
            <div className="space-y-3">
              <StatusLine
                icon={<LuCircleCheck className="size-4 text-emerald-400" />}
                text={`Version ${updateStatus.version} is ready to install.`}
                warn={updateStatus.isBelowWarningThreshold}
              />
              <button
                type="button"
                onClick={handleInstall}
                className={cn(
                  "inline-flex items-center gap-2 rounded-lg bg-sky-600 px-3 py-1.5",
                  "text-xs font-medium text-white transition hover:bg-sky-500",
                )}
              >
                Restart to update
              </button>
            </div>
          )}

          {updateStatus.state === "error" && (
            <StatusLine
              icon={<LuCircleAlert className="size-4 text-red-400" />}
              text={updateStatus.message || "Update error"}
              error
            />
          )}

          {manualMessage && updateStatus.state !== "idle" && updateStatus.state !== "error" && (
            <p className="text-xs text-zinc-500">{manualMessage}</p>
          )}
        </div>

        <a
          href={GITHUB_RELEASES_URL}
          target="_blank"
          rel="noreferrer"
          className="inline-block text-xs text-zinc-500 hover:text-zinc-300 transition"
        >
          View releases on GitHub →
        </a>
      </section>
    </div>
  );
};

function StatusLine({
  icon,
  text,
  warn,
  error,
}: {
  icon: React.ReactNode;
  text: string;
  warn?: boolean;
  error?: boolean;
}) {
  return (
    <div className="flex items-start gap-2.5">
      <span className="mt-0.5 shrink-0">{icon}</span>
      <p
        className={cn(
          "text-sm leading-snug",
          error ? "text-red-300" : warn ? "text-amber-300" : "text-zinc-300",
        )}
      >
        {text}
        {warn && !error ? " This version is below the recommended minimum." : null}
      </p>
    </div>
  );
}

export default GeneralPage;
