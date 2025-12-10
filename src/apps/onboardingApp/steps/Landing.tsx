import { OnboardingPage } from "../components/onboarding-page";
import OnboardingButton from "../components/ob-button";
import { useDarkMode } from "usehooks-ts";
import { useSharedState, updateState } from "@/shared/shared";

export default function Landing() {
    const { isDarkMode } = useDarkMode();
    const { onboardingState } = useSharedState();

    const handleContinue = () => {
        updateState({
            onboardingState: {
                ...onboardingState,
                didCompleteLanding: true,
            },
        });
    };

    return (
        <OnboardingPage className={`relative overflow-hidden ${isDarkMode ? "bg-[#0f0f0f]" : "bg-[#EDEEF2]"}`}>
            {/* Geometric Grid Background - suggests structure and precision */}
            <div
                className="absolute inset-0 z-[1] pointer-events-none"
                style={{
                    backgroundImage: isDarkMode
                        ? `linear-gradient(rgba(255,255,255,0.08) 1px, transparent 1px),
                           linear-gradient(90deg, rgba(255,255,255,0.08) 1px, transparent 1px)`
                        : `linear-gradient(rgba(0,0,0,0.06) 1px, transparent 1px),
                           linear-gradient(90deg, rgba(0,0,0,0.06) 1px, transparent 1px)`,
                    backgroundSize: "48px 48px",
                }}
            />

            {/* Noise Overlay for premium tactile feel */}
            <div
                className="absolute inset-0 z-[2] pointer-events-none opacity-[0.03]"
                style={{
                    backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)'/%3E%3C/svg%3E")`,
                }}
            />

            {/* Wave SVG Background */}
            <div className="absolute bottom-0 left-0 w-full z-10 pointer-events-none">
                <svg
                    viewBox="0 0 1400 600"
                    preserveAspectRatio="none"
                    xmlns="http://www.w3.org/2000/svg"
                    xmlnsXlink="http://www.w3.org/1999/xlink"
                >
                    <defs>
                        <path
                            id="wave-path"
                            d="M 0 390.8765710297349 C 93.3 404.0, 186.7 448.4, 280.0 471.4 C 373.3 494.3, 466.7 490.2, 560.0 442.4 C 653.3 394.5, 746.7 305.2, 840.0 221.0 C 933.3 136.8, 1026.7 64.0, 1120.0 37.0 C 1213.3 10.0, 1306.7 28.7, 1400.0 59.4 V 600 H 0 Z"
                        />
                        <linearGradient id="grad-fill" x1="50%" y1="0%" x2="50%" y2="100%">
                            <stop offset="0%" style={{ stopColor: "#ffb366", stopOpacity: 1 }} />
                            <stop offset="25%" style={{ stopColor: "#e8913f", stopOpacity: 1 }} />
                            <stop offset="80%" style={{ stopColor: "#b35f18", stopOpacity: 1 }} />
                            <stop offset="100%" style={{ stopColor: "#8a430c", stopOpacity: 1 }} />
                        </linearGradient>
                        <linearGradient id="grad-shine" x1="50%" y1="0%" x2="50%" y2="40%">
                            <stop offset="0%" style={{ stopColor: "#fff", stopOpacity: 0.25 }} />
                            <stop offset="100%" style={{ stopColor: "#fff", stopOpacity: 0 }} />
                        </linearGradient>
                        <filter id="shadow-blur">
                            <feGaussianBlur stdDeviation={15} />
                        </filter>
                        <filter id="inner-shadow" x="-50%" y="-50%" width="200%" height="200%">
                            <feFlood floodColor="#000" floodOpacity={0.6} result="flood" />
                            <feComposite in="flood" in2="SourceAlpha" operator="out" result="inverse" />
                            <feGaussianBlur in="inverse" stdDeviation={8} result="blurred" />
                            <feOffset in="blurred" dy={8} result="offsetBlur" />
                            <feComposite in="offsetBlur" in2="SourceAlpha" operator="in" result="shadow" />
                            <feComposite in="shadow" in2="SourceGraphic" />
                        </filter>
                    </defs>
                    <g>
                        <use href="#wave-path" opacity={0.5} filter="url(#shadow-blur)" fill="#000" transform="translate(0, 10)" />
                        <use href="#wave-path" fill="url(#grad-fill)" filter="url(#inner-shadow)" />
                        <use href="#wave-path" fill="url(#grad-shine)" opacity={0.8} style={{ mixBlendMode: "overlay" }} />
                    </g>
                </svg>
            </div>

            {/* Main Content - Two Column Layout */}
            <div className="flex flex-row w-full h-full z-10 relative">
                {/* Left Column - Content */}
                <div className="flex-1 flex flex-col justify-between p-12 max-w-[500px]">
                    {/* Logo */}
                    <div className="flex items-center gap-2">
                        <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-[#ffb366] to-[#b35f18] flex items-center justify-center">
                            <svg
                                xmlns="http://www.w3.org/2000/svg"
                                viewBox="0 0 24 24"
                                fill="none"
                                stroke="white"
                                strokeWidth="2.5"
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                className="w-4 h-4"
                            >
                                <path d="M12 2L2 7l10 5 10-5-10-5z" />
                                <path d="M2 17l10 5 10-5" />
                                <path d="M2 12l10 5 10-5" />
                            </svg>
                        </div>
                        <span className={`text-xl font-semibold ${isDarkMode ? "text-[#F0F0F0]" : "text-[#1a1a1a]"}`}>
                            AssistX
                        </span>
                    </div>

                    {/* Main Content */}
                    <div className="flex flex-col gap-6">
                        <div className="flex flex-col gap-4">
                            <h1 className={`text-4xl font-bold leading-tight tracking-tight ${isDarkMode ? "text-[#F0F0F0]" : "text-[#1a1a1a]"}`}>
                                Your Intelligent<br />
                                <span className="text-[#e8913f]">AI</span> Companion.
                            </h1>
                            <p className={`text-lg ${isDarkMode ? "text-[#A0A0A0]" : "text-[#6B6B6D]"}`}>
                                The open-source AI for smarter, more<br />
                                productive workflows.
                            </p>
                        </div>

                        <div className="flex flex-col gap-3">
                            <OnboardingButton
                                onClick={handleContinue}
                                className="w-fit px-8"
                                size="fit"
                            >
                                Get Started
                            </OnboardingButton>

                            {/* Trust signal - right below the CTA */}
                            <div className={`flex items-center gap-2 text-xs ${isDarkMode ? "text-[#888]" : "text-[#888]"}`}>
                                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-3.5 h-3.5">
                                    <polyline points="20 6 9 17 4 12" />
                                </svg>
                                <span>100% free and open source. No account required.</span>
                            </div>
                        </div>
                    </div>

                    {/* Footer - empty spacer for layout balance */}
                    <div />
                </div>


                {/* Right Column - Demo Preview */}
                <div className="flex-1 flex items-center justify-center p-8 relative">
                    {/* App Preview Card */}
                    <div className="relative w-full max-w-[420px]">
                        {/* Mock App Window - refined glassmorphism with enhanced depth */}
                        <div
                            className="rounded-2xl overflow-hidden backdrop-blur-2xl bg-[#1a1a1a]/85"
                            style={{
                                border: "1px solid rgba(255, 255, 255, 0.1)",
                                boxShadow: `
                                    0 1px 2px rgba(0, 0, 0, 0.3),
                                    0 4px 8px rgba(0, 0, 0, 0.25),
                                    0 12px 24px rgba(0, 0, 0, 0.2),
                                    0 24px 48px rgba(0, 0, 0, 0.15),
                                    0 32px 64px rgba(232, 145, 63, 0.2),
                                    0 48px 96px rgba(255, 179, 102, 0.1)
                                `
                            }}
                        >
                            {/* Window Header */}
                            <div className="flex items-center justify-between px-4 py-3 border-b bg-[#ffffff06] border-[#ffffff08]">
                                <div className="flex items-center gap-2">
                                    <span className="text-sm font-medium text-[#F0F0F0]">
                                        AssistX
                                    </span>
                                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="#888" strokeWidth="2" className="w-4 h-4">
                                        <polyline points="6 9 12 15 18 9" />
                                    </svg>
                                </div>
                                <div className="flex items-center gap-2">
                                    <div className="w-6 h-6 rounded flex items-center justify-center bg-[#ffffff15]">
                                        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="#888" strokeWidth="2" className="w-3 h-3">
                                            <rect x="6" y="4" width="4" height="16" />
                                            <rect x="14" y="4" width="4" height="16" />
                                        </svg>
                                    </div>
                                    <div className="w-6 h-6 rounded flex items-center justify-center bg-[#ffffff15]">
                                        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="#888" strokeWidth="2" className="w-3 h-3">
                                            <rect x="3" y="3" width="18" height="18" rx="2" />
                                        </svg>
                                    </div>
                                    <div className="w-6 h-6 rounded flex items-center justify-center bg-[#ffffff15]">
                                        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="#888" strokeWidth="2" className="w-3 h-3">
                                            <line x1="18" y1="6" x2="6" y2="18" />
                                            <line x1="6" y1="6" x2="18" y2="18" />
                                        </svg>
                                    </div>
                                </div>
                            </div>

                            {/* Chat Content */}
                            <div className="p-4 space-y-4">
                                {/* AI Response Bubble */}
                                <div className="flex justify-end">
                                    <div className="bg-gradient-to-r from-[#e8913f] to-[#ffb366] text-[#111111] px-4 py-2 rounded-2xl rounded-tr-sm text-sm max-w-[200px]">
                                        How can I help you today?
                                    </div>
                                </div>

                                {/* Search Result Card */}
                                <div className="rounded-xl p-4 space-y-3 bg-[#ffffff10]">
                                    <div className="flex items-center gap-2 text-xs text-[#999]">
                                        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-3 h-3">
                                            <circle cx="11" cy="11" r="8" />
                                            <line x1="21" y1="21" x2="16.65" y2="16.65" />
                                        </svg>
                                        Searched records
                                    </div>
                                    <p className="text-sm leading-relaxed text-[#E0E0E0]">
                                        "I can help you with coding, writing, analysis, and much more. Just ask me anything!"
                                    </p>
                                </div>

                                {/* Quick Actions */}
                                <div className="flex gap-2 flex-wrap">
                                    <div className="flex items-center gap-1 px-3 py-1.5 rounded-full text-xs bg-[#ffffff10] text-[#B0B0B0]">
                                        <span className="text-[#ffb366]">▼</span> Generate code
                                    </div>
                                    <div className="flex items-center gap-1 px-3 py-1.5 rounded-full text-xs bg-[#ffffff10] text-[#B0B0B0]">
                                        <span className="text-[#ffb366]">↻</span> Explain concept
                                    </div>
                                </div>

                                {/* Input Field */}
                                <div className="rounded-xl px-4 py-3 flex items-center gap-2 bg-[#ffffff10]">
                                    <span className="text-sm text-[#777]">Ask</span>
                                    <div className="flex gap-1">
                                        <span className="px-1.5 py-0.5 rounded text-xs bg-[#ffffff15] text-[#999]">Ctrl</span>
                                        <span className="px-1.5 py-0.5 rounded text-xs bg-[#ffffff15] text-[#999]">↵</span>
                                    </div>
                                    <span className="text-sm text-[#777]">to start typing</span>
                                </div>
                            </div>
                        </div>

                    </div>
                </div>
            </div>

        </OnboardingPage>
    );
}
