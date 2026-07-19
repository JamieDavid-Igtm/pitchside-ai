'use client';

import { Match } from '@/types/match';
import { Badge } from '@/components/ui/badge';

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

export function MoodBadge({ match }: { match: Match }) {
  if (!match.currentMood) return null;

  const emoji = moodEmojis[match.currentMood] || '⚽';

  return (
    <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg bg-elevated border border-border">
      <span className="text-lg">{emoji}</span>
      <span className="font-heading text-sm font-semibold text-primary">
        {match.currentMood}
      </span>
    </div>
  );
}
