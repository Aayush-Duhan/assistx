import { useState, useEffect, useCallback } from 'react';

const PERMISSION_CHECK_INTERVAL = 5000;

export function usePermissions(enabled: boolean): {
    canListen: boolean;
    canCapture: boolean;
    checkPermissions: () => Promise<void>;
} {
    const [canListen, setCanListen] = useState<boolean>(false);
    const [canCapture, setCanCapture] = useState<boolean>(false);

    const checkPermissions = useCallback(async (): Promise<void> => {
        try {
            const hasMicPermission: boolean = await window.electron.ipcRenderer.invoke('request-media-permission', 'microphone');
            const hasScreenPermission: boolean = await window.electron.ipcRenderer.invoke('request-media-permission', 'screen');
            setCanListen(hasMicPermission);
            setCanCapture(hasScreenPermission);
        } catch (error) {
            console.error('Failed to check permissions:', error);
            setCanListen(false);
            setCanCapture(false);
        }
    }, []);

    useEffect(() => {
        if (!enabled) return;

        checkPermissions();
        const intervalId = setInterval(checkPermissions, PERMISSION_CHECK_INTERVAL);

        return () => clearInterval(intervalId);
    }, [enabled, checkPermissions]);

    return { canListen, canCapture, checkPermissions };
} 