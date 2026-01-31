import type { ReactNode } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { InlineWindow } from "./InlineWindow";
import type { InlineWindowProps } from "./InlineWindow";
import { NotificationsPortal } from "../Portal";
import { MovableWindowsPortal } from "../Portal";
import { WindowTitle } from "../ui/WindowTitle";
import { WindowMessage } from "../ui/WindowMessage";
import { WindowFooter } from "../ui/WindowFooter";
import { Button } from "../ui/Button";

type NotificationAction = {
  label: ReactNode;
  onClick: () => void;
};

type NotificationWindowProps = {
  title: ReactNode;
  message: ReactNode;
  windowType?: "notification" | "movable";
  show?: boolean;
  actions?: NotificationAction | NotificationAction[];
} & Partial<InlineWindowProps>;

export const NotificationWindow = ({
  title,
  message,
  windowType = "notification",
  show = true,
  actions = [],
  ...props
}: NotificationWindowProps) => {
  const actionArray: NotificationAction[] = Array.isArray(actions) ? actions : [actions];
  const Portal = windowType === "notification" ? NotificationsPortal : MovableWindowsPortal;
  return (
    <Portal>
      <AnimatePresence>
        {show && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            <InlineWindow layoutTransition width={350} {...props}>
              <WindowTitle>{title}</WindowTitle>
              <WindowMessage>{message}</WindowMessage>
              {actionArray.length > 0 && (
                <div className="mt-3 mb-1 flex justify-center gap-2">
                  {actionArray.map((action, index) => (
                    <Button key={index} onClick={action.onClick}>
                      {action.label}
                    </Button>
                  ))}
                </div>
              )}
              <WindowFooter />
            </InlineWindow>
          </motion.div>
        )}
      </AnimatePresence>
    </Portal>
  );
};
