import { LuX } from "react-icons/lu";
import { AnimatePresence, type HTMLMotionProps, motion, useAnimate } from "motion/react";
import { twMerge } from "tailwind-merge";
import { useDarkMode } from "usehooks-ts";
import { CaptureMouseEventsWrapper } from "../captureMouseEventsWrapper";
import { kit } from "../kit";
import { NotificationsPortal } from "./portal";

export default function NotificationContainer({
  className,
  show,
  onDismiss,
  onClose,
  children,
  ...props
}: HTMLMotionProps<"div"> & {
  children: React.ReactNode;
  show: boolean;
  onDismiss?: () => void;
  onClose?: () => void;
}) {
  const [scope, animate] = useAnimate();
  const { isDarkMode } = useDarkMode();

  return (
    <NotificationsPortal>
      <AnimatePresence>
        {show && (
          <CaptureMouseEventsWrapper
            enabledEvenWhenHidden
            className={twMerge("absolute top-0 right-0 z-50", isDarkMode && "dark")}
          >
            <motion.div
              initial={{ x: 500 }}
              animate={{
                x: 0,
              }}
              exit={{ opacity: 0 }}
              transition={{
                type: "spring",
                stiffness: 400,
                damping: 35,
              }}
              className={twMerge(
                "relative w-[400px] p-4 rounded-xl group notification-container",
                className,
              )}
              drag="x"
              dragConstraints={{ left: 0, right: 0 }}
              dragElastic={{ left: 0.01, right: 1 }}
              ref={scope}
              onDragEnd={async (_, info) => {
                if (info.offset.x * info.velocity.x > 1_000 && info.offset.x > 0) {
                  onDismiss?.();
                  animate(
                    scope.current,
                    { x: 500 },
                    // Make sure it's fast enough, but doesn't look like it glitches out
                    { velocity: Math.min(Math.max(info.velocity.x, 1000), 5000), type: "inertia" },
                  );
                }
              }}
              {...props}
            >
              <CaptureMouseEventsWrapper
                enabledEvenWhenHidden
                className="absolute -top-3.5 -left-3.5 p-1.5"
              >
                <kit.HeadlessButton
                  className={twMerge(
                    "rounded-full bg-[#EFEFEF] dark:bg-[#18191C] hover:bg-[#D0D0D0] hover:dark:bg-[#2B2F3D] size-7 flex justify-center items-center opacity-0 group-hover:opacity-100 transition-[opacity,background]",
                    "border border-black/15 dark:border-white/15",
                  )}
                  style={{
                    boxShadow: "0 1px 2px 0 rgba(0, 0, 0, 0.15)",
                  }}
                  onClick={() => {
                    if (onClose) {
                      onClose();
                    } else {
                      onDismiss?.();
                    }
                  }}
                >
                  <LuX className="size-3 text-[#9E9E9E] dark:text-[#A5A7AC]" />
                </kit.HeadlessButton>
              </CaptureMouseEventsWrapper>
              {children}
            </motion.div>
          </CaptureMouseEventsWrapper>
        )}
      </AnimatePresence>
    </NotificationsPortal>
  );
}
