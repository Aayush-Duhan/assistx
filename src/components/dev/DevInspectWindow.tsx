import * as React from 'react';
import { useState } from 'react';
import { observer } from 'mobx-react-lite';

// Hooks and Utilities
import { useGlobalShortcut } from '../../hooks/useGlobalShortcut';

// UI Components
import { Portal } from '../Portal';
import { MovableWindow } from '../windows/MovableWindow';
import { UI } from '../ui';
import { AiConversationInspector } from './AiConversationInspector';
import { AudioContextInspector } from './AudioContextInspector';

// Type definitions
type InspectionTab = 'inspect-conversation' | 'inspect-context';

/**
 * A developer-only window for inspecting the internal state of the application.
 * Its visibility is controlled by a keyboard shortcut.
 * It provides tabs to switch between different inspection views.
 * 
 * For the open source version, this is always available in development mode.
 */
export const DevInspectWindow = observer((): React.ReactElement | null => {
    // For open source version, enable in development mode
    const isDevInspectEnabled = process.env.NODE_ENV === 'development';

    const [isVisible, setIsVisible] = useState(false);
    const [activeTab, setActiveTab] = useState<InspectionTab>('inspect-conversation');

    // Register a global shortcut to toggle the visibility of this window.
    useGlobalShortcut(
        'CommandOrControl+Shift+D',
        () => {
            if (isDevInspectEnabled) {
                setIsVisible(prev => !prev);
            }
        },
        { enable: true } // Always enabled
    );

    // If not in development mode or the window is not visible, render nothing.
    if (!isDevInspectEnabled || !isVisible) {
        return null;
    }

    const inspectionContent = (
        <MovableWindow show={isVisible} width={400}>
            <UI.WindowTitle>Dev Inspect Context</UI.WindowTitle>
            
            {/* Conditionally render the content based on the active tab */}
            {activeTab === 'inspect-conversation' 
                ? <AiConversationInspector />
                : <AudioContextInspector />
            }

            <UI.WindowFooter>
                <div className="flex gap-4">
                    {/* Shortcuts to switch between tabs */}
                    {activeTab !== 'inspect-conversation' && (
                        <UI.Shortcut
                            label="Inspect Conversation"
                            accelerator="CommandOrControl+Shift+C"
                            onTrigger={() => setActiveTab('inspect-conversation')}
                        />
                    )}
                    {activeTab !== 'inspect-context' && (
                        <UI.Shortcut
                            label="Inspect Context"
                            accelerator="CommandOrControl+Shift+X"
                            onTrigger={() => setActiveTab('inspect-context')}
                        />
                    )}
                </div>
            </UI.WindowFooter>
        </MovableWindow>
    );

    // Render the window inside the notifications portal to place it in the bottom-right.
    return (
        <Portal.Notification>
            {inspectionContent}
        </Portal.Notification>
    );
}); 