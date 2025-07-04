import React, { useMemo } from 'react';
import { createContext, useContext } from 'react';

// Import all the service classes
import { AudioCaptureService } from './AudioCaptureService';
import { ContextService } from './ContextService';
import { AiResponsesService } from './AiResponseService';
import { LiveInsightsService } from './LiveInsightsService';
import { conversationHistoryStore } from '../stores/conversationHistoryStore';
import { contextSearchService } from './ContextSearchService';
import '../stores/conversationHistoryStore.test'; // Import test for development console access
import './ContextSearchService.test'; // Import search test for development console access

// Type definitions
interface GlobalServices {
    micAudioCaptureService: AudioCaptureService;
    systemAudioCaptureService: AudioCaptureService;
    contextService: ContextService;
    aiResponsesService: AiResponsesService;
    liveInsightsService: LiveInsightsService;
    conversationHistoryStore: typeof conversationHistoryStore;
    contextSearchService: typeof contextSearchService;
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
        throw new Error('useGlobalServices must be used within a GlobalServicesContextProvider');
    }
    return services;
}

/**
 * This provider initializes all the core application services and makes them
 * available to its children via React Context.
 * 
 * Uses Deepgram for real-time transcription of both mic and system audio.
 */
export function GlobalServicesContextProvider({ children }: { children: React.ReactNode }): React.ReactElement {
    // Create audio capture services with Deepgram transcription
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

    const liveInsightsService = useMemo(
        () => new LiveInsightsService(contextService),
        [contextService]
    );

    // The value provided to the context contains all the service instances.
    const services = useMemo(() => ({
        micAudioCaptureService,
        systemAudioCaptureService,
        contextService,
        aiResponsesService,
        liveInsightsService,
        conversationHistoryStore,
        contextSearchService,
      }), [
        micAudioCaptureService,
        systemAudioCaptureService,
        contextService,
        aiResponsesService,
        liveInsightsService,
        conversationHistoryStore,
        contextSearchService,
      ]);

    // Expose services to the window for easy debugging in development mode.
    if (process.env.NODE_ENV === 'development') {
        Object.assign(window, services);
        console.log('🛠 [GlobalServices] Services exposed to window for debugging:', Object.keys(services));
    }

    return (
        <GlobalServicesContext.Provider value={services}>
          {children}
        </GlobalServicesContext.Provider>
      );
}