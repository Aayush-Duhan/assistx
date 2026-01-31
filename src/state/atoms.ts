import { atom } from "jotai";

/**
 * Jotai atom to track the number of active movable windows.
 */
export const movableWindowCountAtom = atom(0);

/**
 * A derived Jotai atom that is true if there are any active movable windows.
 */
export const hasMovableWindowsAtom = atom((get: any) => get(movableWindowCountAtom) > 0);
