import React from 'react';
import { observer } from 'mobx-react-lite';
import { MovableWindow } from './windows/MovableWindow';
import { Portal } from './Portal';
import { Settings } from './Settings';

/**
 * A window for application settings that can be toggled with a gear icon.
 * Contains all the features from the original More Menu plus user context management.
 */
export const SettingsWindow: React.FC<{ isVisible: boolean }> = observer(({ isVisible }) => {
    // If the window is not visible, render nothing
    if (!isVisible) {
        return null;
    }

    return (
        <Portal.Notification>
            <MovableWindow 
                show={isVisible} 
                width={400}
                title="Settings"
                opaque={true}
            >
                <Settings />
            </MovableWindow>
        </Portal.Notification>
    );
}); 