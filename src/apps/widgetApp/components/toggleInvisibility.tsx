import { IconEyeOpen, IconEyeSlash2 } from "@central-icons-react/round-filled-radius-2-stroke-1.5";
import { updateState, useSharedState } from "@/shared";
import { AnimatePresence, motion } from "motion/react";
import { useRef, useState } from "react";
import { twMerge } from "tailwind-merge";
import { kit } from "@/components/kit";
import { APP_NAME } from "@/shared";
import { isWin } from "@/lib/platform";

export default function ToggleInvisibility() {
  const [isConfirming, setIsConfirming] = useState(false);
  const { undetectabilityEnabled } = useSharedState();

  const ref = useRef<HTMLDivElement>(null);

  const CurrentIcon = undetectabilityEnabled ? IconEyeSlash2 : IconEyeOpen;
  const OppositeIcon = undetectabilityEnabled ? IconEyeOpen : IconEyeSlash2;

  return (
    <motion.div
      ref={ref}
      className={twMerge(
        "text-primary-foreground flex items-center rounded-full group border-[0.5px] h-7.5 border-transparent transition-[border,box-shadow]",
        isConfirming ? "border-white/20 shadow-pane-action" : "hover:bg-surface-action-hover",
      )}
      initial={false}
      animate={{
        width: isConfirming ? 62 : 30,
      }}
      transition={{ type: "spring", damping: 32, stiffness: 500 }}
    >
      <AnimatePresence mode="popLayout" initial={false}>
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.9 }}
          whileHover={{ scale: 1.05 }}
          key="current"
          transition={{ duration: 0.1, ease: "easeOut" }}
          onClick={() => {
            if (isConfirming) {
              setIsConfirming(false);
            } else {
              setIsConfirming(true);
            }
          }}
          className={twMerge(
            "h-7.5 w-fit flex justify-center items-center cursor-pointer shrink-0 group-hover:not-hover:text-muted-foreground py-1.5 transition-[color,padding]",
            isConfirming ? "px-2" : "px-1.5",
          )}
        >
          <CurrentIcon className="size-4" />
        </motion.div>
        {isConfirming && (
          <kit.Tooltip
            tooltipContent={`Make ${APP_NAME} ${undetectabilityEnabled ? "visible" : "invisible"}. ${isWin ? "This will also restart the app." : ""}`}
            position="top"
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              whileHover={{ scale: 1.05 }}
              key="confirming"
              onClick={() => {
                updateState({ undetectabilityEnabled: !undetectabilityEnabled });
                setIsConfirming(false);
              }}
              transition={{ duration: 0.1, ease: "easeOut" }}
              className={twMerge(
                "w-fit h-7.5 flex justify-center items-center text-muted-foreground shrink-0 hover:text-primary-foreground py-1.5 pl-1 pr-2 transition-[color,padding] cursor-pointer",
              )}
            >
              <OppositeIcon className="size-4" />
            </motion.div>
          </kit.Tooltip>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
