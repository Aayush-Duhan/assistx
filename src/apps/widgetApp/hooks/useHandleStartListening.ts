import { useIpcRendererHandler } from "@/shared";
import { useGlobalServices } from "@/services/GlobalServicesContextProvider";

export function useHandleStartListening() {
  const { contextService } = useGlobalServices();

  useIpcRendererHandler("broadcast-to-all-windows", (payload) => {
    if (payload.command === "start-listening") {
      contextService.restartAudio();
    }

    if (payload.command === "stop-listening") {
      contextService.stopAudio();
    }

    if (payload.command === "resume-session") {
      contextService.restartAudio();
    }
  });
}
