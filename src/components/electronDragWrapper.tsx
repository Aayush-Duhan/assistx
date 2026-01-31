import { twMerge } from "tailwind-merge";

export function ElectronDragWrapper({
  className,
  children,
}: {
  className?: string;
  children?: React.ReactNode;
}) {
  return <div className={twMerge("[-webkit-app-region:drag]", className)}>{children}</div>;
}
