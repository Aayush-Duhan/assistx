import { useEffect, useState } from "react";
import { TrafficLights } from "../TrafficLights";
import { AnimatePresence, motion } from "framer-motion";
import { HeadlessButton } from "../ui/HeadlessButton";
import { observer } from "mobx-react-lite";
import { Logo } from "../app/Logo";
import { useAtom, useSetAtom } from "jotai";
import { activeAppAtom, settingsWindowVisibleAtom } from "@/state/atoms";
import { Tooltip } from "../ui/Tooltip";
import { Activity, BookOpen, ChevronRight, Eye, EyeOff, LaptopMinimal, Settings, Waypoints, Wrench } from "lucide-react";
import { useInvisibility } from "@/hooks/useInvisibility";

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
const SidebarItem = observer(({ isActive, isParent = false, isNested = false, isHidden = false, isExpanded = false, onToggleExpand, onClick, children }: SidebarItemProps) => (
    <motion.div
        className="w-full"
        initial={{ y: -4, opacity: 0 }}
        animate={{ y: isHidden ? -4 : 0, opacity: isHidden ? 0 : 1 }}
        transition={{ duration: 0.15, ease: 'easeOut' }}
    >
        <HeadlessButton
            role="menuitem"
            aria-current={isActive ? 'page' : undefined}
            aria-expanded={isParent ? isExpanded : undefined}
            aria-haspopup={isParent ? 'menu' : undefined}
            className={`group relative w-full flex ${isParent ? 'justify-between' : 'justify-start'} items-center gap-2 rounded px-2 py-2 text-left text-sm text-white/70 transition duration-150 hover:text-white hover:bg-white/10 focus:outline-none focus-visible:ring-1 focus-visible:ring-white/30 cursor-pointer ${isHidden ? 'pointer-events-none' : ''} ${isNested ? 'pl-5' : ''} ${isActive && isParent ? 'bg-white/5 text-white' : ''} ${isActive && !isParent ? 'bg-white/10 text-white' : ''}`}
            onClick={onClick}
        >
            <span aria-hidden className={`absolute left-0 top-1 bottom-1 w-[2px] rounded ${isActive ? 'bg-white/70 opacity-100' : 'bg-white/30 opacity-0 group-hover:opacity-60'}`} />
            <span className="flex items-center gap-2 min-w-0">
                {children}
            </span>
            {isParent && (
                <span
                    role="button"
                    aria-label={isExpanded ? 'Collapse' : 'Expand'}
                    className="ml-2 rounded p-1 hover:bg-white/10 focus-visible:ring-1 focus-visible:ring-white/30"
                    onClick={(e) => {
                        e.stopPropagation();
                        onToggleExpand?.();
                    }}
                >
                    <ChevronRight className={`size-3.5 shrink-0 text-white/60 transition-transform ${isExpanded ? 'rotate-90 text-white/80' : ''}`} />
                </span>
            )}
        </HeadlessButton>
    </motion.div>
));

export const SettingSideBar = ({ onNavToSamePage }: { onNavToSamePage: () => void }) => {
    const [activeApp, setActiveApp] = useAtom(activeAppAtom);
    const setWindowVisible = useSetAtom(settingsWindowVisibleAtom);
    const { isInvisible } = useInvisibility();

    const handleNav = (app: 'app' | 'activity' | 'personalize' | 'settings.tools' | 'settings.security' | 'settings.integrations') => {
        if (activeApp === app) {
            onNavToSamePage();
        } else {
            setActiveApp(app);
        }
    };

    const isSettingsActive = ['app', 'settings.tools', 'settings.security', 'settings.integrations'].includes(activeApp);
    const [isSettingsExpanded, setIsSettingsExpanded] = useState<boolean>(isSettingsActive);
    useEffect(() => {
        setIsSettingsExpanded(isSettingsActive);
    }, [isSettingsActive]);

    return (
        <aside className="relative h-full p-2 border-white/10 bg-black border-r shadow-inner flex flex-col" aria-label="Settings sidebar">
            <TrafficLights className="ml-1 mt-1" onClose={() => setWindowVisible(false)} />
            <div className="absolute top-3 right-3 flex items-center gap-3">
                <Tooltip tooltipContent={`AssistX is currently ${isInvisible ? 'invisible' : 'visible'} to screen capture.`} position="bottom">
                    {isInvisible ? (
                        <EyeOff className="size-3.5 stroke-white/80" />
                    ) : (
                        <Eye className="size-3.5 stroke-white/80" />
                    )}
                </Tooltip>
            </div>
            <div className="mt-5 ml-1 flex items-center gap-2">
                <Logo className="size-5" />
                <div className="text-white text-sm font-semibold">AssistX</div>
            </div>

            <nav className="mt-5 flex-1" role="menu">
                <div className="px-2 text-[10px] uppercase tracking-wider text-white/40">General</div>
                <div className="mt-2 space-y-1">
                    <SidebarItem isActive={activeApp === 'activity'} onClick={() => handleNav('activity')}>
                        <Activity size={14} />
                        My Activity
                    </SidebarItem>
                    <SidebarItem isActive={activeApp === 'personalize'} onClick={() => handleNav('personalize')}>
                        <BookOpen size={14} />
                        Personalize
                    </SidebarItem>
                </div>

                <div className="mt-4 px-2 text-[10px] uppercase tracking-wider text-white/40">Settings</div>
                <div className="mt-2 space-y-1">
                    <SidebarItem
                        isParent
                        isExpanded={isSettingsExpanded}
                        isActive={isSettingsActive}
                        onClick={() => {
                            if (!isSettingsExpanded) setIsSettingsExpanded(true);
                            handleNav('app');
                        }}
                        onToggleExpand={() => setIsSettingsExpanded((v) => !v)}
                    >
                        <Settings size={14} />
                        Settings
                    </SidebarItem>

                    <AnimatePresence initial={false}>
                        {isSettingsExpanded && (
                            <motion.div
                                key="settings-group"
                                initial={{ height: 0, opacity: 0 }}
                                animate={{ height: 'auto', opacity: 1 }}
                                exit={{ height: 0, opacity: 0 }}
                                transition={{ duration: 0.15, ease: 'easeOut' }}
                                className="space-y-1 overflow-hidden"
                            >
                                <SidebarItem isNested isActive={activeApp === 'app'} onClick={() => handleNav('app')}>
                                    <LaptopMinimal size={14} />
                                    App
                                </SidebarItem>
                                <SidebarItem isNested isActive={activeApp === 'settings.tools'} onClick={() => handleNav('settings.tools')}>
                                    <Wrench size={14} />
                                    Tools
                                </SidebarItem>
                                <SidebarItem isNested isActive={activeApp === 'settings.integrations'} onClick={() => handleNav('settings.integrations')}>
                                    <Waypoints size={14} />
                                    Integrations
                                </SidebarItem>
                            </motion.div>
                        )}
                    </AnimatePresence>
                </div>
            </nav>
        </aside>
    )
}