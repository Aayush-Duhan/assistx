import * as React from 'react';
import { observer } from 'mobx-react-lite';
import { useGlobalServices } from '../../services/GlobalServicesContextProvider';
import { UI } from '../ui';

// Type definitions
interface InspectorLabelProps {
    children: React.ReactNode;
}

interface InspectorContentProps {
    children: React.ReactNode;
}

interface AudioCaptureService {
    transcriptionService?: {
        state: {
            state: 'running' | 'stopped' | 'error';
            metadata: {
                audioBuffers: Map<string, any>;
            };
        };
    };
}

interface AudioBufferInspectorProps {
    label: string;
    audioCaptureService: AudioCaptureService;
}

const InspectorLabel = ({ children }: InspectorLabelProps): React.ReactElement => 
    React.createElement(
        'div',
        { className: "font-semibold px-0 text-white/90 text-sm" },
        children
    );

const InspectorContent = ({ children }: InspectorContentProps): React.ReactElement =>
    React.createElement(
        'div',
        { className: "px-0" },
        React.createElement(
            'pre',
            { className: "text-[10px] leading-tight text-wrap text-white/70" },
            children
        )
    );

const AudioBufferInspector = observer(({ label, audioCaptureService }: AudioBufferInspectorProps): React.ReactElement | null => {
    const transcriptionState = audioCaptureService.transcriptionService?.state;
    if (transcriptionState?.state !== 'running') return null;

    return React.createElement(
        React.Fragment,
        null,
        React.createElement(InspectorLabel, null, label),
        React.createElement(
            InspectorContent,
            null,
            JSON.stringify(Object.fromEntries(transcriptionState.metadata.audioBuffers), null, 2)
        )
    );
});

/**
 * Displays the raw audio context and buffer states for debugging.
 */
export const AudioContextInspector = observer((): React.ReactElement => {
    const { contextService, micAudioCaptureService, systemAudioCaptureService } = useGlobalServices();

    return React.createElement(
        UI.ScrollableArea,
        {
            maxHeight: 800,
            scrollUpAccelerator: "CommandOrControl+[",
            scrollDownAccelerator: "CommandOrControl+]",
            className: "space-y-2"
        },
        React.createElement(InspectorLabel, null, "Audio Context:"),
        React.createElement(
            InspectorContent,
            null,
            contextService?.fullContext?.audioContextAsText || "No audio context available"
        ),
        React.createElement(AudioBufferInspector, {
            label: "Mic Audio Buffers",
            audioCaptureService: micAudioCaptureService
        }),
        React.createElement(AudioBufferInspector, {
            label: "System Audio Buffers",
            audioCaptureService: systemAudioCaptureService
        })
    );
}); 