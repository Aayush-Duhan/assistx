import { Tooltip } from "./Tooltip";
import { AnimatePresence, motion } from "framer-motion";

interface WindowsAutoFocusCheckboxProps {
    show: boolean;
    checked: boolean;
    onChange: (checked: boolean) => void;
}

export function WindowsAutoFocusCheckbox({
    show,
    checked,
    onChange,
}: WindowsAutoFocusCheckboxProps) {
    const tooltip = (
        <Tooltip tooltipContent="Uncheck to keep current window focused">
            <div className="flex items-center gap-1.5">
                <span className="text-white/30 text-[11px]">Auto focus</span>
                <label className="relative flex items-center">
                    <input
                        type="checkbox"
                        className="appearance-none w-3.5 h-3.5 rounded border-1 border-white/30
    hover:border-white/50 checked:border-white/30 transition pointer-events-auto
    focus:outline-none"
                        checked={checked}
                        onChange={(e) => onChange(e.target.checked)}
                    />
                    {checked && (
                        <svg
                            className="absolute left-0 top-0 w-3.5 h-3.5 text-white/50"
                            viewBox="0 0 14 14"
                        >
                            <title>Checked</title>
                            <path
                                d="M4 7.5l2 2 4-4"
                                strokeWidth="1.5"
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                stroke="currentColor"
                                fill="none"
                            />
                        </svg>
                    )}
                </label>
            </div>
        </Tooltip>
    );
    return (
        <AnimatePresence>
            {show && (
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.1 }}
                >
                    {tooltip}
                </motion.div>
            )}
        </AnimatePresence>
    );
}
