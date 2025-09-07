import { useEffect, useState } from 'react';
import { observer } from 'mobx-react-lite';
import { InlineWindow } from '../windows/InlineWindow';
import { WindowTitle } from '../ui/WindowTitle';
import { WindowFooter } from '../ui/WindowFooter';
import { Input } from '../ui/Input';
import { HeadlessButton } from '../ui/HeadlessButton';
import { cn } from '@/lib/utils';
import { gmailService } from '@/services/GmailService';
import { generateText } from 'ai';
import { google } from '@ai-sdk/google';
import { NotificationWindow } from '../windows/Notification';

type Draft = { to: string; subject: string; body: string };

export const DraftEmailModal = observer(({ show, onClose, meetingSummary, userRequest }: {
  show: boolean;
  onClose: () => void;
  meetingSummary: string;
  userRequest: string;
}) => {
  const [to, setTo] = useState('');
  const [subject, setSubject] = useState('');
  const [body, setBody] = useState('');
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [showToast, setShowToast] = useState(false);

  useEffect(() => {
    if (show) regenerate();
    // eslint-disable-next-line react-hooks/exhaustive-deps
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
      setTo(parsed.to || '');
      setSubject(parsed.subject || '');
      setBody(parsed.body || '');
    } catch {
      setMessage('Failed to parse AI output. Try Regenerate.');
    } finally {
      setBusy(false);
    }
  }

  async function send() {
    setBusy(true);
    setMessage(null);
    const ok = await gmailService.sendEmail({ to, subject, body });
    setBusy(false);
    if (ok) {
      setMessage('Email Sent ✅');
      setShowToast(true);
      setTimeout(() => setShowToast(false), 1800);
      setTimeout(onClose, 800);
    } else {
      setMessage(gmailService.lastError || 'Failed to send');
    }
  }

  if (!show) return null;

  return (
    <InlineWindow width={600} layoutTransition captureMouseEvents>
      <WindowTitle>Draft Email</WindowTitle>
      <div className="p-4 space-y-3">
        <div>
          <div className="text-xs text-white/60 mb-1">To</div>
          <Input placeholder="recipient@example.com" value={to} onChange={setTo} className="bg-white/5 border border-white/10 rounded-md" />
          {recent.length > 0 && (
            <div className="mt-1 text-[11px] text-white/50">Recent: {recent.slice(0,5).join(', ')}</div>
          )}
        </div>
        <div>
          <div className="text-xs text-white/60 mb-1">Subject</div>
          <Input value={subject} onChange={setSubject} className="bg-white/5 border border-white/10 rounded-md" />
        </div>
        <div>
          <div className="text-xs text-white/60 mb-1">Body</div>
          <Input multiLine minRows={10} value={body} onChange={setBody} className="bg-white/5 border border-white/10 rounded-md" />
        </div>
        {message && <div className="text-xs text-white/70">{message}</div>}
      </div>
      <WindowFooter>
        <div className="flex gap-2">
          <HeadlessButton disabled={busy} onClick={regenerate} className="text-xs px-3 py-1.5 rounded border border-white/10 text-white/80 hover:border-white/30 hover:bg-white/5">Regenerate</HeadlessButton>
          <HeadlessButton disabled={busy} onClick={send} className={cn('text-xs px-3 py-1.5 rounded border', 'border-white/10 text-white/80 hover:border-white/30 hover:bg-white/5')}>Send</HeadlessButton>
          <HeadlessButton disabled={busy} onClick={onClose} className="text-xs px-3 py-1.5 rounded border border-white/10 text-white/80 hover:border-white/30 hover:bg-white/5">Cancel</HeadlessButton>
        </div>
      </WindowFooter>
      <NotificationWindow
        show={showToast}
        title="Gmail"
        message="Email Sent ✅"
        windowType="notification"
      />
    </InlineWindow>
  );
});


