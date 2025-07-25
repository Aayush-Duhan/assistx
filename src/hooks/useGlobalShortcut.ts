import { useEffect } from 'react';
import { useEventCallback } from 'usehooks-ts';
import { send, on } from '@/services/electron';
import { useIsCommandBarVisible } from '@/state/visibility';

const shortcutListeners = new Map<string, Set<() => void>>();

on('global-shortcut-triggered', ({ accelerator }) => {
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
	options?: { enable?: 'onlyWhenVisible' | boolean }
) {
	const { enable = 'onlyWhenVisible' } = options || {};

	const stableOnTrigger = useEventCallback(() => {
		onTrigger?.();
	});

	const isWindowVisible = useIsCommandBarVisible();

	const isEnabled = enable === 'onlyWhenVisible' ? isWindowVisible : enable;
	const canTrigger = !!(accelerator && onTrigger && isEnabled);

	useEffect(() => {
		if (!accelerator || !onTrigger || !isEnabled) return;
		let listeners = shortcutListeners.get(accelerator);
		if (!listeners) {
			listeners = new Set();
			shortcutListeners.set(accelerator, listeners);
			send('register-global-shortcuts', { accelerator });
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

	}, [accelerator, stableOnTrigger, canTrigger]);
}