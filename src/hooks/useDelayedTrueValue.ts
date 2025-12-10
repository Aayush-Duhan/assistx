import { useEffect, useState } from "react";

/**
 * If value is false, returns false immediately.
 * If value is true, returns true after a delay of delayMs milliseconds.
 */
export function useDelayedTrueValue(value: boolean, delayMs: number): boolean {
    const [delayedValue, setDelayedValue] = useState(false);

    if (!value && delayedValue) {
        setDelayedValue(false);
    }

    useEffect(() => {
        if (value) {
            const timeout = setTimeout(() => {
                setDelayedValue(true);
            }, delayMs);
            return () => clearTimeout(timeout);
        }
    }, [value, delayMs]);

    return delayedValue;
}
