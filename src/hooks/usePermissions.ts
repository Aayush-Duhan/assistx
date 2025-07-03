import { useState, useEffect, useCallback } from 'react';

const PERMISSION_CHECK_INTERVAL = 5000; // Check every 5 seconds

/**
 * Custom hook to manage and check for microphone and screen recording permissions.
 * It periodically checks the permissions when enabled.
 *
 * @param enabled - Whether to start checking for permissions.
 * @returns Object with permission states and check function
 */
export function usePermissions(enabled: boolean): {
    canListen: boolean;
    canCapture: boolean;
    checkPermissions: () => Promise<void>;
} {
    const [canListen, setCanListen] = useState<boolean>(false);
    const [canCapture, setCanCapture] = useState<boolean>(false);

    const checkPermissions = useCallback(async (): Promise<void> => {
        try {
            // Use IPC to ask the main process for the current permission status.
            const hasMicPermission: boolean = await window.electron.ipcRenderer.invoke('request-media-permission', 'microphone');
            const hasScreenPermission: boolean = await window.electron.ipcRenderer.invoke('request-media-permission', 'screen');
            setCanListen(hasMicPermission);
            setCanCapture(hasScreenPermission);
        } catch (error) {
            console.error('Failed to check permissions:', error);
            // Set to false on error to be safe
            setCanListen(false);
            setCanCapture(false);
        }
    }, []);

    useEffect(() => {
        if (!enabled) return;

        // Check immediately and then set up an interval to re-check.
        checkPermissions();
        const intervalId = setInterval(checkPermissions, PERMISSION_CHECK_INTERVAL);

        // Cleanup the interval when the component unmounts or `enabled` becomes false.
        return () => clearInterval(intervalId);
    }, [enabled, checkPermissions]);

    return { canListen, canCapture, checkPermissions };
} 