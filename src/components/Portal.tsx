import React, { useState, useMemo, useContext, ReactNode, Ref } from 'react';
import {createPortal} from 'react-dom';

interface PortalContextValue {
  commandBar: HTMLDivElement | null;
  movableWindows: HTMLDivElement | null;
  notifications: HTMLDivElement | null;
  fullscreen: HTMLDivElement | null;
}

interface PortalSetterProps {
  commandBar: Ref<HTMLDivElement>;
  movableWindows: Ref<HTMLDivElement>;
  notifications: Ref<HTMLDivElement>;
  fullscreen: Ref<HTMLDivElement>;
}

const PortalContext = React.createContext<PortalContextValue | null>(null);

interface PortalProviderProps {
  children: (setters: PortalSetterProps) => ReactNode;
}

export function PortalProvider({ children }: PortalProviderProps) {
  const [commandBar, setCommandBar] = useState<HTMLDivElement | null>(null);
  const [movableWindows, setMovableWindows] = useState<HTMLDivElement | null>(null);
  const [notifications, setNotifications] = useState<HTMLDivElement | null>(null);
  const [fullscreen, setFullscreen] = useState<HTMLDivElement | null>(null);

  const contextValue = useMemo(
    () => ({ commandBar, movableWindows, notifications, fullscreen }),
    [commandBar, movableWindows, notifications, fullscreen]
  );

  const setters = {
    commandBar: setCommandBar,
    movableWindows: setMovableWindows,
    notifications: setNotifications,
    fullscreen: setFullscreen,
  };

  return (
    <PortalContext.Provider value={contextValue}>
      {children(setters)}
    </PortalContext.Provider>
  );
}

function GenericPortal({ children, targetKey }: { children: ReactNode; targetKey: keyof PortalContextValue  }) {
  const portalContext = useContext(PortalContext);

  if (!portalContext) {
    console.error("Portal components must be used within a PortalProvider.");
    return null;
  }

  const targetNode = portalContext[targetKey];

  return targetNode ? createPortal(children, targetNode) : null;
}


export function CommandBarPortal({ children }: { children: ReactNode }) {
  return <GenericPortal targetKey="commandBar">{children}</GenericPortal>;
}

export function MovableWindowsPortal({ children }: { children: ReactNode }) {
  return <GenericPortal targetKey="movableWindows">{children}</GenericPortal>;
}

export function NotificationPortal({ children }: { children: ReactNode }) {
  return <GenericPortal targetKey="notifications">{children}</GenericPortal>;
}

export function FullscreenPortal({ children }: { children: ReactNode }) {
  return <GenericPortal targetKey="fullscreen">{children}</GenericPortal>;
}