'use client';

import { MatchMood } from '@/types/match';
import { cn } from '@/utils/cn';

const moodEmojis: Record<string, string> = {
  'Taking Control': '🔥',
  'Momentum Shift': '🌪️',
  'Balanced Contest': '⚖️',
  'High Pressure': '🚨',
  'Defensive Battle': '🧱',
  'End-to-End Football': '⚡',
  'Late Drama': '⏰',
  'Game Settled': '🧊',
};

const confidenceLabel: Record<string, string> = {
  high: 'High confidence',
  medium: 'Medium confidence',
  low: 'Low confidence',
};

export function MatchMoodCard({
  mood,
  isNew = false,
}: {
  mood: MatchMood | null;
  isNew?: boolean;
}) {
  if (!mood) return null;
  const emoji = moodEmojis[mood.mood] || '⚽';

  return (
    <div
      className={cn(
        'rounded-xl border border-border bg-surface p-4 transition-colors',
        isNew && 'border-pitch/40 bg-pitch/5'
      )}
    >
      <div className="flex items-center gap-3">
        <span className="text-3xl leading-none">{emoji}</span>
        <div className="min-w-0 flex-1">
          <p className="font-heading text-xl font-bold text-primary leading-tight">{mood.mood}</p>
          {mood.reason && (
            <p className="text-sm text-secondary mt-0.5 leading-snug">{mood.reason}</p>
          )}
        </div>
        <div className="shrink-0 text-right">
          <p className="text-xs font-medium text-pitch uppercase tracking-wide">
            {confidenceLabel[mood.confidence] || 'Confidence'}
          </p>
          {mood.minute !== undefined && (
            <p className="text-xs text-muted mt-0.5">{mood.minute}&apos;</p>
          )}
        </div>
      </div>
    </div>
  );
}
