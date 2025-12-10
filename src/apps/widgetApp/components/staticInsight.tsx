import type { CentralIconBaseProps } from "@central-icons-react/round-filled-radius-2-stroke-1.5";
import type { LucideProps } from "lucide-react";
import type { FC, ForwardRefExoticComponent, RefAttributes } from "react";
import { twMerge } from "tailwind-merge";

export type StaticInsightIcon =
  | ForwardRefExoticComponent<Omit<LucideProps, "ref"> & RefAttributes<SVGSVGElement>>
  | FC<CentralIconBaseProps>;

export function StaticInsight({
  className,
  icon: Icon,
  onClick,
  children,
}: {
  className?: string;
  icon?: StaticInsightIcon;
  onClick?: () => void;
  children: string;
}) {
  return (
    <div onClick={onClick} className="py-[1.5px] px-[1.5px] group/static-insight max-w-full">
      <div
        className={twMerge(
          "max-w-full text-left rounded-full pl-1.5 pr-2 py-2 h-fit inline-flex items-center gap-1.5",
          "group-hover/static-insight:bg-[#EDEEF2]/10 group-hover/static-insight:border-shade-12/30 transition duration-75 ease-out",
          !onClick && "pointer-events-none",
          className,
        )}
      >
        {Icon ? (
          <div className="shrink-0 text-foreground group-hover/static-insight:text-primary-foreground transition-colors duration-150">
            <Icon className="size-3.5" />
          </div>
        ) : null}
        <span className="truncate text-xs leading-none text-primary-foreground">{children}</span>
      </div>
    </div>
  );
}
