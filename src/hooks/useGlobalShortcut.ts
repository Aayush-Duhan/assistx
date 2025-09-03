import { useEffect, useRef, useState } from 'react';
import { useEventCallback } from 'usehooks-ts';
import { send, on, off, invoke } from '@/services/electron';

const shortcutListeners = new Map<string, Set<() => void>>();

on('global-shortcut-triggered', (accelerator) => {
    const callbacks = shortcutListeners.get(accelerator);
    if (callbacks) {
        for (const callback of callbacks) {
            callback();
        }
    }
});

export function useGlobalShortcut(
	accelerator: string | null | undefined,
	onTrigger?: () => void,
	options?: { enable?: 'onlyWhenVisible' | 'always' | boolean }
) {
    const { enable = 'onlyWhenVisible' } = options || {};

	const stableOnTrigger = useEventCallback(() => {
		onTrigger?.();
	});

    // Visible state via IPC
    const [isWindowVisible, setIsWindowVisible] = useState<boolean>(true);
    const isMounted = useRef(false);
    useEffect(() => {
        isMounted.current = true;
        // Prime visibility from main
        (async () => {
            try {
                const { visible } = await invoke('request-window-visibility', null);
                if (isMounted.current) setIsWindowVisible(visible);
            } catch {
                // default to true
            }
        })();
        const handleShown = (_: null) => setIsWindowVisible(true);
        const handleHidden = (_: null) => setIsWindowVisible(false);
        on('window-shown', handleShown);
        on('window-hidden', handleHidden);
        return () => {
            isMounted.current = false;
            off('window-shown', handleShown);
            off('window-hidden', handleHidden);
        };
    }, []);

    const isEnabled = enable === 'onlyWhenVisible' ? isWindowVisible : enable;
    // Whether the hook should actively register the accelerator
    const canTrigger = !!(accelerator && onTrigger && isEnabled);

    useEffect(() => {
        if (!accelerator || !onTrigger || !isEnabled) return;
        let listeners = shortcutListeners.get(accelerator);
        if (!listeners) {
            listeners = new Set();
            shortcutListeners.set(accelerator, listeners);
            send('register-global-shortcut', { accelerator });
        }
        listeners.add(stableOnTrigger);

        return () => {
            const currentListeners = shortcutListeners.get(accelerator);
            if (currentListeners) {
                currentListeners.delete(stableOnTrigger);
                if (currentListeners.size === 0) {
                    shortcutListeners.delete(accelerator);
                    send('unregister-global-shortcut', { accelerator });
                }
            }
        };

    }, [accelerator, stableOnTrigger, isEnabled, onTrigger, canTrigger]);
}