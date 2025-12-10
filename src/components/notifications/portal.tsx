import { createContext, useContext, useRef } from "react";
import { createPortal } from "react-dom";

const Context = createContext<{ current: HTMLDivElement | null }>({ current: null });

export function NotificationsProvider({ children }: { children: React.ReactNode }) {
  const ref = useRef<HTMLDivElement | null>(null);
  return <Context.Provider value={ref}>{children}</Context.Provider>;
}

export function NotificationsTarget({ className }: { className?: string }) {
  const ref = useContext(Context);
  return <div ref={ref} className={className} />;
}

export function NotificationsPortal({ children }: { children?: React.ReactNode }) {
  const ref = useContext(Context);
  return ref.current ? createPortal(children, ref.current) : null;
}
