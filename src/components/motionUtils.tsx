import { motion } from "framer-motion";

/** Trigger layout updates for all motion components in the current layout group. */
export function TriggerMotionLayoutUpdate() {
    return <motion.div className="hidden" layout />;
}
