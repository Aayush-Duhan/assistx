import { send } from "@/services/electron";
import { windowsAutoFocusAtom } from "@/state/atoms";
import { IS_WINDOWS } from "@/lib/constants";
import { useAtom } from "jotai";
import React, { useCallback, useEffect, useState } from "react";
import { useGlobalShortcut } from "./useGlobalShortcut";

export function useWindowFocus(inputRef: React.RefObject<HTMLTextAreaElement>) {
    const isWindows = IS_WINDOWS;
    const [windowsAutoFocusWindow, setWindowsAutoFocusWindow] = useAtom(windowsAutoFocusAtom);
    const [isWaitingForTab, setIsWaitingForTab] = useState(isWindows && !windowsAutoFocusWindow);

    useEffect(() => {
        if (!isWindows) {
            return;
        }
        setIsWaitingForTab(!windowsAutoFocusWindow);
    }, [windowsAutoFocusWindow]);

    useEffect(() => {
        send('hide-display-overlays', null);
        if (isWindows && isWaitingForTab) {
            send('unfocus-window', null);
            return;
        }
        send('focus-window', null);
        inputRef.current?.focus();
    }, [inputRef, isWaitingForTab]);

    useGlobalShortcut('tab', () => {
        setIsWaitingForTab(false);
    }, { enable: isWaitingForTab });
    const handleClick = useCallback(() => {
        setIsWaitingForTab(false);
    }, []);
    return {
        isWaitingForTab,
        windowsAutoFocusWindow,
        setWindowsAutoFocusWindow,
        handleClick,
    };
}