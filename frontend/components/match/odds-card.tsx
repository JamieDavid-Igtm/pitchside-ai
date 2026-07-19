'use client';

import { Match } from '@/types/match';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { cn } from '@/utils/cn';

export function OddsCard({ match }: { match: Match }) {
  if (!match.currentOdds) return null;

  const { home, draw, away } = match.currentOdds;
  const maxOdds = Math.max(home, draw, away);

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base">Current Odds</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="space-y-2">
          <div className="flex items-center justify-between text-sm">
            <span className="text-secondary">Home Win</span>
            <span className="font-heading font-semibold text-primary">{home.toFixed(2)}</span>
          </div>
          <div className="h-2 rounded-full bg-elevated overflow-hidden">
            <div
              className="h-full rounded-full bg-pitch transition-all duration-500"
              style={{ width: `${Math.max((home / maxOdds) * 100, 10)}%` }}
            />
          </div>
        </div>

        <div className="space-y-2">
          <div className="flex items-center justify-between text-sm">
            <span className="text-secondary">Draw</span>
            <span className="font-heading font-semibold text-primary">{draw.toFixed(2)}</span>
          </div>
          <div className="h-2 rounded-full bg-elevated overflow-hidden">
            <div
              className="h-full rounded-full bg-info transition-all duration-500"
              style={{ width: `${Math.max((draw / maxOdds) * 100, 10)}%` }}
            />
          </div>
        </div>

        <div className="space-y-2">
          <div className="flex items-center justify-between text-sm">
            <span className="text-secondary">Away Win</span>
            <span className="font-heading font-semibold text-primary">{away.toFixed(2)}</span>
          </div>
          <div className="h-2 rounded-full bg-elevated overflow-hidden">
            <div
              className="h-full rounded-full bg-warning transition-all duration-500"
              style={{ width: `${Math.max((away / maxOdds) * 100, 10)}%` }}
            />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
