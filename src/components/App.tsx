import { FC, useState } from 'react';
import { observer } from 'mobx-react-lite';
import { Portal, MouseEventsCapture } from './Portal';
import { MovableWindowsProvider } from './windows/MovableWindowsProvider';
import { UpdateAvailableNotification } from './UpdateAvailableNotification';
import { CommandBar } from './CommandBar';
import { SettingsButton } from './SettingsButton';
import { DevInspectWindow } from './dev/DevInspectWindow';
import { AiResponseWindow } from './ai/AiResponseWindow';
import { SettingsWindow } from './SettingsWindow';
import { ListeningUI } from './ai/ListeningUI';


export const App: FC = observer(() => {
    const [isSettingsVisible, setIsSettingsVisible] = useState(false);

    const handleToggleSettings = () => {
        setIsSettingsVisible(prev => !prev);
    };

    return (
        <Portal.Provider>
            {({ commandBar, movableWindows, notifications, fullscreen }) => (
                <MovableWindowsProvider>
                    <div ref={fullscreen} className="absolute inset-0" />
                    <div ref={notifications} className="absolute right-5 bottom-5 flex flex-col items-end gap-4" />
                    <div className="absolute left-0 right-0 top-19">
                        <div ref={movableWindows} className="relative mx-auto w-fit flex flex-col-reverse items-center gap-4" />
                    </div>
                    
                    <div className="absolute left-0 right-0 top-5 flex justify-center">
                        <MouseEventsCapture>
                            <Portal.Inline>
                                <div className="h-10 flex items-center px-2 gap-4">
                                    <ListeningUI />
                                    <div ref={commandBar} className="flex items-center gap-8" />
                                    <SettingsButton 
                                        onToggleSettings={handleToggleSettings} 
                                        isSettingsVisible={isSettingsVisible} 
                                    />
                                </div>
                            </Portal.Inline>
                        </MouseEventsCapture>
                    </div>
                        <UpdateAvailableNotification />
                        <CommandBar />
                        <DevInspectWindow />
                        <AiResponseWindow />
                        <SettingsWindow isVisible={isSettingsVisible} />
                </MovableWindowsProvider>
            )}
        </Portal.Provider>
    );
}); 