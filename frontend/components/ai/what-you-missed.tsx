'use client';

import { useState } from 'react';
import { WhatYouMissed } from '@/types/match';
import { cn } from '@/utils/cn';
import { History, Loader2, X, AlertCircle } from 'lucide-react';
import { fetchWhatYouMissed } from '@/services/api';

export function WhatYouMissedAction({ matchId }: { matchId: string }) {
  const [open, setOpen] = useState(false);
  const [data, setData] = useState<WhatYouMissed | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function openRecap() {
    setOpen(true);
    if (data || loading) return;
    setLoading(true);
    setError(null);
    try {
      const recap = await fetchWhatYouMissed(matchId);
      setData(recap);
    } catch {
      setError('Could not build your recap. Please try again.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      <button
        onClick={openRecap}
        className="flex w-full items-center justify-center gap-2 rounded-xl border border-border bg-surface px-4 py-3 text-sm font-medium text-primary transition-all hover:border-pitch/50 hover:bg-elevated"
      >
        <History className="h-4 w-4 text-pitch" />
        What You Missed
      </button>

      {open && (
        <div className="fixed inset-0 z-[100] flex items-end justify-center bg-midnight/70 backdrop-blur-sm md:items-center">
          <div className="w-full max-w-lg rounded-t-2xl border border-border bg-surface p-5 md:rounded-2xl max-h-[85vh] overflow-y-auto">
            <div className="flex items-start justify-between gap-3 mb-3">
              <div className="flex items-center gap-2">
                <span className="flex h-8 w-8 items-center justify-center rounded-full bg-pitch/15">
                  <History className="h-4 w-4 text-pitch" />
                </span>
                <h3 className="font-heading text-base font-semibold text-primary">What You Missed</h3>
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
                Building your recap…
              </div>
            )}
            {error && (
              <div className="flex items-start gap-2 py-6 text-sm text-danger">
                <AlertCircle className="h-4 w-4 mt-0.5 shrink-0" />
                {error}
              </div>
            )}
            {!loading && data && (
              <div className="space-y-4">
                <p className="text-sm leading-relaxed text-secondary">{data.summary}</p>

                <RecapList title="Goals" items={data.goals} />
                <RecapList title="Cards" items={data.cards} />
                <RecapList title="Momentum Shifts" items={data.momentumShifts} />
                {data.biggestMarketMovement && (
                  <RecapList title="Biggest Market Move" items={[data.biggestMarketMovement]} />
                )}

                <div className="rounded-lg bg-elevated px-3 py-2">
                  <p className="text-xs uppercase tracking-wide text-muted">Current State</p>
                  <p className="text-sm font-medium text-primary mt-0.5">{data.currentState}</p>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
}

function RecapList({ title, items }: { title: string; items: string[] }) {
  if (!items || items.length === 0) return null;
  return (
    <div>
      <p className="text-xs font-semibold uppercase tracking-wide text-muted mb-1">{title}</p>
      <ul className="space-y-1">
        {items.map((item, i) => (
          <li key={i} className="text-sm text-secondary leading-snug flex gap-2">
            <span className="text-pitch mt-1.5 h-1 w-1 shrink-0 rounded-full bg-pitch" />
            {item}
          </li>
        ))}
      </ul>
    </div>
  );
}
