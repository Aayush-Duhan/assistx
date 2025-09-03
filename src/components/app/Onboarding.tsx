import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { observer } from 'mobx-react-lite';

// --- UI Components ---
import { HeadlessButton } from '../ui/HeadlessButton';
import { Button } from '../ui/Button';
import { Shortcut } from '../ui/Shortcut';
import { CircleCheck, Airplay, Mic, ArrowUpRight, X } from 'lucide-react';
import { Logo } from './Logo';
import { IS_MAC, IS_WINDOWS } from '@/lib/constants';

// --- Constants ---
const MACOS_REQUIRED_VERSION = 13;
const PERMISSION_CHECK_INTERVAL = 5000; // 5 seconds



// --- Hooks ---
import { invoke } from '@/services/electron';

/**
 * Custom hook to manage and check for microphone and screen recording permissions.
 * @param {boolean} enabled - Whether to start checking for permissions.
 * @returns {{ canListen: boolean, canCapture: boolean, checkPermissions: () => void }}
 */
function usePermissions(enabled: boolean) {
    const [canListen, setCanListen] = useState(false);
    const [canCapture, setCanCapture] = useState(false);

    const checkPermissions = React.useCallback(async () => {
        const hasMicPermission = await invoke('request-media-permission', 'microphone');
        const hasScreenPermission = await invoke('request-media-permission', 'screen');
        setCanListen(hasMicPermission);
        setCanCapture(hasScreenPermission);
    }, []);

    useEffect(() => {
        if (!enabled) return;

        checkPermissions();
        const intervalId = setInterval(checkPermissions, PERMISSION_CHECK_INTERVAL);

        return () => clearInterval(intervalId);
    }, [enabled, checkPermissions]);

    return { canListen, canCapture, checkPermissions };
}

// --- Main Onboarding Component ---

/**
 * The main component that orchestrates the entire onboarding flow.
 */
export const Onboarding = observer(() => {
    const [page, setPage] = useState(0);
    const [showIntro, setShowIntro] = useState(true);
    const [showContent, setShowContent] = useState(false);
    const { canListen, canCapture, checkPermissions } = usePermissions(page === 2);

    // --- Effects for managing window size and animations ---

    // Initial animation sequence
    useEffect(() => {
        const hideIntroTimer = setTimeout(() => {
            setShowIntro(false);
            invoke('resize-window', { width: 640, height: 600, duration: 1000 });
        }, 1500);

        const showContentTimer = setTimeout(() => {
            setShowContent(true);
        }, 2000);

        const showFirstPageTimer = setTimeout(() => {
            setPage(1);
        }, 2500);

        return () => {
            clearTimeout(hideIntroTimer);
            clearTimeout(showContentTimer);
            clearTimeout(showFirstPageTimer);
        };
    }, []);

    // Resize window based on the current page
    useEffect(() => {
        if (page === 1) invoke('resize-window', { width: 640, height: 600, duration: 800 });
        if (page === 2) invoke('resize-window', { width: 720, height: 550, duration: 450 });
        if (page === 3) invoke('resize-window', { width: 700, height: 500, duration: 450 });
    }, [page]);

    // --- Content for each page ---

    const welcomePage = (
        <div className="flex flex-col items-center">
            <Logo className="text-white shadow-xl shadow-blue-900 rounded-full fill-current mb-4" />
            <h1 className="mb-6 text-8xl tracking-tight font-semibold">AssistX</h1>
            <div className="text-stone-400 text-base font-base max-w-lg text-balance mx-auto">
                An invisible desktop assistant that sees your screen and hears your audio. Helpful for meetings, sales calls, and more.
            </div>
        </div>
    );

    const permissionsPage = (
        <div className="flex flex-col items-center">
            <h1 className="mb-1 text-5xl tracking-tight font-semibold">Permissions</h1>
            <span className="text-stone-400 text-xl font-base">
                Give AssistX access to see your screen and hear your audio.
            </span>
            <div className="py-26 grid gap-y-7 justify-center">
                <PermissionRequest
                    icon={Mic}
                    providerList={{ canListen, canCapture, checkPermissions }}
                    title="Microphone"
                >
                    Allows AssistX to listen to conversations.
                </PermissionRequest>
                <PermissionRequest
                    icon={Airplay}
                    providerList={{ canListen, canCapture, checkPermissions }}
                    title="Screen Recording"
                >
                    Allow AssistX to see your screen.
                </PermissionRequest>
            </div>
            <div className="grid justify-center text-[10px] text-stone-400">
                <div className="text-blue-300 text-xs font-medium text-center w-86 mx-auto">
                    AssistX may not be able to update permissions until it is quit. Please restart AssistX after granting all permissions.
                    <HeadlessButton
                        type="button"
                        className="mt-1 text-xs text-stone-300 cursor-pointer focus:outline-none"
                        style={{ appRegion: 'no-drag' } as any}
                        onClick={() => window.open("https://support.cluely.com")}
                    >
                        Having issues? Click here <ArrowUpRight className="inline -ml-0.5 -mt-1" size={14} />
                    </HeadlessButton>
                </div>
            </div>
        </div>
    );

    const commandsPage = (
        <div className="flex flex-col items-center">
            <h1 className="mt-14 text-3xl tracking-tight font-semibold">Commands we love</h1>
            <span className="text-stone-300 text-md font-base">
                AssistX works with these easy to remember commands.
            </span>
            <div className="pb-22 pt-8 grid divide-y divide-white/10 justify-center">
                <OnboardingCommands title="Ask AI" description="Ask AI assistant for help">
                    <Shortcut large accelerator="CommandOrControl+Enter" />
                </OnboardingCommands>
                <OnboardingCommands title="Hide/Show" description="Toggle visibility of AssistX">
                    <Shortcut large accelerator="CommandOrControl+\" />
                </OnboardingCommands>
                <OnboardingCommands title="Clear" description="Reset and clear current conversation">
                    <Shortcut large accelerator="CommandOrControl+R" />
                </OnboardingCommands>
            </div>
        </div>
    );

    const pages = [welcomePage, permissionsPage, commandsPage];

    return (
        <AnimatePresence>
            {showContent ? (
                <motion.div
                    className="pointer-events-auto dark"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ duration: 0.5 }}
                >
                    <OnboardingLayout
                        data={{ canListen, canCapture, page, setPage }}
                        children={pages[page - 1]} // page is 1-indexed for content
                    />
                </motion.div>
            ) : (
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.5 }}
                    className="h-screen w-screen bg-gradient-to-t from-blue-950/95 to-black/95 flex items-center justify-center"
                >
                    <motion.div
                        initial={{ opacity: 0, scale: 0.2 }}
                        animate={{ opacity: showIntro ? 1 : 0, scale: showIntro ? 1 : 0.8 }}
                        transition={{ duration: 0.4, ease: [0.34, 1.56, 0.64, 1], scale: { type: 'spring', damping: 10, stiffness: 100 } }}
                    >
                        <Logo className="fill-white shadow-xl shadow-blue-900 rounded-full" />
                    </motion.div>
                </motion.div>
            )}
        </AnimatePresence>
    );
});

// --- Sub-components for Onboarding ---

/**
 * Layout wrapper for each onboarding step.
 */
function OnboardingLayout({ data, children }: {
    data: any;
    children: React.ReactNode;
}) {
    const { canListen, canCapture, page, setPage } = data;
    const [isMacSupported, setIsMacSupported] = useState<boolean | null>(null);

    const handleNext = async () => {
        if (page < 3) {
            // On Windows, skip the permissions page (page 2)
            setPage(IS_WINDOWS && page === 1 ? 3 : page + 1);
        } else {
            try {
                // Main process will handle setting onboarded to true and relaunching the app
                invoke('finish-onboarding', null);
            } catch (error) {
                console.error('Failed to complete onboarding:', error);
            }
        }
    };

    const handleBack = () => {
        if (page > 1) {
            setPage(IS_WINDOWS && page === 3 ? 1 : page - 1);
        }
    };

    // Check for macOS version support on mount
    useEffect(() => {
        if (IS_MAC) {
            // For now, assume macOS is supported since we don't have the vne function
            setIsMacSupported(true);
        }
    }, []);

    return (
        <main style={{ appRegion: 'drag' } as any} className="overflow-hidden w-screen h-screen">
            <motion.div
                className="relative shadow-md inset-ring-1 inset-ring-zinc-400/22 border-[0.5px] border-black/80 bg-gradient-to-t from-blue-950/95 to-black/95 text-white w-full h-full overflow-hidden"
                style={{ borderRadius: 20 }}
                transition={{ duration: 0.45 }}
                layout
            >
                <AnimatePresence mode="wait">
                    {page !== 0 && (
                        <motion.div
                            key={page}
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            transition={{ duration: 0.3 }}
                            className="absolute right-2 top-2"
                        >
                            <HeadlessButton
                                style={{ appRegion: 'no-drag' } as any}
                                className="p-2 relative z-[500] rounded-xl hover:bg-white/8 transition hover:text-red-400"
                                onClick={() => invoke('quit-app', null)}
                            >
                                <X size={20} />
                            </HeadlessButton>
                        </motion.div>
                    )}
                </AnimatePresence>
                <AnimatePresence mode="wait">
                    {page !== 0 && (
                        <motion.div
                            key={page}
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            transition={{ duration: 0.3 }}
                            className="text-center absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-full px-8"
                        >
                            {children}
                        </motion.div>
                    )}
                </AnimatePresence>
                {IS_MAC && isMacSupported !== null && !isMacSupported ? (
                    <div className="text-red-400 font-medium text-center -mt-16 pb-4">
                        AssistX requires macOS {MACOS_REQUIRED_VERSION}.0 or later. Please update your operating system.
                    </div>
                ) : (
                    <AnimatePresence mode="wait">
                        {page !== 0 && (
                            <motion.div
                                key={page}
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                exit={{ opacity: 0 }}
                                transition={{ duration: 0.3 }}
                                className="absolute bottom-4 right-4"
                                style={{ appRegion: 'no-drag' } as any}
                            >
                                {page === 2 && canListen && canCapture ? (
                                    <Button color="dark" onClick={handleNext}>
                                        Next
                                        <Shortcut shouldHover={false} onTrigger={handleNext} accelerator="CommandOrControl+Enter" />
                                    </Button>
                                ) : (
                                    <Button
                                        disabled={page === 2}
                                        className="disabled:cursor-default"
                                        color={page === 3 ? "blue" : "dark"}
                                        onClick={handleNext}
                                    >
                                        {page === 1 && "Get Started"}
                                        {page === 2 && "Next"}
                                        {page === 3 && "Welcome to AssistX"}
                                        <Shortcut shouldHover={false} onTrigger={page === 2 ? undefined : handleNext} accelerator="CommandOrControl+Enter" />
                                    </Button>
                                )}
                            </motion.div>
                        )}
                    </AnimatePresence>
                )}
                {page > 1 && (
                    <div className="absolute bottom-4 left-4" style={{ appRegion: 'no-drag' } as any}>
                        <Button level="standard" onClick={handleBack}>Back</Button>
                    </div>
                )}
            </motion.div>
        </main>
    );
}

/**
 * A row component for requesting a single permission.
 */
function PermissionRequest({ providerList, icon: Icon, title, children }: {
    providerList: { canListen: boolean; canCapture: boolean; checkPermissions: () => void };
    icon: React.ComponentType<any>;
    title: string;
    children: React.ReactNode;
}) {
    const { canListen, canCapture, checkPermissions } = providerList;

    const renderStatus = () => {
        if (title === "Microphone") {
            return canListen ? (
                <CircleCheck size={30} className="stroke-sky-500" />
            ) : (
                <Button level="standard" style={{ appRegion: 'no-drag' } as any} onClick={() => {
                    invoke('mac-open-system-settings', { section: "privacy > microphone" });
                    checkPermissions();
                }}>
                    Request...
                </Button>
            );
        }
        if (title === "Screen Recording") {
            return canCapture ? (
                <CircleCheck size={30} className="stroke-sky-500" />
            ) : (
                <Button level="standard" style={{ appRegion: 'no-drag' } as any} onClick={() => {
                    invoke('mac-open-system-settings', { section: "privacy > screen-recording" });
                    checkPermissions();
                }}>
                    Request...
                </Button>
            );
        }
    };

    return (
        <div className="text-left flex justify-between items-center gap-x-40">
            <div className="flex">
                <Icon size={28} className="mr-5 mt-2.5 text-stone-200 shadow-inner" />
                <div>
                    <h2 className="text-lg font-semibold">{title}</h2>
                    <p className="text-stone-400 text-xs">{children}</p>
                </div>
            </div>
            {renderStatus()}
        </div>
    );
}

/**
 * A row component for displaying a command and its shortcut.
 */
function OnboardingCommands({ title, description, children }: {
    title: string;
    description: string;
    children: React.ReactNode;
}) {
    return (
        <div className="text-left flex justify-between items-center gap-x-40">
            <div className="grid grid-rows-2">
                <h2 className="text-[18px] font-semibold">{title}</h2>
                <h3 className="text-sm text-zinc-400 font-medium">{description}</h3>
            </div>
            <p className="text-stone-400 text-xs">{children}</p>
        </div>
    );
}

export default Onboarding; 