import React, { useMemo } from "react";
import { createContext, useContext } from "react";
import { useService } from "@/hooks/useService";
// Import all the service classes
import { AudioCaptureService } from "./AudioCaptureService";
import { ContextService } from "./ContextService";
import { AiResponsesService } from "./AiResponseService";
import { IS_DEV } from "@/shared/constants";

// Type definitions
interface GlobalServices {
  micAudioCaptureService: AudioCaptureService;
  systemAudioCaptureService: AudioCaptureService;
  contextService: ContextService;
  aiResponsesService: AiResponsesService;
}

/**
 * React Context to provide global services to the entire application.
 */
const GlobalServicesContext = createContext<GlobalServices | null>(null);

/**
 * Hook to access global services from any component within the provider.
 */
export function useGlobalServices(): GlobalServices {
  const services = useContext(GlobalServicesContext);
  if (!services) {
    throw new Error("useGlobalServices must be used within a GlobalServicesContextProvider");
  }
  return services;
}

export function useMaybeGlobalServices(): Partial<GlobalServices> {
  return useContext(GlobalServicesContext) ?? {};
}

/**
 * This provider initializes all the core application services and makes them
 * available to its children via React Context.
 *
 * Uses Deepgram for real-time transcription of both mic and system audio.
 */
export function GlobalServicesContextProvider({
  children,
}: {
  children: React.ReactNode;
}): React.ReactElement {
  // Create audio capture services with Deepgram transcription
  const micAudioCaptureService = useService(() => new AudioCaptureService("mic"), []);
  const systemAudioCaptureService = useService(() => new AudioCaptureService("system"), []);

  const contextService = useService(
    () => new ContextService({ micAudioCaptureService, systemAudioCaptureService }),
    [micAudioCaptureService, systemAudioCaptureService],
  );

  const aiResponsesService = useService(
    () => new AiResponsesService(contextService),
    [contextService],
  );

  // The value provided to the context contains all the service instances.
  const services = useMemo<GlobalServices>(
    () => ({
      micAudioCaptureService,
      systemAudioCaptureService,
      contextService,
      aiResponsesService,
    }),
    [micAudioCaptureService, systemAudioCaptureService, contextService, aiResponsesService],
  );

  if (IS_DEV) {
    // defines window.screenCaptureService, window.micAudioCaptureService, etc.
    Object.assign(window, services);
  }

  return <GlobalServicesContext value={services}>{children}</GlobalServicesContext>;
}
