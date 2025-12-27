import { AnimatePresence, motion } from "framer-motion";
import { LuCheck, LuCopy } from "react-icons/lu";
import { useEffect, useState } from "react";
import { twMerge } from "tailwind-merge";
import { kit } from "@/components/kit";

export const CopyIconButton = ({
  onCopy,
  className,
  isCopied,
  setIsCopied,
  ...props
}: {
  onCopy: () => void;
  isCopied?: boolean;
  setIsCopied?: (value: boolean) => void;
} & React.HTMLAttributes<HTMLButtonElement>) => {
  const [internalIsCopied, setInternalIsCopied] = useState(false);

  // Use external state if provided, otherwise use internal
  const copied = isCopied ?? internalIsCopied;
  const setCopied = setIsCopied ?? setInternalIsCopied;

  useEffect(() => {
    if (copied) {
      const timeout = setTimeout(() => {
        setCopied(false);
      }, 2000);
      return () => clearTimeout(timeout);
    }
  }, [copied, setCopied]);

  return (
    <kit.HeadlessButton
      onClick={() => {
        onCopy();
        setCopied(true);
      }}
      {...props}
      data-copied={copied}
      className={twMerge("min-h-full flex items-start opacity-0", className)}
    >
      <div className="p-2 text-secondary-foreground hover:text-primary-foreground hover:scale-125 active:scale-90 transition-all duration-200">
        <AnimatePresence mode="popLayout">
          <motion.div
            initial={{ opacity: 0, scale: 0.9, filter: "blur(1px)" }}
            animate={{ opacity: 1, scale: 1, filter: "blur(0px)" }}
            exit={{ opacity: 0, scale: 0.9, filter: "blur(1px)" }}
            transition={{ duration: 0.1, ease: "easeOut" }}
            key={copied ? "copied" : "copy"}
          >
            {copied ? <LuCheck className="size-3" /> : <LuCopy className="size-3" />}
          </motion.div>
        </AnimatePresence>
      </div>
    </kit.HeadlessButton>
  );
};
