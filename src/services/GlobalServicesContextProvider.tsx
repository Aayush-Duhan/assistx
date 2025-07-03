import React, { useMemo } from 'react';
import { createContext, useContext } from 'react';

// Import all the service classes
import { AudioCaptureService } from './AudioCaptureService';
import { ContextService } from './ContextService';
import { AiResponsesService } from './AiResponseService';

// Type definitions
interface GlobalServices {
    micAudioCaptureService: AudioCaptureService;
    systemAudioCaptureService: AudioCaptureService;
    contextService: ContextService;
    aiResponsesService: AiResponsesService;
}

// Create the context
const GlobalServicesContext = createContext<GlobalServices | null>(null);

/**
 * A hook to easily access the global services from any component.
 */
export function useGlobalServices(): GlobalServices {
    const context = useContext(GlobalServicesContext);
    if (!context) {
        throw new Error("useGlobalServices must be used within a GlobalServicesContextProvider");
    }
    return context;
}

/**
 * This provider initializes all the core application services and makes them
 * available to its children via React Context.
 * 
 * Note: For open source version, PostHog dependencies have been removed.
 */
export function GlobalServicesContextProvider({ children }: { children: React.ReactNode }): React.ReactElement {
    const micAudioCaptureService = useMemo(() => new AudioCaptureService('mic'), []);
    const systemAudioCaptureService = useMemo(() => new AudioCaptureService('system'), []);

    const contextService = useMemo(
    () => new ContextService({ micAudioCaptureService, systemAudioCaptureService }),
    [micAudioCaptureService, systemAudioCaptureService]
  );

    const aiResponsesService = useMemo(
        () => new AiResponsesService(contextService),
        [contextService]
    );

    // The value provided to the context contains all the service instances.
    const services = useMemo(() => ({
        micAudioCaptureService,
        systemAudioCaptureService,
        contextService,
        aiResponsesService,
      }), [
        micAudioCaptureService,
        systemAudioCaptureService,
        contextService,
        aiResponsesService,
      ]);

    // Expose services to the window for easy debugging in development mode.
    if (process.env.NODE_ENV === 'development') {
        Object.assign(window, services);
    }

    return (
        <GlobalServicesContext.Provider value={services}>
          {children}
        </GlobalServicesContext.Provider>
      );
}