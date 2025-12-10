import { cn } from "@/lib/utils";
import { Dashboard } from "./DashBoard";
import { observer } from "mobx-react-lite";
import { IS_DEV } from "@/shared/constants";

export const DashboardWindow = observer(() => {
    return (
        <div className="size-full">
            <div className="relative size-full bg-black">
                <Dashboard />
                <DevModeIndicator />
            </div>
        </div>
    );
});

function DevModeIndicator() {
    if (IS_DEV) {
        return (
            <DevModePill className="bg-emerald-500/15 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-400 inset-ring-emerald-400/10">
                Dev build
            </DevModePill>
        );
    }

    return null;
}

function DevModePill({ className, children }: { className?: string; children?: React.ReactNode }) {
    return (
        <div className="absolute bottom-2 right-2 hover:opacity-0 transition duration-200 group">
            <div
                className={cn(
                    "inline-flex items-center gap-x-1.5 rounded-full px-2 py-0.5 text-xs/5 font-medium tracking-tight inset-ring group-hover:pointer-events-none",
                    className,
                )}
            >
                {children}
            </div>
        </div>
    );
}
