import { useSharedState } from "@/shared/shared";
import { twMerge } from "tailwind-merge";

export function WindowHiddenWrapper({
  className,
  children,
}: {
  className?: string;
  children: React.ReactNode;
}) {
  const { windowHidden } = useSharedState();

  return (
    <div
      className={twMerge(
        "w-full h-full transition ease-out duration-75",
        windowHidden && "opacity-0 scale-97",
        className,
      )}
    >
      {children}
    </div>
  );
}
