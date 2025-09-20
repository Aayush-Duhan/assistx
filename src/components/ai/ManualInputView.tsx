import { useRef, useCallback, useEffect } from 'react';
import { observer } from 'mobx-react-lite';
import { useAtom } from 'jotai';
import { manualInputAtom } from '@/state/atoms';
import { useGlobalServices } from '@/services/GlobalServicesContextProvider';
import { Input } from '../ui/Input';
import { Shortcut } from '../ui/Shortcut';
import { useGlobalShortcut } from '@/hooks/useGlobalShortcut';

import { SelectModel } from '../ui/select-model';

const SUBMIT_SHORTCUT = 'CommandOrControl+Enter';
const CANCEL_SHORTCUT = 'Escape';
const SCREENSHOT_SHORTCUT = 'CommandOrControl+Shift+Enter';

export const ManualInputView = observer(({ className }: { className?: string }) => {
  const { aiResponsesService } = useGlobalServices();
  const [manualInput, setManualInput] = useAtom(manualInputAtom);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const handleCancel = useCallback(() => {
    aiResponsesService.setIsManualInputActive(false);
  }, [aiResponsesService]);
  const handleSubmit = () => {
    aiResponsesService.triggerAi({
      shouldCaptureScreenshot: true,
      manualInput,
      displayInput: manualInput,
      useWebSearch: aiResponsesService.useWebSearch,
    });
    setManualInput('');
  };

  const handleScreenshotShortcut = () => {
    aiResponsesService.triggerAi({
      shouldCaptureScreenshot: true,
      manualInput,
      displayInput: manualInput,
      useWebSearch: aiResponsesService.useWebSearch,
    });
  };
  useGlobalShortcut(SUBMIT_SHORTCUT, handleSubmit);
  useGlobalShortcut(CANCEL_SHORTCUT, handleCancel);
  useGlobalShortcut(SCREENSHOT_SHORTCUT, handleScreenshotShortcut);
  const placeholder = aiResponsesService.isCommittingTranscriptions
    ? 'Ask about your screen or audio'
    : 'Ask about your screen';
  useEffect(() => {
    if (inputRef.current) {
      const inputElement = inputRef.current;
      if (inputElement.setSelectionRange) {
        const length = inputElement.value.length;
        inputElement.setSelectionRange(length, length);
      }
    }
  }, []);
  return (
    <div>
      <div className="relative">
        <Input
          ref={inputRef}
          className={`pr-64 ${className}`}
          placeholder={placeholder}
          multiLine
          value={manualInput}
          onChange={(value) => {
            setManualInput(value);
          }}
          onBlur={(e) => {
            if (e.relatedTarget?.tagName !== 'BUTTON' && e.relatedTarget?.tagName !== 'INPUT') {
              handleCancel();
            }
          }}
        />
        <div className="absolute right-3.5 top-1/2 transform -translate-y-1/2 flex items-center gap-4">
          <SelectModel
            onSelect={() => { }} // We're using the global state, so no need for a specific onSelect handler
          />
          <div className="pointer-events-auto">
            <Shortcut accelerator="Enter" label="Submit" onTrigger={handleSubmit} />
          </div>
        </div>
      </div>
    </div>
  );
})

