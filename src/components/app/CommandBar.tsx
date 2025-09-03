import React from 'react';
import { observer } from 'mobx-react-lite';
import { send } from '../../services/electron';
// Hooks, Services, and Stores
import { useGlobalServices } from '../../services/GlobalServicesContextProvider';
// UI Components
import { CommandBarPortal } from '../Portal';
import { Shortcut } from '../ui/Shortcut';
import { ListeningUI } from '../ai/ListeningUI';
import { EyeOff, Type } from 'lucide-react';
import { MovableTooltip } from '../ui/Tooltip';
// Constants for keyboard shortcuts to keep them consistent and maintainable.
const SHORTCUT_ASK_AI = "CommandOrControl+Enter";
const SHORTCUT_TOGGLE_VISIBILITY = "CommandOrControl+\\";




export const CommandBar: React.FC = observer(() => {
    const { aiResponsesService } = useGlobalServices();
    const hideshortcut = (
        <MovableTooltip
            tooltipContent={
                <span>
                    Press<Shortcut accelerator={SHORTCUT_TOGGLE_VISIBILITY} className="inline-block mx-1.5" />
                    again to show
                </span>
            }
            gap={12}
        >
            <div>
                <Shortcut
                    label={
                        <div className="flex items-center gap-1.5">
                            <EyeOff className="opacity-60" size={14} />
                            <span className="text-white/90">Hide</span>
                        </div>
                    }
                    fullBorderRadius
                    enable="always"
                    accelerator={SHORTCUT_TOGGLE_VISIBILITY}
                    showAccelerator={false}
                    onTrigger={() => send('toggle-visibility', null)}
                />
            </div>
        </MovableTooltip>
    )

    const askshortcut = (
        <MovableTooltip
            tooltipContent={
                <span>
                    Ask about anything on your screen with <Shortcut accelerator={SHORTCUT_ASK_AI} className="inline-block mx-1.5" />
                </span>
            }
            gap={12}
        >
            <Shortcut
                label={<div className="flex items-center gap-1.5">
                    <Type className="opacity-60" size={14} />
                    <span>Ask Question</span>
                </div>}
                fullBorderRadius={true}
                enable="onlyWhenVisible"
                accelerator={SHORTCUT_ASK_AI}
                showAccelerator={false}
                onTrigger={(e) => {
                    if (aiResponsesService.isManualInputActive) {
                        if (!e.fromClick) return;
                        aiResponsesService.setIsManualInputActive(false);
                    } else {
                        aiResponsesService.setIsManualInputActive(true);
                    }
                }}
            />
        </MovableTooltip>
    )
    return (
        <CommandBarPortal>
            <div className="ml-[-9px]">
                <ListeningUI />
            </div>
            {askshortcut}
            {hideshortcut}
        </CommandBarPortal>
    );
});
