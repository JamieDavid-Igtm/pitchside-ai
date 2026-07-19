'use client';

import { useState } from 'react';
import { cn } from '@/utils/cn';
import { GraduationCap, Loader2, X } from 'lucide-react';
import { fetchBeginnerExplanation } from '@/services/api';

export function BeginnerExplainer({ matchId }: { matchId: string }) {
  const [open, setOpen] = useState(false);
  const [text, setText] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function openExplainer() {
    setOpen(true);
    if (text || loading) return;
    setLoading(true);
    setError(null);
    try {
      const explanation = await fetchBeginnerExplanation(matchId);
      setText(explanation);
    } catch {
      setError('Could not load the simple explanation. Please try again.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      <button
        onClick={openExplainer}
        className={cn(
          'flex w-full items-center justify-center gap-2 rounded-xl border border-border bg-surface px-4 py-3 text-sm font-medium text-primary transition-all hover:border-pitch/50 hover:bg-elevated'
        )}
      >
        <GraduationCap className="h-4 w-4 text-pitch" />
        Explain Like I&apos;m New
      </button>

      {open && (
        <div className="fixed inset-0 z-[100] flex items-end justify-center bg-midnight/70 backdrop-blur-sm md:items-center">
          <div className="w-full max-w-lg rounded-t-2xl border border-border bg-surface p-5 md:rounded-2xl">
            <div className="flex items-start justify-between gap-3 mb-3">
              <div className="flex items-center gap-2">
                <span className="flex h-8 w-8 items-center justify-center rounded-full bg-pitch/15">
                  <GraduationCap className="h-4 w-4 text-pitch" />
                </span>
                <h3 className="font-heading text-base font-semibold text-primary">
                  Explain Like I&apos;m New
                </h3>
              </div>
              <button
                onClick={() => setOpen(false)}
                className="rounded-full p-1 text-muted hover:bg-elevated hover:text-primary"
                aria-label="Close"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {loading && (
              <div className="flex items-center gap-2 py-8 text-sm text-muted">
                <Loader2 className="h-4 w-4 animate-spin" />
                Preparing a simple explanation…
              </div>
            )}
            {error && <p className="py-6 text-sm text-danger">{error}</p>}
            {!loading && text && (
              <p className="text-sm leading-relaxed text-secondary">{text}</p>
            )}
          </div>
        </div>
      )}
    </>
  );
}
