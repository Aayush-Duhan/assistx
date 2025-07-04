import { useState, useEffect } from 'react';

/**
 * Hook to track if the current window is hidden (e.g., minimized or not visible).
 * Returns true if the window is hidden, false otherwise.
 */
export function useIsWindowHidden(): boolean {
  const [isHidden, setIsHidden] = useState(false);

  useEffect(() => {
    const handleVisibilityChange = () => {
      setIsHidden(document.hidden);
    };

    // Check initial state
    setIsHidden(document.hidden);

    // Listen for visibility changes
    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, []);

  return isHidden;
} 