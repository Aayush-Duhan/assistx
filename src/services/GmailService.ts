import { makeObservable, observable, action, computed } from 'mobx';
import { invoke } from './electron';

export type EmailDraft = {
  to: string;
  subject: string;
  body: string;
};

export class GmailService {
  configured = false;
  authenticated = false;
  lastError: string | null = null;
  recentRecipients: string[] = [];

  constructor() {
    makeObservable(this, {
      configured: observable,
      authenticated: observable,
      lastError: observable,
      recentRecipients: observable,
      isReady: computed,
      setConfigured: action,
      setAuthenticated: action,
      setError: action,
      addRecentRecipient: action,
    });
  }

  get isReady(): boolean {
    return this.configured && this.authenticated;
  }

  setConfigured(v: boolean) { this.configured = v; }
  setAuthenticated(v: boolean) { this.authenticated = v; }
  setError(e: string | null) { this.lastError = e; }
  addRecentRecipient(email: string) {
    const normalized = email.trim().toLowerCase();
    if (!normalized) return;
    if (!this.recentRecipients.includes(normalized)) {
      this.recentRecipients = [normalized, ...this.recentRecipients].slice(0, 20);
    }
  }

  async setOAuthClient(clientId: string, clientSecret: string): Promise<void> {
    await invoke('gmail-set-oauth-client', { clientId, clientSecret });
    await this.refreshStatus();
  }

  async refreshStatus(): Promise<void> {
    const status = await invoke('gmail-get-status', null);
    this.setConfigured(status.configured);
    this.setAuthenticated(status.authenticated);
  }

  async login(): Promise<boolean> {
    try {
      const res = await invoke('gmail-login', null);
      await this.refreshStatus();
      return !!res.success;
    } catch (e: any) {
      this.setError(e?.message || 'Login failed');
      return false;
    }
  }

  async logout(): Promise<void> {
    await invoke('gmail-logout', null);
    await this.refreshStatus();
  }

  async sendEmail(draft: EmailDraft): Promise<boolean> {
    try {
      const res = await invoke('gmail-send', draft);
      if (res.success) {
        this.addRecentRecipient(draft.to);
      }
      return !!res.success;
    } catch (e: any) {
      this.setError(e?.message || 'Send failed');
      return false;
    }
  }
}

export const gmailService = new GmailService();