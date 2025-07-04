import React from 'react';
import { observer } from 'mobx-react-lite';

// Hooks, Services, and Stores
import { useGlobalServices } from '../services/GlobalServicesContextProvider';
import { electron } from '@/services/electron';
// UI Components
import { Portal } from './Portal';
import { UI } from './ui';

// Constants for keyboard shortcuts to keep them consistent and maintainable.
const SHORTCUT_ASK_AI = "CommandOrControl+Enter";
const SHORTCUT_TOGGLE_VISIBILITY = "CommandOrControl+\\";



/**
 * The main command bar UI, which shows primary actions like "Ask AI" and "Chat".
 * It uses a portal to render its content into the designated command bar area
 * at the top of the application window.
 */
export const CommandBar: React.FC = observer(() => {
    const { aiResponsesService } = useGlobalServices();
    const { currentConversation } = aiResponsesService;
    const hasActiveResponse =
        currentConversation?.latestResponse.state.state === 'finished' ||
        !!currentConversation?.prevResponses.length;

    const handleAskAi = (): void => {
        // Activate manual input mode to show the text input field
        aiResponsesService.setIsManualInputActive(true);
    };

    return (
        // CommandBarPortal ensures this UI is rendered into the correct DOM node
        // managed by Portal.Provider in App.tsx.
        <Portal.CommandBar>
                {/* "Ask AI" or "Ask Follow-Up" Shortcut */}
                <UI.Shortcut
                    label={hasActiveResponse ? "Ask Follow-Up" : "Ask AI"}
                    accelerator={SHORTCUT_ASK_AI}
                    onTrigger={handleAskAi}
                />

                {/* "Show/Hide" Shortcut */}
                <UI.Shortcut
                    label="Show/Hide"
                    accelerator={SHORTCUT_TOGGLE_VISIBILITY}
                    onTrigger={() => electron.toggleVisibility()}
                />
        </Portal.CommandBar>
    );
}); 