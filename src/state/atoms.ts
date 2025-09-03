import { atom } from 'jotai';
import { atomWithStorage } from 'jotai/utils';

/**
 * Jotai atom to track if the copy button is being hovered.
 */
export const isCopyHoveredAtom = atom(false);

/**
 * Jotai atom to track if copying is in progress.
 */
export const isCopyingAtom = atom(false);

/**
 * Jotai atom to track if the "Copy AI Response" tooltip should be shown.
 */
export const showCopyConversationTooltipAtom = atom(false);

/**
 * Jotai atom to track if the "Clear Response" tooltip should be shown.
 */
export const showClearResponseTooltipAtom = atom(false);

/**
 * Jotai atom to track the number of active movable windows.
 */
export const movableWindowCountAtom = atom(0);

/**
 * A derived Jotai atom that is true if there are any active movable windows.
 */
export const hasMovableWindowsAtom = atom((get) => get(movableWindowCountAtom) > 0);

/**
 * Jotai atom to manage whether the main app window should auto-focus.
 * This is mainly for Windows to prevent the app from stealing focus.
 */
export const windowsAutoFocusAtom = atomWithStorage('windowsAutoFocusWindow', true,
  undefined, { getOnInit: true });

/**
 * Jotai atom to track if the "Done" button in the audio session is being hovered.
 */
export const isClearingAtom = atom(false);

export const activeAppAtom = atom<'app' | 'login' | 'activity' | 'personalize' | 'settings.profile' | 'settings.security' | 'settings.integrations'>('app');

export const settingsWindowVisibleAtom = atom(false);

export const manualInputAtom = atom('');

export const isThinkingAtom = atom(false);