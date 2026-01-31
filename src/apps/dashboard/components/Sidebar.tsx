import { useState } from "react";
import { cn } from "@/lib/utils";
import { Logo } from "@/components/Logo";
import { SidebarSection } from "./SidebarSection";
import { sidebarData, getAllSidebarItems } from "./sidebarData";

interface SidebarProps {
  activePage: string;
  onPageChange: (key: string) => void;
  isCollapsed: boolean;
}

export function Sidebar({ activePage, onPageChange, isCollapsed }: SidebarProps) {
  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({
    main: true,
    features: true,
    tools: true,
  });

  const toggleSection = (section: string) => {
    setExpandedSections((prev) => ({
      ...prev,
      [section]: !prev[section],
    }));
  };

  const allItems = getAllSidebarItems();

  return (
    <div
      className={cn(
        "h-full rounded-2xl bg-zinc-900/50 flex flex-col transition-all duration-300 ease-in-out relative overflow-hidden",
        isCollapsed ? "w-[60px]" : "w-[230px]",
      )}
    >
      {/* Shiny top border gradient */}
      {!isCollapsed && (
        <div
          className="absolute top-0 left-0 right-0 h-[1px] pointer-events-none"
          style={{
            background:
              "linear-gradient(90deg, transparent 0%, rgba(255,255,255,0.1) 20%, rgba(255,255,255,0.4) 50%, rgba(255,255,255,0.1) 80%, transparent 100%)",
          }}
        />
      )}

      {/* Logo section */}
      <div className={cn("flex items-center gap-3 p-3", isCollapsed ? "justify-center" : "px-4")}>
        <Logo size={28} animate={false} />
        {!isCollapsed && <span className="text-zinc-100 font-semibold text-lg">AssistX</span>}
      </div>

      {/* Sidebar Content - Expanded */}
      {!isCollapsed && (
        <div className="flex-1 overflow-y-auto">
          <SidebarSection
            title={sidebarData.main.title}
            items={sidebarData.main.items}
            isExpanded={expandedSections.main}
            onToggle={() => toggleSection("main")}
            activePage={activePage}
            onPageChange={onPageChange}
          />
          <div className="mx-3 my-2 h-px bg-zinc-800" />
          <SidebarSection
            title={sidebarData.features.title}
            items={sidebarData.features.items}
            isExpanded={expandedSections.features}
            onToggle={() => toggleSection("features")}
            activePage={activePage}
            onPageChange={onPageChange}
          />
          <div className="mx-3 my-2 h-px bg-zinc-800" />
          <SidebarSection
            title={sidebarData.tools.title}
            items={sidebarData.tools.items}
            isExpanded={expandedSections.tools}
            onToggle={() => toggleSection("tools")}
            activePage={activePage}
            onPageChange={onPageChange}
          />
        </div>
      )}

      {/* Sidebar Content - Collapsed (Icons only) */}
      {isCollapsed && (
        <div className="flex-1 overflow-y-auto">
          <div className="flex flex-col items-center gap-1">
            {allItems.map((item) => (
              <button
                key={item.key}
                title={item.label}
                onClick={() => onPageChange(item.key)}
                className={cn(
                  "p-3 rounded-lg transition-colors [&_svg]:w-5 [&_svg]:h-5",
                  activePage === item.key
                    ? "text-zinc-100 bg-white/10"
                    : "text-zinc-500 hover:text-zinc-300 hover:bg-white/5",
                )}
              >
                {item.icon}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
