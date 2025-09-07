import { observer } from 'mobx-react-lite';
import { useEffect, useState } from 'react';
import { Input } from '@/components/ui/Input';
import { HeadlessButton } from '@/components/ui/HeadlessButton';
import { cn } from '@/lib/utils';
import { gmailService } from '@/services/GmailService';

export const IntegrationsPage = observer(() => {
  const [clientId, setClientId] = useState('');
  const [clientSecret, setClientSecret] = useState('');
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    gmailService.refreshStatus();
  }, []);

  const saveCreds = async () => {
    setBusy(true);
    setMessage(null);
    try {
      await gmailService.setOAuthClient(clientId.trim(), clientSecret.trim());
      setMessage('Saved.');
    } catch (e: any) {
      setMessage(e?.message || 'Failed to save');
    } finally {
      setBusy(false);
    }
  };

  const login = async () => {
    setBusy(true);
    setMessage(null);
    const ok = await gmailService.login();
    setBusy(false);
    setMessage(ok ? 'Logged in.' : 'Login failed.');
  };

  const logout = async () => {
    setBusy(true);
    setMessage(null);
    await gmailService.logout();
    setBusy(false);
    setMessage('Logged out.');
  };

  return (
    <div className={cn('p-8 h-full overflow-x-auto space-y-6')}>
      <div>
        <h1 className="text-white text-xl font-semibold">Integrations</h1>
        <p className="text-white/70 mt-1">Connect external services to AssistX.</p>
      </div>

      <div className="rounded-xl border border-white/10 p-4 bg-stone-900/60">
        <div className="flex items-center justify-between">
          <h2 className="text-white font-medium">Gmail</h2>
          <span className={cn('text-xs px-2 py-0.5 rounded-full', gmailService.isReady ? 'bg-green-500/20 text-green-300' : 'bg-white/10 text-white/70')}>
            {gmailService.isReady ? 'Connected' : gmailService.configured ? 'Configured' : 'Not configured'}
          </span>
        </div>

        <p className="text-white/70 text-sm mt-2">Use your own Google OAuth Desktop credentials to enable sending emails.</p>
        <ol className="text-white/60 text-xs mt-2 list-decimal list-inside space-y-1">
          <li>Create a project in Google Cloud Console.</li>
          <li>Enable Gmail API.</li>
          <li>Create OAuth 2.0 Client ID (Application type: Desktop app).</li>
          <li>Paste Client ID and Secret below and Save.</li>
          <li>Click Login to authorize.</li>
        </ol>

        <div className="mt-4 grid grid-cols-2 gap-3">
          <Input placeholder="Client ID" value={clientId} onChange={setClientId} className="bg-white/5 border border-white/10 rounded-md" />
          <Input placeholder="Client Secret" value={clientSecret} onChange={setClientSecret} className="bg-white/5 border border-white/10 rounded-md" />
        </div>
        <div className="mt-3 flex gap-2">
          <HeadlessButton disabled={busy} onClick={saveCreds} className="text-xs px-3 py-1.5 rounded border border-white/10 text-white/80 hover:border-white/30 hover:bg-white/5">Save</HeadlessButton>
          <HeadlessButton disabled={busy || !gmailService.configured} onClick={login} className="text-xs px-3 py-1.5 rounded border border-white/10 text-white/80 hover:border-white/30 hover:bg-white/5">Login</HeadlessButton>
          <HeadlessButton disabled={busy || !gmailService.authenticated} onClick={logout} className="text-xs px-3 py-1.5 rounded border border-white/10 text-white/80 hover:border-white/30 hover:bg-white/5">Logout</HeadlessButton>
        </div>
        {message && <div className="mt-2 text-xs text-white/70">{message}</div>}
        {gmailService.lastError && <div className="mt-1 text-xs text-red-300">{gmailService.lastError}</div>}
      </div>
    </div>
  );
});


