import { useRef, useCallback, useEffect } from 'react';
import { observer } from 'mobx-react-lite';
import { useAtom } from 'jotai';
import { AnimatePresence, motion } from 'framer-motion';
import { manualInputAtom } from '@/state/atoms';
import { useWindowFocus } from '@/hooks/useWindowFocus';
import { useGlobalServices } from '@/services/GlobalServicesContextProvider';
import { Input } from '../ui/Input';
import { Shortcut } from '../ui/Shortcut';
import { IS_WINDOWS } from '@/lib/constants';
import { useGlobalShortcut } from '@/hooks/useGlobalShortcut';

const SUBMIT_SHORTCUT = 'CommandOrControl+Enter';
const CANCEL_SHORTCUT = 'Escape';

export const ManualInputView = observer(({ className }: { className?: string }) => {
  const { aiResponsesService } = useGlobalServices();
  const [manualInput, setManualInput] = useAtom(manualInputAtom);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const { isWaitingForTab, windowsAutoFocusWindow, setWindowsAutoFocusWindow, handleClick } = useWindowFocus(inputRef);
  const isWindows = IS_WINDOWS;
  console.log('isWindows', isWindows);
  console.log(window.electron.process.platform);
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
  useGlobalShortcut(SUBMIT_SHORTCUT, handleSubmit);
  useGlobalShortcut(CANCEL_SHORTCUT, handleCancel);
  const placeholder = isWaitingForTab
    ? 'Press Tab to focus, or Enter to submit silently'
    : aiResponsesService.isCommittingTranscriptions
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
          className={`pr-44 ${className}`}
          placeholder={placeholder}
          multiLine
          value={manualInput}
          onChange={(value) => {
            setManualInput(value);
          }}
          onClick={handleClick}
          onBlur={(e) => {
            if (e.relatedTarget?.tagName !== 'BUTTON' && e.relatedTarget?.tagName !== 'INPUT') {
              handleCancel();
            }
          }}
        />
        <div className="absolute right-3.5 bottom-2.5 flex items-center gap-4 pointer-events-none">
          {isWindows && <AutoFocusToggle show={!manualInput} checked={windowsAutoFocusWindow} onChange={setWindowsAutoFocusWindow} />}
          <div className="pointer-events-auto">
            <Shortcut accelerator="Enter" label="Submit" onTrigger={handleSubmit} />
          </div>
        </div>
      </div>
    </div>
  );
})


const AutoFocusToggle = ({ show, checked, onChange }: { show: boolean, checked: boolean, onChange: (checked: boolean) => void }) => {
  const content = (
    <div className="flex items-center gap-1.5">
      <span className="text-white/30 text-[11px]">Auto focus</span>
      <label className="relative flex items-center">
        <input
          type="checkbox"
          className="appearance-none w-3.5 h-3.5 rounded border-1 border-white/30 hover:border-white/50 checked:border-white/30 transition pointer-events-auto focus:outline-none"
          checked={checked}
          onChange={(e) => onChange(e.target.checked)}
        />
        {checked && (
          <svg className="absolute left-0 top-0 w-3.5 h-3.5 text-white/50" viewBox="0 0 14 14">
            <title>Checked</title>
            <path d="M4 7.5l2 2 4-4" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" stroke="currentColor" fill="none" />
          </svg>
        )}
      </label>
    </div>
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
          {content}
        </motion.div>
      )}
    </AnimatePresence>
  );
};