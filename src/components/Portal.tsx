import { createContext, useContext, useMemo, useState } from "react";
import { createPortal } from "react-dom";

type ParentRef = (parent: HTMLDivElement) => void;

type ParentRefs = {
  commandBar: ParentRef;
  island: ParentRef;
  movableWindows: ParentRef;
  notifications: ParentRef;
  aggroNotifications: ParentRef;
  fullscreen: ParentRef;
};

type ParentContextType = {
  commandBar: HTMLDivElement | null;
  island: HTMLDivElement | null;
  movableWindows: HTMLDivElement | null;
  notifications: HTMLDivElement | null;
  aggroNotifications: HTMLDivElement | null;
  fullscreen: HTMLDivElement | null;
};

const ParentContext = createContext<ParentContextType | null>(null);

export function PortalsProvider({
  children,
}: {
  children: (parents: ParentRefs) => React.ReactNode;
}) {
  const [commandBar, setCommandBar] = useState<HTMLDivElement | null>(null);
  const [island, setIsland] = useState<HTMLDivElement | null>(null);
  const [movableWindows, setMovableWindows] = useState<HTMLDivElement | null>(null);
  const [notifications, setNotifications] = useState<HTMLDivElement | null>(null);
  const [aggroNotifications, setAggroNotifications] = useState<HTMLDivElement | null>(null);
  const [fullscreen, setFullscreen] = useState<HTMLDivElement | null>(null);

  const value = useMemo(
    () => ({
      commandBar,
      island,
      movableWindows,
      notifications,
      aggroNotifications,
      fullscreen,
    }),
    [commandBar, island, movableWindows, notifications, aggroNotifications, fullscreen],
  );

  const setParents: ParentRefs = {
    commandBar: setCommandBar,
    island: setIsland,
    movableWindows: setMovableWindows,
    notifications: setNotifications,
    aggroNotifications: setAggroNotifications,
    fullscreen: setFullscreen,
  };

  return <ParentContext.Provider value={value}>{children(setParents)}</ParentContext.Provider>;
}

export function CommandBarPortal({ children }: { children?: React.ReactNode }) {
  const parent = useContext(ParentContext)?.commandBar;
  return parent && createPortal(children, parent);
}

export function IslandPortal({ children }: { children?: React.ReactNode }) {
  const parent = useContext(ParentContext)?.island;
  return parent && createPortal(children, parent);
}

export function MovableWindowsPortal({ children }: { children?: React.ReactNode }) {
  const parent = useContext(ParentContext)?.movableWindows;
  return parent && createPortal(children, parent);
}

export function NotificationsPortal({ children }: { children?: React.ReactNode }) {
  const parent = useContext(ParentContext)?.notifications;
  return parent && createPortal(children, parent);
}

/** Notifications that are displayed even when Cluely is hidden */
export function AggroNotificationsPortal({ children }: { children?: React.ReactNode }) {
  const parent = useContext(ParentContext)?.aggroNotifications;
  return parent && createPortal(children, parent);
}

export function FullscreenPortal({ children }: { children?: React.ReactNode }) {
  const parent = useContext(ParentContext)?.fullscreen;
  return parent && createPortal(children, parent);
}
