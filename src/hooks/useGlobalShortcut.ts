import { useEffect, useRef, useCallback } from 'react';
import { electron } from '@/services/electron';
// --- Type Definitions ---

type EnableOption = boolean | 'onlyWhenVisible';

interface UseGlobalShortcutOptions {
  /**
   * Determines when the shortcut should be active.
   * - `true`: Always enabled.
   * - `false`: Always disabled.
   * - `'onlyWhenVisible'`: Enabled only when the main application window is visible and focused.
   * @default 'onlyWhenVisible'
   */
  enable?: EnableOption;
}

// --- Global State ---

/**
 * A map to store all active shortcut callbacks.
 * The key is the accelerator string (e.g., "CommandOrControl+Enter").
 * The value is a Set of callback functions to execute when the shortcut is triggered.
 */
const shortcutCallbackMap = new Map<string, Set<() => void>>();

/**
 * Listen for the trigger event from the main process.
 * When a shortcut is pressed, the main process sends this event with the accelerator.
 */
if (typeof window !== 'undefined' && electron) {
  electron.subscribe('global-shortcut-triggered', (accelerator: string) => {
    const callbacks = shortcutCallbackMap.get(accelerator);
    if (callbacks) {
      // Execute all registered callbacks for this shortcut.
      for (const callback of callbacks) {
        try {
          callback();
        } catch (error) {
          console.error(`[useGlobalShortcut] Error executing callback for ${accelerator}:`, error);
        }
      }
    }
  });
}


// --- Main Hook ---

/**
 * A React hook to register a global keyboard shortcut that works even when
 * the application window is not in focus.
*
* @param {string | null | undefined} accelerator - The shortcut string (e.g., "CommandOrControl+Enter"). If null, the hook does nothing.
* @param {() => void} onTrigger - The callback function to execute when the shortcut is pressed.
 * @param {UseGlobalShortcutOptions} [options] - Configuration options.
*/
export function useGlobalShortcut(
  accelerator: string | null | undefined,
  onTrigger?: () => void,
  options: UseGlobalShortcutOptions = {}
) {
  const { enable = 'onlyWhenVisible' } = options;
  
  // Create a stable version of the callback to avoid re-registering the shortcut on every render.
  const stableOnTrigger = useStableCallback(() => {
    onTrigger?.();
  });
  
  const isWindowVisible = electron.getVisibility();
  
  // Determine if the shortcut should be active based on the `enable` option and window visibility.
  const isEnabled = enable === 'onlyWhenVisible' ? isWindowVisible : enable;
  const canTrigger = !!onTrigger;
  
  useEffect(() => {
    // If the shortcut is enabled, the accelerator is valid, and there's a callback,
    // then register it.
    if (accelerator && stableOnTrigger && canTrigger) {
      
      let callbacks = shortcutCallbackMap.get(accelerator);
      if (!callbacks) {
        // If this is the first time this shortcut is being used, create a new Set
        // and tell the main process to register it.
        callbacks = new Set();
        shortcutCallbackMap.set(accelerator, callbacks);
        if (typeof window !== 'undefined' && electron) {
          try {
            electron.registerGlobalShortcut({ accelerator });
          } catch (error) {
            console.error(`[useGlobalShortcut] Error registering ${accelerator} with main process:`, error);
            // Remove from map if registration failed
            shortcutCallbackMap.delete(accelerator);
            return;
          }
        } else {
          return;
        }
      }
      callbacks.add(stableOnTrigger);
      
      // Return a cleanup function to unregister the shortcut when the component unmounts
      // or when the dependencies change.
      return () => {
        
        const callbacks = shortcutCallbackMap.get(accelerator);
        if (callbacks) {
          callbacks.delete(stableOnTrigger);
          // If there are no more listeners for this shortcut, unregister it
          // from the main process to free up the key combination.
          if (callbacks.size === 0) {
            shortcutCallbackMap.delete(accelerator);
            if (typeof window !== 'undefined' && electron) {
              try {
                electron.unregisterGlobalShortcut({ accelerator });
              } catch (error) {
                console.error(`[useGlobalShortcut] Error unregistering ${accelerator} from main process:`, error);
              }
            }
          }
        }
      };
    }
  }, [accelerator, stableOnTrigger, canTrigger, isEnabled]);
}

// --- Helper Functions ---

/**
 * A custom hook that returns a stable reference to a callback function.
 * This prevents effects from re-running every time a component re-renders
 * with a new function instance.
 * @param callback The function to stabilize.
 * @returns A memoized version of the callback.
 */
function useStableCallback<T extends (...args: any[]) => any>(callback: T): T {
    const callbackRef = useRef<T>(callback);

    useEffect(() => {
        callbackRef.current = callback;
    }, [callback]);

    return useCallback((...args: any[]) => {
        return callbackRef.current?.(...args);
    }, []) as T;
}