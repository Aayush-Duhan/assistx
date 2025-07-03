import React, { useState, useRef, useCallback, useEffect } from 'react';
import { cn } from '@/lib/utils';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowUp, Paperclip, Square, X, StopCircle, Mic, Globe, BrainCog, Settings } from 'lucide-react';

// --- Custom Hooks & Services ---
import { useGlobalServices } from '../../services/GlobalServicesContextProvider';
import { useCanTakeScreenshot } from '../../stores/featureStore';
import { electron } from '@/services/electron';

// --- UI Components ---
import { UI } from '../ui';
import { MouseEventsCapture } from '../Portal';

// --- Type Definitions ---
interface ManualInputViewProps {
  className?: string;
}

// Custom Divider Component
const CustomDivider: React.FC = () => (
  <div className="relative h-6 w-[1.5px] mx-1">
    <div
      className="absolute inset-0 bg-gradient-to-t from-transparent via-[#9b87f5]/70 to-transparent rounded-full"
      style={{
        clipPath: "polygon(0% 0%, 100% 0%, 100% 40%, 140% 50%, 100% 60%, 100% 100%, 0% 100%, 0% 60%, -40% 50%, 0% 40%)",
      }}
    />
  </div>
);

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
  const [showThink, setShowThink] = useState(false);
  const [showTool, setShowTool] = useState(false);
  const [files, setFiles] = useState<File[]>([]);
  const [filePreviews, setFilePreviews] = useState<{ [key: string]: string }>({});
  
  // File upload ref
  const uploadInputRef = useRef<HTMLInputElement>(null);
  
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
    // Add prefixes based on selected modes
    let prefixes = [];
    if (showSearch) prefixes.push("Search");
    if (showThink) prefixes.push("Think");
    if (showTool) prefixes.push("Tool");
    
    const formattedInput = prefixes.length > 0 
      ? `[${prefixes.join(", ")}: ${inputValue}]` 
      : inputValue;
    
    // Trigger the AI with the current input value and a screenshot if enabled
    // If input is empty, just send screenshot only
    aiResponsesService.triggerAi(canCaptureScreenshots, formattedInput.trim() || null);
    onDismiss(); // Close the input view after submitting
  }, [aiResponsesService, canCaptureScreenshots, inputValue, onDismiss, showSearch, showThink, showTool]);

  // Handle toggle changes - now allows multiple selections
  const handleToggleChange = (value: string) => {
    if (value === "search") {
      setShowSearch((prev) => !prev);
    } else if (value === "think") {
      setShowThink((prev) => !prev);
    } else if (value === "tool") {
      setShowTool((prev) => !prev);
    }
  };

  // File handling
  const isImageFile = (file: File) => file.type.startsWith("image/");

  const processFile = (file: File) => {
    if (!isImageFile(file)) {
      console.log("Only image files are allowed");
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
      console.log("File too large (max 10MB)");
      return;
    }
    setFiles([file]);
    const reader = new FileReader();
    reader.onload = (e) => setFilePreviews({ [file.name]: e.target?.result as string });
    reader.readAsDataURL(file);
  };

  const handleRemoveFile = (index: number) => {
    const fileToRemove = files[index];
    if (fileToRemove && filePreviews[fileToRemove.name]) setFilePreviews({});
    setFiles([]);
  };

  // Voice input handler
  const handleStartRecording = () => {
    console.log("Starting voice input");
    // TODO: Implement voice-to-text functionality
    // This will transcribe speech and add it to the input value
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
    };
    
    checkVisibility();
  }, [onDismiss]);

  const hasContent = inputValue.trim() !== "" || files.length > 0;

  return (
      <MouseEventsCapture>
      <div className={cn(
        "rounded-3xl border border-[#444444] bg-black/60 backdrop-blur-sm p-3 shadow-[0_8px_30px_rgba(0,0,0,0.24)] transition-all duration-300",
        className
      )}>
        
        {/* File preview section */}
        {files.length > 0 && (
          <div className="flex flex-wrap gap-2 mb-2 transition-all duration-300">
            {files.map((file, index) => (
              <div key={index} className="relative group">
                {file.type.startsWith("image/") && filePreviews[file.name] && (
                  <div className="w-16 h-16 rounded-xl overflow-hidden cursor-pointer transition-all duration-300">
                    <img
                      src={filePreviews[file.name]}
                      alt={file.name}
                      className="h-full w-full object-cover"
                    />
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleRemoveFile(index);
                      }}
                      className="absolute top-1 right-1 rounded-full bg-black/70 p-0.5 opacity-100 transition-opacity"
                    >
                      <X className="h-3 w-3 text-white" />
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}

        {/* Text input area */}
          <UI.Input
            ref={inputRef}
            className={cn(
              'flex w-full rounded-md border-none bg-transparent px-3 py-2.5 text-base text-gray-100 placeholder:text-gray-400 focus-visible:outline-none focus-visible:ring-0 disabled:cursor-not-allowed disabled:opacity-50 min-h-[44px] resize-none',
              className
            )}
            placeholder={
              [showSearch && "Search the web", showThink && "Think deeply", showTool && "Use tools"]
                .filter(Boolean)
                .join(", ") || "Type your message here..."
            }
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
              {/* File upload button */}
              <button
                onClick={() => uploadInputRef.current?.click()}
                className="flex h-8 w-8 text-[#9CA3AF] cursor-pointer items-center justify-center rounded-full transition-colors hover:bg-gray-600/30 hover:text-[#D1D5DB]"
                title="Upload image"
              >
                <Paperclip className="h-5 w-5 transition-colors" />
                <input
                  ref={uploadInputRef}
                  type="file"
                  className="hidden"
                  onChange={(e) => {
                    if (e.target.files && e.target.files.length > 0) processFile(e.target.files[0]);
                    if (e.target) e.target.value = "";
                  }}
                  accept="image/*"
                />
              </button>

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

                <CustomDivider />

                {/* Think toggle */}
                <button
                  type="button"
                  onClick={() => handleToggleChange("think")}
                  className={cn(
                    "rounded-full transition-all flex items-center gap-1 px-2 py-1 border h-8",
                    showThink
                      ? "bg-[#8B5CF6]/15 border-[#8B5CF6] text-[#8B5CF6]"
                      : "bg-transparent border-transparent text-[#9CA3AF] hover:text-[#D1D5DB]"
                  )}
                  title="Think deeply"
                >
                  <div className="w-5 h-5 flex items-center justify-center flex-shrink-0">
                    <motion.div
                      animate={{ rotate: showThink ? 360 : 0, scale: showThink ? 1.1 : 1 }}
                      whileHover={{ rotate: showThink ? 360 : 15, scale: 1.1, transition: { type: "spring", stiffness: 300, damping: 10 } }}
                      transition={{ type: "spring", stiffness: 260, damping: 25 }}
                    >
                      <BrainCog className={cn("w-4 h-4", showThink ? "text-[#8B5CF6]" : "text-inherit")} />
                    </motion.div>
                  </div>
                  <AnimatePresence>
                    {showThink && (
                      <motion.span
                        initial={{ width: 0, opacity: 0 }}
                        animate={{ width: "auto", opacity: 1 }}
                        exit={{ width: 0, opacity: 0 }}
                        transition={{ duration: 0.2 }}
                        className="text-xs overflow-hidden whitespace-nowrap text-[#8B5CF6] flex-shrink-0"
                      >
                        Think
                      </motion.span>
                    )}
                  </AnimatePresence>
                </button>

                <CustomDivider />

                {/* Tool toggle */}
                <button
                  type="button"
                  onClick={() => handleToggleChange("tool")}
                  className={cn(
                    "rounded-full transition-all flex items-center gap-1 px-2 py-1 border h-8",
                    showTool
                      ? "bg-[#F97316]/15 border-[#F97316] text-[#F97316]"
                      : "bg-transparent border-transparent text-[#9CA3AF] hover:text-[#D1D5DB]"
                  )}
                  title="Use tools"
                >
                  <div className="w-5 h-5 flex items-center justify-center flex-shrink-0">
                    <motion.div
                      animate={{ rotate: showTool ? 360 : 0, scale: showTool ? 1.1 : 1 }}
                      whileHover={{ rotate: showTool ? 360 : 15, scale: 1.1, transition: { type: "spring", stiffness: 300, damping: 10 } }}
                      transition={{ type: "spring", stiffness: 260, damping: 25 }}
                    >
                      <Settings className={cn("w-4 h-4", showTool ? "text-[#F97316]" : "text-inherit")} />
                    </motion.div>
                  </div>
                  <AnimatePresence>
                    {showTool && (
                      <motion.span
                        initial={{ width: 0, opacity: 0 }}
                        animate={{ width: "auto", opacity: 1 }}
                        exit={{ width: 0, opacity: 0 }}
                        transition={{ duration: 0.2 }}
                        className="text-xs overflow-hidden whitespace-nowrap text-[#F97316] flex-shrink-0"
                      >
                        Tool
                      </motion.span>
                    )}
                  </AnimatePresence>
                </button>
              </div>
            </div>

            {/* Right side - Send/Voice buttons */}
            <div className="flex items-center gap-1">
              {/* Voice input button */}
              <button
                className="h-8 w-8 rounded-full transition-all duration-200 inline-flex items-center justify-center bg-transparent hover:bg-gray-600/30 text-[#9CA3AF] hover:text-[#D1D5DB]"
                onClick={handleStartRecording}
                title="Voice input"
              >
                <Mic className="h-4 w-4 transition-colors" />
              </button>

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