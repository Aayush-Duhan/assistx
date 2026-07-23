import { useState, useEffect } from "react";
import { addIpcRendererHandler, invokeIpcMain } from "@/shared/ipc";
import type { UpdateStatus } from "@/shared/updateStatus";

const IDLE_STATUS: UpdateStatus = { state: "idle" };

/**
 * Hydrates main-owned update status and subscribes to live changes.
 * Safe before hydrate completes (defaults to idle).
 */
export function useUpdateStatus(): UpdateStatus {
  const [status, setStatus] = useState<UpdateStatus>(IDLE_STATUS);

  useEffect(() => {
    let disposed = false;

    void invokeIpcMain("get-update-status", null)
      .then((result) => {
        if (!disposed) setStatus(result);
      })
      .catch((err) => {
        console.error("[useUpdateStatus] Failed to fetch update status:", err);
      });

    const dispose = addIpcRendererHandler("update-status-changed", (next) => {
      setStatus(next);
    });

    return () => {
      disposed = true;
      dispose();
    };
  }, []);

  return status;
}
