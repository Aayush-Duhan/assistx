import React, { useCallback } from 'react';
import { observer } from 'mobx-react-lite';
import { ArrowLeft, ArrowRight } from 'lucide-react';

// Hooks, Services, and Stores
import { useAppVersion, useUpdateAvailable, useUpdateInfo } from '../hooks/useAppUpdates';
import { useMovableWindow } from './windows/MovableWindowsProvider';
import { useFeatureFlag, FeatureFlags } from '../stores/featureStore';
import { userContextStore } from '../stores/userContextStore';
import { settingsStore, AIModelKey } from '../stores/settingsStore';

// UI Components
import { UI } from './ui';
import logoSvg from '../assets/logo.svg';
import { electron } from '@/services/electron';

/**
 * A small component to display the app version and dev status.
 */
function AppVersionInfo(): React.ReactElement | null {
    const appVersion = useAppVersion();
    return appVersion ? (
        <>
            v{appVersion}
        </>
    ) : null;
}

/**
 * A button that only appears when an update is available from GitHub releases.
 */
function UpdateButton(): React.ReactElement | null {
    const isUpdateAvailable = useUpdateAvailable();
    const updateInfo = useUpdateInfo();

    if (!isUpdateAvailable || !updateInfo.downloadUrl) return null;

    const handleUpdateClick = () => {
        if (updateInfo.downloadUrl) {
            electron.openExternalUrl(updateInfo.downloadUrl);
            console.log('Opening update URL:', updateInfo.downloadUrl);
        }
    };

    return (
        <UI.Button
            className="w-full"
            onClick={handleUpdateClick}
        >
            Update Available ({updateInfo.version})
        </UI.Button>
    );
}

/**
 * Enhanced header component with logo, title, and version
 */
const SettingsHeader: React.FC = () => {
    return (
        <div className="flex items-start justify-between mb-4 pb-3 border-b border-white/10">
            <div className="flex items-center gap-2">
                <img src={logoSvg} alt="AssistX Logo" className="w-8 h-8" />
                <h1 className="text-lg font-bold text-white/95 tracking-tight leading-tight">
                    AssistX Settings
                </h1>
            </div>
            <div className="flex items-center gap-2">
                <span className="px-2 py-0.5 bg-gray-200/20 text-gray-200 text-xs font-medium rounded-full border border-gray-400/30">
                    <AppVersionInfo />
                </span>
            </div>
        </div>
    );
};

/**
 * Settings window component that contains all previous More Menu features
 * plus a user context textbox.
 */
export const Settings: React.FC = observer(() => {
    const useVimBindings = useFeatureFlag(FeatureFlags.VIM_MODE_KEY_BINDINGS);
    const { moveLeft, moveRight } = useMovableWindow();

    const handleUserContextChange = useCallback((value: string) => {
        userContextStore.setUserContext(value);
    }, []);

    const handleModelChange = useCallback((value: string) => {
        settingsStore.setSelectedModel(value as AIModelKey);
    }, []);

    return (
        <div className="w-full p-6">
            {/* Enhanced Header */}
            <SettingsHeader />

            {/* AI Configuration Section */}
            <div className="mb-4">                
                {/* Provider and Model Selection */}
                <div className="grid grid-cols-1 gap-4 mb-4">
                    <div>
                        <label className="block text-white/90 text-sm font-medium mb-1">
                            AI Model
                        </label>
                        <UI.Select
                            value={settingsStore.selectedModel}
                            onChange={handleModelChange}
                            options={settingsStore.getAvailableModels()}
                            className="w-full"
                        />
                    </div>
                </div>

                {/* User Context */}
                <div>
                    <label className="block text-white/90 text-sm font-medium mb-1">
                        User Context
                    </label>
                    <UI.Input
                        multiLine
                        value={userContextStore.userContext}
                        onChange={handleUserContextChange}
                        placeholder="Enter context about yourself that will help the AI provide better responses..."
                        className="w-full bg-white/10 border border-white/20 rounded-md px-4 py-3 min-h-[100px] max-h-[150px] overflow-y-auto resize-none text-sm"
                    />
                    <p className="text-white/60 text-xs mt-1">
                        This context will be included in AI conversations to provide more personalized responses.
                    </p>
                </div>
            </div>

            {/* Keyboard Shortcuts Section */}
            <div className="mb-4">
                <h3 className="text-white/90 text-base font-medium mb-2">Keyboard Shortcuts</h3>
                <div className="flex flex-col gap-2">
                    <div className="flex items-center justify-between">
                        <span className="text-white/90 text-sm">Show / Hide</span>
                        <UI.InlineShortcut accelerator="CommandOrControl+\" />
                    </div>
                    <div className="flex items-center justify-between">
                        <span className="text-white/90 text-sm">Generate Response</span>
                        <UI.InlineShortcut accelerator="CommandOrControl+Enter" />
                    </div>
                    <div className="flex items-center justify-between">
                        <span className="text-white/90 text-sm">Reset Chat</span>
                        <UI.InlineShortcut accelerator="CommandOrControl+R" />
                    </div>
                    <div className="flex items-center justify-between">
                        <span className="text-white/90 text-sm">Scroll AI Response</span>
                        <div className="flex items-center gap-1">
                            <UI.InlineShortcut accelerator={useVimBindings ? "CommandOrControl+J" : "CommandOrControl+Down"} />
                            <span className="text-white/60 text-xs">/</span>
                            <UI.InlineShortcut accelerator={useVimBindings ? "CommandOrControl+K" : "CommandOrControl+Up"} />
                        </div>
                    </div>
                </div>
            </div>

            {/* Window Controls Section */}
            <div className="border-t border-white/10 pt-2">
                <h3 className="text-white/90 text-base font-medium mb-2">Window Controls</h3>
                <div className="flex items-center gap-2">
                    <button 
                        className="bg-white/20 hover:bg-white/30 rounded-md px-4 py-2 text-white/90 text-sm font-medium transition-colors duration-200 flex items-center gap-2"
                        onClick={moveLeft}
                    >
                        <ArrowLeft size={14} />
                        <span>Move Left</span>
                    </button>
                    <button 
                        className="bg-white/20 hover:bg-white/30 rounded-md px-4 py-2 text-white/90 text-sm font-medium transition-colors duration-200 flex items-center gap-2"
                        onClick={moveRight}
                    >
                        <span>Move Right</span>
                        <ArrowRight size={14} />
                    </button>
                    <button 
                        className="bg-red-600/60 hover:bg-red-600/80 rounded-md px-4 py-2 text-red-200 text-sm font-medium transition-colors duration-200"
                        onClick={() => {
                            electron.quitApp();
                            console.log('Quit button clicked');
                        }}
                    >
                        Quit App
                    </button>
                    <UpdateButton />
                </div>
            </div>
        </div>
    );
}); 