import { useEffect, useRef, useState } from 'react';
import { observer } from 'mobx-react-lite';
import { InlineWindow } from '../windows/InlineWindow';
import { WindowTitle } from '../ui/WindowTitle';
import { WindowFooter } from '../ui/WindowFooter';
import { Input } from '../ui/Input';
import { HeadlessButton } from '../ui/HeadlessButton';
import { gmailService } from '@/services/GmailService';
import { generateText } from 'ai';
import { google } from '@ai-sdk/google';
import { NotificationWindow } from '../windows/Notification';
import { FullscreenPortal } from '../Portal';
import { useGlobalServices } from '@/services/GlobalServicesContextProvider';

type Draft = { to: string; subject: string; body: string };

export const DraftEmailModal = observer(({ show, onClose, meetingSummary, userRequest, initialDraft }: {
  show: boolean;
  onClose: () => void;
  meetingSummary: string;
  userRequest: string;
  initialDraft?: { to: string; subject: string; body: string } | null;
}) => {
  const [subject, setSubject] = useState('');
  const [body, setBody] = useState('');
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [showToast, setShowToast] = useState(false);
  const [recipients, setRecipients] = useState<string[]>([]);
  const toInputRef = useRef<HTMLInputElement | null>(null);
  const { aiResponsesService, contextService } = useGlobalServices();

  useEffect(() => {
    if (!show) return;
    if (initialDraft) {
      setSubject(initialDraft.subject || '');
      setBody(initialDraft.body || '');
      setRecipients(parseRecipients(initialDraft.to || ''));
      return;
    }
    regenerate();
  }, [show]);

  const recent = gmailService.recentRecipients;

  async function regenerate() {
    setBusy(true);
    setMessage(null);
    try {
      const model = google('gemini-2.5-flash');
      const prompt = `Draft a professional email in JSON format with keys "to", "subject", "body".
Meeting summary: ${meetingSummary}
User request: ${userRequest}`;
      const { text } = await generateText({ model, prompt });
      const parsed = JSON.parse(text || '{}') as Draft;
      setSubject(parsed.subject || '');
      setBody(parsed.body || '');
      setRecipients(parseRecipients(parsed.to || ''));
    } catch {
      setMessage('Failed to parse AI output. Try Regenerate.');
    } finally {
      setBusy(false);
    }
  }

  async function regenerateVariant(variant: 'shorter' | 'formal' | 'friendly') {
    setBusy(true);
    setMessage(null);
    try {
      const model = google('gemini-2.5-flash');
      const intent = variant === 'shorter' ? 'Rewrite the following email body to be shorter while preserving key content.'
        : variant === 'formal' ? 'Rewrite the following email body to be more formal and professional.'
        : 'Rewrite the following email body to be more friendly and approachable.';
      const prompt = `${intent}\n\nReturn only the rewritten body as plain text.\n\nBody:\n${body}`;
      const { text } = await generateText({ model, prompt });
      setBody(text || body);
    } catch {
      setMessage('Failed to rewrite content.');
    } finally {
      setBusy(false);
    }
  }

  async function send() {
    setBusy(true);
    setMessage(null);
    const ok = await gmailService.sendEmail({ to: recipients.join(', '), subject, body });
    setBusy(false);
    if (ok) {
      setMessage('Email Sent ✅');
      setShowToast(true);
      setTimeout(() => setShowToast(false), 1800);
      // Notify AI agent about successful send
      try {
        aiResponsesService.createNewResponse({
          fullContext: contextService.fullContext,
          screenshot: null,
          manualInput: `System event: Email sent successfully to ${recipients.join(', ')} with subject "${subject}". Please acknowledge briefly.`,
          displayInput: 'Draft Email: Sent',
          useWebSearch: false,
          metadata: { systemEvent: 'email', outcome: 'sent' },
        });
      } catch {}
      setTimeout(onClose, 800);
    } else {
      setMessage(gmailService.lastError || 'Failed to send');
      // Notify AI agent about failure
      try {
        aiResponsesService.createNewResponse({
          fullContext: contextService.fullContext,
          screenshot: null,
          manualInput: `System event: Email send failed. Error: ${gmailService.lastError || 'unknown'}.`,
          displayInput: 'Draft Email: Send failed',
          useWebSearch: false,
          metadata: { systemEvent: 'email', outcome: 'failed' },
        });
      } catch {}
    }
  }

  function cancelDraft() {
    try {
      aiResponsesService.createNewResponse({
        fullContext: contextService.fullContext,
        screenshot: null,
        manualInput: 'System event: Draft email canceled by user. Acknowledge briefly.',
        displayInput: 'Draft Email: Canceled',
        useWebSearch: false,
        metadata: { systemEvent: 'email', outcome: 'canceled' },
      });
    } catch {}
    onClose();
  }

  function parseRecipients(value: string): string[] {
    return value
      .split(',')
      .map(s => s.trim())
      .filter(Boolean);
  }

  function addRecipientFromInput() {
    const value = toInputRef.current?.value?.trim() || '';
    if (!value) return;
    const list = parseRecipients(value);
    setRecipients(prev => Array.from(new Set([...prev, ...list])));
    if (toInputRef.current) toInputRef.current.value = '';
  }

  function removeRecipient(index: number) {
    setRecipients(prev => prev.filter((_, i) => i !== index));
  }

  if (!show) return null;

  return (
    <FullscreenPortal>
      <div className="absolute inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-lg">
        <InlineWindow width={640} layoutTransition captureMouseEvents contentClassName="p-0 overflow-hidden">
          <WindowTitle>
            <div className="flex items-center justify-between w-full">
              <span>Draft Email</span>
            </div>
          </WindowTitle>
          <div className="p-4">
            <div className="rounded-xl border border-white/10 bg-stone-900/70 p-4">
              <div className="text-white/90 font-semibold text-sm mb-3">Draft Email</div>
              <div className="space-y-3">
                <div>
                  <div className="text-xs text-white/60 mb-1">To</div>
                  <div className="min-h-10 bg-white/5 border border-white/10 rounded-md px-2 py-1.5 flex flex-wrap gap-1">
                    {recipients.map((r, i) => (
                      <span key={i} className="inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full bg-white/15 text-white/85">
                        {r}
                        <button className="text-white/60 hover:text-white" onClick={() => removeRecipient(i)}>×</button>
                      </span>
                    ))}
                    <input
                      ref={toInputRef}
                      placeholder="Add recipient and press Enter"
                      className="flex-1 bg-transparent text-xs text-white/90 outline-none min-w-[140px]"
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' || e.key === ',') {
                          e.preventDefault();
                          addRecipientFromInput();
                        }
                      }}
                    />
                  </div>
                  {recent.length > 0 && (
                    <div className="mt-1 text-[11px] text-white/50">Recent: {recent.slice(0,5).join(', ')}</div>
                  )}
                </div>
                <div>
                  <div className="text-xs text-white/60 mb-1">Subject</div>
                  <Input value={subject} onChange={setSubject} className="bg-white/5 border border-white/10 rounded-md text-[13px] font-semibold" />
                </div>
                <div>
                  <div className="text-xs text-white/60 mb-1">Body</div>
                  <Input multiLine minRows={10} value={body} onChange={setBody} className="bg-white/5 border border-white/10 rounded-md" />
                </div>
                {message && <div className="text-xs text-white/70">{message}</div>}
                <div className="flex items-center justify-between pt-1">
                  <div className="flex gap-2">
                    <HeadlessButton disabled={busy} onClick={() => regenerateVariant('shorter')} className="text-xs px-3 py-1.5 rounded border border-white/20 text-white/85 hover:border-white/40 hover:bg-transparent">Rewrite shorter</HeadlessButton>
                    <HeadlessButton disabled={busy} onClick={() => regenerateVariant('formal')} className="text-xs px-3 py-1.5 rounded border border-white/20 text-white/85 hover:border-white/40 hover:bg-transparent">Make more formal</HeadlessButton>
                    <HeadlessButton disabled={busy} onClick={() => regenerateVariant('friendly')} className="text-xs px-3 py-1.5 rounded border border-white/20 text-white/85 hover:border-white/40 hover:bg-transparent">Make more friendly</HeadlessButton>
                  </div>
                  <div className="flex gap-2">
                    <HeadlessButton disabled={busy} onClick={cancelDraft} className="text-xs px-3 py-1.5 rounded border border-white/20 text-white/80 hover:border-white/40 hover:bg-white/5">Cancel</HeadlessButton>
                    <HeadlessButton disabled={busy} onClick={send} className="text-xs px-3 py-1.5 rounded bg-emerald-500/80 hover:bg-emerald-500 text-white">Send</HeadlessButton>
                  </div>
                </div>
              </div>
            </div>
          </div>
          <WindowFooter />
          <NotificationWindow
            show={showToast}
            title="Gmail"
            message="Email Sent ✅"
            windowType="notification"
          />
        </InlineWindow>
      </div>
    </FullscreenPortal>
  );
});