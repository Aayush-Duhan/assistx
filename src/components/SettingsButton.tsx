import React from 'react';
import { observer } from 'mobx-react-lite';
import { Settings, X } from 'lucide-react';

interface SettingsButtonProps {
    onToggleSettings: () => void;
    isSettingsVisible: boolean;
}

/**
 * Standalone settings button component that can be placed anywhere in the UI.
 * Shows a settings icon when closed and an X icon when settings are open.
 */
export const SettingsButton: React.FC<SettingsButtonProps> = observer(({ onToggleSettings, isSettingsVisible }) => {
    return (
        <div
            className="p-2 cursor-pointer hover:bg-white/10 rounded-md transition-colors duration-200"
            onClick={onToggleSettings}
        >
            {isSettingsVisible ? (
                <X size={16} className="text-white/90" />
            ) : (
                <Settings size={16} className="text-white/90" />
            )}
        </div>
    );
}); 