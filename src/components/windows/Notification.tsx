import { motion, AnimatePresence } from "framer-motion";
import { InlineWindow, InlineWindowProps } from "./InlineWindow";
import { NotificationPortal } from "../Portal";

interface NotificationWindowProps extends InlineWindowProps {
    show?: boolean;
}

export const NotificationWindow = ({
    show = true,
    ...props
  }: NotificationWindowProps) => {
    return (
      <NotificationPortal>
        <AnimatePresence>
          {show && (
            <motion.div
              initial={{ opacity: 0, x: 40 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 40 }}
            >
              <InlineWindow layoutTransition {...props} />
            </motion.div>
          )}
        </AnimatePresence>
      </NotificationPortal>
    );
  };
  