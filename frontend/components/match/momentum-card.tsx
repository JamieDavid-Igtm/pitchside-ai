'use client';

import { Match } from '@/types/match';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { cn } from '@/utils/cn';

export function MomentumCard({ match }: { match: Match }) {
  if (match.momentum === undefined) return null;

  const homePercent = match.momentum;
  const awayPercent = 100 - homePercent;
  const label = homePercent > 55 ? `${match.homeTeam} dominating` : awayPercent > 55 ? `${match.awayTeam} dominating` : 'Balanced';

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base">Momentum</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs text-secondary font-medium truncate max-w-[40%]">{match.homeTeam}</span>
          <span className="text-xs text-muted">{label}</span>
          <span className="text-xs text-secondary font-medium truncate max-w-[40%] text-right">{match.awayTeam}</span>
        </div>
        <div className="flex h-3 rounded-full bg-elevated overflow-hidden">
          <div
            className="h-full bg-pitch transition-all duration-700 ease-out"
            style={{ width: `${homePercent}%` }}
          />
          <div
            className="h-full bg-info transition-all duration-700 ease-out"
            style={{ width: `${awayPercent}%` }}
          />
        </div>
        <div className="flex justify-between mt-2 text-xs text-muted tabular-nums">
          <span>{homePercent}%</span>
          <span>{awayPercent}%</span>
        </div>
      </CardContent>
    </Card>
  );
}
