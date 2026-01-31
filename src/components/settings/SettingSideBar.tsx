import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { HeadlessButton } from "../ui/HeadlessButton";
import { observer } from "mobx-react-lite";
import { useAtom } from "jotai";
import { Logo } from "../Logo";
import { activeAppAtom } from "@/dashboard/atoms";
import {
  LuActivity,
  LuBookOpen,
  LuChevronRight,
  LuLaptopMinimal,
  LuSettings,
  LuWaypoints,
  LuWrench,
  LuPanelLeftClose,
} from "react-icons/lu";

interface SidebarItemProps {
  isActive: boolean;
  isParent?: boolean;
  isNested?: boolean;
  isHidden?: boolean;
  isExpanded?: boolean;
  onToggleExpand?: () => void;
  onClick: () => void;
  children: React.ReactNode;
}
const SidebarItem = observer(
  ({
    isActive,
    isParent = false,
    isNested = false,
    isHidden = false,
    isExpanded = false,
    onToggleExpand,
    onClick,
    children,
  }: SidebarItemProps) => (
    <motion.div
      className="w-full"
      initial={{ y: -4, opacity: 0 }}
      animate={{ y: isHidden ? -4 : 0, opacity: isHidden ? 0 : 1 }}
      transition={{ duration: 0.15, ease: "easeOut" }}
    >
      <HeadlessButton
        role="menuitem"
        aria-current={isActive ? "page" : undefined}
        aria-expanded={isParent ? isExpanded : undefined}
        aria-haspopup={isParent ? "menu" : undefined}
        className={`group relative w-full flex ${isParent ? "justify-between" : "justify-start"} items-center gap-2 rounded px-2 py-2 text-left text-sm text-white/70 transition duration-150 hover:text-white hover:bg-white/10 focus:outline-none focus-visible:ring-1 focus-visible:ring-white/30 cursor-pointer ${isHidden ? "pointer-events-none" : ""} ${isNested ? "pl-5" : ""} ${isActive && isParent ? "bg-white/5 text-white" : ""} ${isActive && !isParent ? "bg-white/10 text-white" : ""}`}
        onClick={onClick}
      >
        <span
          aria-hidden
          className={`absolute left-0 top-1 bottom-1 w-[2px] rounded ${isActive ? "bg-white/70 opacity-100" : "bg-white/30 opacity-0 group-hover:opacity-60"}`}
        />
        <span className="flex items-center gap-2 min-w-0">{children}</span>
        {isParent && (
          <span
            role="button"
            aria-label={isExpanded ? "Collapse" : "Expand"}
            className="ml-2 rounded p-1 hover:bg-white/10 focus-visible:ring-1 focus-visible:ring-white/30"
            onClick={(e) => {
              e.stopPropagation();
              onToggleExpand?.();
            }}
          >
            <LuChevronRight
              className={`size-3.5 shrink-0 text-white/60 transition-transform ${isExpanded ? "rotate-90 text-white/80" : ""}`}
            />
          </span>
        )}
      </HeadlessButton>
    </motion.div>
  ),
);

export const SettingSideBar = ({ onNavToSamePage }: { onNavToSamePage: () => void }) => {
  const [activeApp, setActiveApp] = useAtom(activeAppAtom);

  const handleNav = (
    app:
      | "app"
      | "activity"
      | "personalize"
      | "settings.tools"
      | "settings.security"
      | "settings.integrations",
  ) => {
    if (activeApp === app) {
      onNavToSamePage();
    } else {
      setActiveApp(app);
    }
  };

  const isSettingsActive = [
    "app",
    "settings.tools",
    "settings.security",
    "settings.integrations",
  ].includes(activeApp);
  const [isSettingsExpanded, setIsSettingsExpanded] = useState<boolean>(isSettingsActive);
  useEffect(() => {
    setIsSettingsExpanded(isSettingsActive);
  }, [isSettingsActive]);

  return (
    <aside className="h-full p-4 flex flex-col w-[250px]">
      <div className="bg-zinc-900/50 h-full w-full rounded-xl p-2 relative before:absolute before:top-0 before:left-0 before:right-0 before:h-[1px] before:bg-gradient-to-r before:from-transparent before:via-zinc-500 before:to-transparent">
        <div className="flex justify-between items-center pt-2 px-2">
          <Logo size={32} />
          <button
            className="p-1.5 rounded-full hover:bg-white/10 text-white/60 hover:text-white/80 transition-colors duration-150 focus:outline-none focus-visible:ring-1 focus-visible:ring-white/30"
            aria-label="Collapse sidebar (coming soon)"
            title="Collapse sidebar (coming soon)"
          >
            <LuPanelLeftClose size={16} color="#bd470f" />
          </button>
        </div>
        <nav className="mt-3 flex-1" role="menu">
          <div className="px-2 text-[12px] uppercase tracking-wider text-white font-semibold">
            General
          </div>
          <div className="mt-2 space-y-1">
            <SidebarItem isActive={activeApp === "activity"} onClick={() => handleNav("activity")}>
              <LuActivity size={14} />
              My Activity
            </SidebarItem>
            <SidebarItem
              isActive={activeApp === "personalize"}
              onClick={() => handleNav("personalize")}
            >
              <LuBookOpen size={14} />
              Personalize
            </SidebarItem>
          </div>

          <div className="mt-4 px-2 text-[10px] uppercase tracking-wider text-white/40">
            Settings
          </div>
          <div className="mt-2 space-y-1">
            <SidebarItem
              isParent
              isExpanded={isSettingsExpanded}
              isActive={isSettingsActive}
              onClick={() => {
                if (!isSettingsExpanded) setIsSettingsExpanded(true);
                handleNav("app");
              }}
              onToggleExpand={() => setIsSettingsExpanded((v) => !v)}
            >
              <LuSettings size={14} />
              Settings
            </SidebarItem>

            <AnimatePresence initial={false}>
              {isSettingsExpanded && (
                <motion.div
                  key="settings-group"
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: "auto", opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  transition={{ duration: 0.15, ease: "easeOut" }}
                  className="space-y-1 overflow-hidden"
                >
                  <SidebarItem
                    isNested
                    isActive={activeApp === "app"}
                    onClick={() => handleNav("app")}
                  >
                    <LuLaptopMinimal size={14} />
                    App
                  </SidebarItem>
                  <SidebarItem
                    isNested
                    isActive={activeApp === "settings.tools"}
                    onClick={() => handleNav("settings.tools")}
                  >
                    <LuWrench size={14} />
                    Tools
                  </SidebarItem>
                  <SidebarItem
                    isNested
                    isActive={activeApp === "settings.integrations"}
                    onClick={() => handleNav("settings.integrations")}
                  >
                    <LuWaypoints size={14} />
                    Integrations
                  </SidebarItem>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </nav>
      </div>
    </aside>
  );
};
