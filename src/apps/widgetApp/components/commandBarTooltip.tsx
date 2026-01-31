import type { ReactNode } from "react";
import { kit } from "@/components/kit";

type Props = {
  children: ReactNode;
  tooltip: string;
};

export function CommandBarTooltip({ children, tooltip }: Props) {
  return (
    <kit.Tooltip tooltipContent={tooltip} gap={12} position="top">
      {children}
    </kit.Tooltip>
  );
}
