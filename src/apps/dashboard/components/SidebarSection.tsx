import { LuChevronDown } from "react-icons/lu";
import { cn } from "@/lib/utils";
import { AnimatePresence, motion } from "framer-motion";
import { SidebarSectionProps } from "./types";

export function SidebarSection({
  title,
  items,
  isExpanded,
  onToggle,
  activePage,
  onPageChange,
}: SidebarSectionProps) {
  return (
    <div className="mb-2">
      <button
        onClick={onToggle}
        className="flex items-center justify-between w-full px-3 py-2 text-left hover:bg-white/5 transition-colors"
      >
        <span className="text-xs font-medium tracking-wide text-zinc-200">{title}</span>
        <LuChevronDown
          className={cn(
            "w-4 h-4 text-zinc-400 transition-transform duration-200",
            !isExpanded && "-rotate-90",
          )}
        />
      </button>
      <AnimatePresence initial={false}>
        {isExpanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2, ease: "easeOut" }}
            className="overflow-hidden"
          >
            <div className="relative pl-3">
              {/* Vertical line */}
              <div
                className="absolute left-5 top-0 w-[1.5px] bg-zinc-700"
                style={{ height: `calc(100% - 16px)` }}
              />
              {items.map((item, index) => {
                const isLast = index === items.length - 1;
                const isActive = activePage === item.key;
                return (
                  <div key={item.key} className="relative flex items-center group left-2">
                    {/* Curvy branch connector using SVG */}
                    <svg
                      className="flex-shrink-0"
                      width="8"
                      height="24"
                      viewBox="0 0 14 24"
                      fill="none"
                    >
                      {/* Vertical line segment (only if not last) */}
                      {!isLast && (
                        <line x1="0" y1="12" x2="0" y2="24" stroke="#3f3f46" strokeWidth="1" />
                      )}
                      {/* Curved connector - more pronounced curve */}
                      <path
                        d="M 0 0 L 0 2 C 0 10 0 12 12 11"
                        stroke="#3f3f46"
                        strokeWidth="2"
                        fill="none"
                      />
                    </svg>
                    <button
                      onClick={() => onPageChange(item.key)}
                      className={cn(
                        "flex-1 flex items-center gap-2 px-2 py-1.5 text-left text-xs rounded transition-colors",
                        isActive
                          ? "text-zinc-100 bg-white/10"
                          : "text-zinc-500 hover:text-zinc-300 hover:bg-white/5",
                      )}
                    >
                      <span
                        className={cn(
                          "flex-shrink-0 transition-colors",
                          isActive ? "text-zinc-300" : "text-zinc-600 group-hover:text-zinc-400",
                        )}
                      >
                        {item.icon}
                      </span>
                      {item.label}
                    </button>
                  </div>
                );
              })}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
