import { atom, useSetAtom } from "jotai";
import { useEffect } from "react";

const visibleMovableWindowCountAtom = atom(0);

export const hasVisibleMovableWindowAtom = atom((get) => get(visibleMovableWindowCountAtom) > 0);

export function useTrackMovableWindowVisible(show: boolean) {
    const setVisibleMovableWindowCount = useSetAtom(visibleMovableWindowCountAtom);

    useEffect(() => {
        if (show) {
            setVisibleMovableWindowCount((count) => count + 1);
            return () => setVisibleMovableWindowCount((count) => count - 1);
        }
    }, [show, setVisibleMovableWindowCount]);
}
