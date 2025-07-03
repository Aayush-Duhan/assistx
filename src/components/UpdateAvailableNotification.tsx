import React, { useEffect } from 'react';
import { observer } from 'mobx-react-lite';
import { electron } from '@/services/electron';
// Hooks and Utils
import { useAppVersion, useUpdateAvailable, useUpdateInfo } from '../hooks/useAppUpdates';

// UI Components
import { MovableWindow } from './windows/MovableWindow';
import { UI } from './ui';

/**
 * A notification component that appears when a new app version is available
 * from GitHub releases and is ready to install.
 */
export const UpdateAvailableNotification: React.FC = observer(() => {
    const appVersion = useAppVersion();
    const isUpdateAvailable = useUpdateAvailable();
    const updateInfo = useUpdateInfo();

    // For open-source version, we check GitHub releases for updates
    useEffect(() => {
        // The useUpdateAvailable hook already handles checking for updates
        if (isUpdateAvailable) {
            console.log('Update available:', updateInfo.version);
        }
    }, [isUpdateAvailable, updateInfo.version]);

    // Show notification when an update is available from GitHub releases
    if (isUpdateAvailable && updateInfo.downloadUrl) {
        const handleUpdateClick = () => {
            // For open source version, open the GitHub release page or download URL
            if (updateInfo.downloadUrl) {
                electron.openExternalUrl(updateInfo.downloadUrl);
            }
            console.log('Opening update URL:', updateInfo.downloadUrl, {
                currentVersion: appVersion,
                newVersion: updateInfo.version,
            });
        };

        return (
            <MovableWindow
                title="Update Available"
                width={400}
            >
                <div className="space-y-4">
                    <UI.WindowTitle>Update Available</UI.WindowTitle>
                    <div className="text-sm text-white/80">
                        A new version ({updateInfo.version}) is available for download.
                        {appVersion && (
                            <div className="mt-1 text-xs text-white/60">
                                Current version: {appVersion}
                            </div>
                        )}
                    </div>
                    <div className="flex gap-2">
                        <UI.Button
                            onClick={handleUpdateClick}
                            className="flex-1"
                        >
                            Download Update
                        </UI.Button>
                    </div>
                </div>
            </MovableWindow>
        );
    }

    return null;
}); 