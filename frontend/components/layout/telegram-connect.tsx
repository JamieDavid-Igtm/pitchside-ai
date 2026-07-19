'use client';

import { useState } from 'react';
import { startTelegramLink, disconnectTelegram, fetchTelegramStatus } from '@/services/api';
import { Loader2, Send, CheckCircle2, Unlink, Copy, Check } from 'lucide-react';
import { cn } from '@/utils/cn';

export function TelegramConnect({ wallet }: { wallet?: string }) {
  const [connected, setConnected] = useState<boolean | null>(null);
  const [linkCode, setLinkCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  async function connect() {
    if (!wallet) {
      setError('Connect your wallet first to link Telegram.');
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const { linkCode: code } = await startTelegramLink(wallet);
      setLinkCode(code);
      const status = await fetchTelegramStatus(wallet).catch(() => null);
      setConnected(Boolean(status?.connected));
    } catch {
      setError('Could not start Telegram linking. Is the backend running?');
    } finally {
      setLoading(false);
    }
  }

  async function disconnect() {
    if (!wallet) return;
    setLoading(true);
    try {
      await disconnectTelegram(wallet);
      setConnected(false);
      setLinkCode('');
    } catch {
      setError('Could not disconnect Telegram.');
    } finally {
      setLoading(false);
    }
  }

  function copyCode() {
    navigator.clipboard?.writeText(linkCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  }

  if (connected) {
    return (
      <div className="flex items-center justify-between gap-2 rounded-xl border border-pitch/30 bg-pitch/5 px-3 py-2.5">
        <div className="flex items-center gap-2 text-sm text-secondary">
          <CheckCircle2 className="h-4 w-4 text-pitch" />
          Telegram linked — you&apos;ll get match alerts.
        </div>
        <button
          onClick={disconnect}
          disabled={loading}
          className="flex items-center gap-1 text-xs text-muted hover:text-danger transition-colors"
        >
          <Unlink className="h-3.5 w-3.5" />
          Unlink
        </button>
      </div>
    );
  }

  if (linkCode) {
    return (
      <div className="rounded-xl border border-border bg-surface p-3 space-y-2">
        <p className="text-sm text-secondary">
          Open Telegram and send:
        </p>
        <div className="flex items-center gap-2 rounded-lg bg-elevated px-3 py-2">
          <code className="flex-1 font-mono text-sm text-pitch">/start {linkCode}</code>
          <button onClick={copyCode} className="text-muted hover:text-primary" aria-label="Copy code">
            {copied ? <Check className="h-4 w-4 text-pitch" /> : <Copy className="h-4 w-4" />}
          </button>
        </div>
        <p className="text-xs text-muted">
          We&apos;ll confirm here automatically once your account is linked.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <button
        onClick={connect}
        disabled={loading}
        className={cn(
          'flex w-full items-center justify-center gap-2 rounded-xl bg-pitch px-4 py-2.5 text-sm font-semibold text-midnight transition-all hover:opacity-90 disabled:opacity-60'
        )}
      >
        {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
        Connect Telegram
      </button>
      {error && <p className="text-xs text-danger">{error}</p>}
    </div>
  );
}
