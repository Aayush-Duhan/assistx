/**
 * Simple module-level counter for active movable windows.
 * Replaces Jotai atoms (movableWindowCountAtom, hasMovableWindowsAtom).
 *
 * ponytail: promote to Zustand store if components need to re-render on count changes.
 * Currently only MovableWindow uses it for increment/decrement side-effects.
 */

let _count = 0;
const _listeners = new Set<() => void>();

export function getMovableWindowCount(): number {
  return _count;
}

export function hasMovableWindows(): boolean {
  return _count > 0;
}

export function incrementMovableWindowCount(): void {
  _count++;
  _notify();
}

export function decrementMovableWindowCount(): void {
  _count = Math.max(0, _count - 1);
  _notify();
}

export function subscribeMovableWindowCount(listener: () => void): () => void {
  _listeners.add(listener);
  return () => _listeners.delete(listener);
}

function _notify(): void {
  for (const listener of _listeners) listener();
}
