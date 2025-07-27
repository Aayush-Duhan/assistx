import { FC, useState, useEffect } from 'react';
import { observer } from 'mobx-react-lite';
import { PortalProvider } from './Portal';
import { MouseEventsCapture } from './windows/MouseEventCapture';
import { MovableWindowsProvider } from '../hooks/useMovableWindow';
import { InlineWindow } from './windows/InlineWindow';
import { UpdateAvailableNotification } from './UpdateAvailableNotification';
import { CommandBar } from './CommandBar';
import { SettingsButton } from './SettingsButton';
import { DevInspectWindow } from './dev/DevInspectWindow';
import { AiResponseWindow } from './ai/AiResponseWindow';
import { AudioSessionWindow } from './ai/AudioSessionWindow';
import { SettingsWindow } from './SettingsWindow';
import { ListeningUI } from './ai/ListeningUI';
import { useGlobalServices } from '../services/GlobalServicesContextProvider';


export const App: FC = observer(() => {
    const { micAudioCaptureService, systemAudioCaptureService } = useGlobalServices();
    const [isSettingsVisible, setIsSettingsVisible] = useState(false);
    const [isAudioSessionVisible, setIsAudioSessionVisible] = useState(true);

    const handleToggleSettings = () => {
        setIsSettingsVisible(prev => !prev);
    };

    // Show the audio session window when audio capture starts
    useEffect(() => {
        const isAudioActive = 
            micAudioCaptureService.state.state === 'running' || 
            systemAudioCaptureService.state.state === 'running' ||
            micAudioCaptureService.state.state === 'loading' ||
            systemAudioCaptureService.state.state === 'loading';
            
        if (isAudioActive && !isAudioSessionVisible) {
            setIsAudioSessionVisible(true);
        }
    }, [micAudioCaptureService.state.state, systemAudioCaptureService.state.state, isAudioSessionVisible]);

    return (
        <PortalProvider>
            {({ commandBar, movableWindows, notifications, fullscreen }) => (
                <MovableWindowsProvider>
                    <div ref={fullscreen} className="absolute inset-0" />
                    <div ref={notifications} className="absolute right-5 bottom-5 flex flex-col items-end gap-4" />
                    <div className="absolute left-0 right-0 top-19">
                        <div ref={movableWindows} className="relative mx-auto w-fit flex flex-col-reverse items-center gap-4" />
                    </div>
                    
                    <div className="absolute left-0 right-0 top-5 flex justify-center">
                        <MouseEventsCapture>
                            <InlineWindow>
                                <div className="h-10 flex items-center px-2 gap-4">
                                    <ListeningUI />
                                    <div ref={commandBar} className="flex items-center gap-8" />
                                    <SettingsButton 
                                        onToggleSettings={handleToggleSettings} 
                                        isSettingsVisible={isSettingsVisible} 
                                    />
                                </div>
                            </InlineWindow>
                        </MouseEventsCapture>
                    </div>
                        <UpdateAvailableNotification />
                        <CommandBar />
                        <DevInspectWindow />
                        <AiResponseWindow />
                        <AudioSessionWindow 
                            show={isAudioSessionVisible} 
                            onClose={() => setIsAudioSessionVisible(false)} 
                        />
                        <SettingsWindow isVisible={isSettingsVisible} />
                </MovableWindowsProvider>
            )}
        </PortalProvider>
    );
}); 