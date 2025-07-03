import React, { useState, useRef, useCallback, useEffect } from 'react';
import { cn } from '@/lib/utils';
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
    // Trigger the AI with the current input value and a screenshot if enabled
    // If input is empty, just send screenshot only
    aiResponsesService.triggerAi(canCaptureScreenshots, inputValue.trim() || null);
    onDismiss(); // Close the input view after submitting
  }, [aiResponsesService, canCaptureScreenshots, inputValue, onDismiss]);

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

  return (
      <MouseEventsCapture>
        <div className="flex flex-col gap-3 p-3">
          <UI.Input
            ref={inputRef}
            className={cn('place-content-center px-2 py-1', className)}
            placeholder="Ask anything or press Enter for screenshot analysis"
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
          <div className="flex justify-end">
            <UI.Button
              onClick={onSubmit}
              className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 text-sm rounded"
            >
              Submit
            </UI.Button>
          </div>
        </div>
      </MouseEventsCapture>
  );
}); 