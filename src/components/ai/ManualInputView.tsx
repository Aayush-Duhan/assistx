import React, { useState, useRef, useCallback, useEffect } from 'react';
import { cn } from '@/lib/utils';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowUp, Globe } from 'lucide-react';
import { useGlobalServices } from '../../services/GlobalServicesContextProvider';
import { useCanTakeScreenshot } from '../../stores/featureStore';
import { electron } from '@/services/electron';
import { UI } from '../ui';
import { MouseEventsCapture } from '../Portal';

// --- Type Definitions ---
interface ManualInputViewProps {
  className?: string;
}


/**
 * This view provides a text area for the user to manually type a question to the AI.
 * It appears when the user clicks the "Ask AI" button.
 */
export const ManualInputView = React.memo(function ManualInputView({
  className,
}: ManualInputViewProps) {
  // Service to interact with the AI and manage its state
  const { aiResponsesService } = useGlobalServices();
  
  // Check if the app is configured to allow screenshots with queries
  const canCaptureScreenshots = useCanTakeScreenshot();

  // Local state to hold the text the user is typing
  const [inputValue, setInputValue] = useState('');
  
  // Ref to programmatically focus the input element
  const inputRef = useRef<HTMLTextAreaElement>(null);
  
  // State for different features
  const [showSearch, setShowSearch] = useState(false);
  
  /**
   * Callback to dismiss the manual input view.
   * It tells the global AI service to turn off the manual input mode.
   */
  const onDismiss = useCallback(() => {
    aiResponsesService.setIsManualInputActive(false);
  }, [aiResponsesService]);

  /**
   * Callback to submit the input and trigger AI analysis.
   */
  const onSubmit = useCallback(() => {
    // Trigger the AI with the current input value, screenshot option, and search grounding
    aiResponsesService.triggerAi(canCaptureScreenshots, inputValue.trim() || null, showSearch);
    onDismiss(); // Close the input view after submitting
  }, [aiResponsesService, canCaptureScreenshots, inputValue, onDismiss, showSearch]);

  // Handle toggle changes
  const handleToggleChange = (value: string) => {
    if (value === "search") {
      setShowSearch((prev) => !prev);
    }
  };



// Effect to handle focus and dismissal based on window visibility
useEffect(() => {
  const checkVisibility = async () => {
    const visible = await electron.getVisibility();
    if (visible) {
      // If the window is visible, focus the input field so the user can start typing immediately.
      inputRef.current?.focus();
    } else {
      // If the window becomes hidden (e.g., user clicks away), dismiss the input view.
      onDismiss();
    }
  }

  checkVisibility();
}, [onDismiss]);

  const hasContent = inputValue.trim() !== "";

  return (
      <MouseEventsCapture>
      <div className={cn(
        "rounded-3xl border border-[#444444] bg-black/60 backdrop-blur-sm p-3 shadow-[0_8px_30px_rgba(0,0,0,0.24)] transition-all duration-300",
        className
      )}>
        

        {/* Text input area */}
          <UI.Input
            ref={inputRef}
            className={cn(
              'flex w-full rounded-md border-none bg-transparent px-3 py-2.5 text-base text-gray-100 placeholder:text-gray-400 focus-visible:outline-none focus-visible:ring-0 disabled:cursor-not-allowed disabled:opacity-50 min-h-[44px] resize-none',
              className
            )}
            placeholder="Type your message here..."
            multiLine
            value={inputValue}
            onChange={setInputValue}
            onBlur={(e) => {
              if (e.relatedTarget?.tagName !== 'BUTTON') {
                onDismiss();
              }
            }}
            onKeyDown={(e) => {
              // Dismiss on Escape key
              if (e.key === 'Escape') {
                onDismiss();
              }
              // Submit on Enter key (without Shift)
              if (e.key === 'Enter' && !e.shiftKey) {
                onSubmit();
                e.preventDefault(); // Prevent a newline from being added
              }
            }}
          />

          {/* Actions row */}
          <div className="flex items-center justify-between gap-2 pt-2">
            {/* Left side buttons */}
            <div className="flex items-center gap-1">

              {/* Feature toggle buttons */}
              <div className="flex items-center">
                {/* Search toggle */}
                <button
                  type="button"
                  onClick={() => handleToggleChange("search")}
                  className={cn(
                    "rounded-full transition-all flex items-center gap-1 px-2 py-1 border h-8",
                    showSearch
                      ? "bg-[#1EAEDB]/15 border-[#1EAEDB] text-[#1EAEDB]"
                      : "bg-transparent border-transparent text-[#9CA3AF] hover:text-[#D1D5DB]"
                  )}
                  title="Search the web"
                >
                  <div className="w-5 h-5 flex items-center justify-center flex-shrink-0">
                    <motion.div
                      animate={{ rotate: showSearch ? 360 : 0, scale: showSearch ? 1.1 : 1 }}
                      whileHover={{ rotate: showSearch ? 360 : 15, scale: 1.1, transition: { type: "spring", stiffness: 300, damping: 10 } }}
                      transition={{ type: "spring", stiffness: 260, damping: 25 }}
                    >
                      <Globe className={cn("w-4 h-4", showSearch ? "text-[#1EAEDB]" : "text-inherit")} />
                    </motion.div>
                  </div>
                  <AnimatePresence>
                    {showSearch && (
                      <motion.span
                        initial={{ width: 0, opacity: 0 }}
                        animate={{ width: "auto", opacity: 1 }}
                        exit={{ width: 0, opacity: 0 }}
                        transition={{ duration: 0.2 }}
                        className="text-xs overflow-hidden whitespace-nowrap text-[#1EAEDB] flex-shrink-0"
                      >
                        Search
                      </motion.span>
                    )}
                  </AnimatePresence>
                </button>
              </div>
            </div>

            {/* Right side - Send button */}
            <div className="flex items-center gap-1">
              {/* Send button */}
              {hasContent && (
                <button
                  className="h-8 w-8 rounded-full transition-all duration-200 inline-flex items-center justify-center bg-white hover:bg-white/80 text-[#1F2023]"
              onClick={onSubmit}
                  title="Send message"
                >
                  <ArrowUp className="h-4 w-4 text-[#1F2023]" />
                </button>
              )}
            </div>
          </div>
        </div>
      </MouseEventsCapture>
  );
}); 