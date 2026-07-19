'use client';

import { Match } from '@/types/match';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/utils/cn';

const statusLabels: Record<string, { label: string; variant: 'live' | 'warning' | 'secondary' | 'danger' | 'outline' }> = {
  live: { label: 'LIVE', variant: 'live' },
  halftime: { label: 'HT', variant: 'warning' },
  fulltime: { label: 'FT', variant: 'secondary' },
  scheduled: { label: 'UPCOMING', variant: 'outline' },
  postponed: { label: 'POSTPONED', variant: 'danger' },
  cancelled: { label: 'CANCELLED', variant: 'danger' },
};

export function MatchHeader({ match }: { match: Match }) {
  const statusInfo = statusLabels[match.status] || { label: match.status.toUpperCase(), variant: 'outline' as const };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-xs text-muted font-medium uppercase tracking-wider">
            {match.competition}
          </p>
          {match.round && (
            <p className="text-xs text-muted mt-0.5">{match.round}</p>
          )}
        </div>
        <Badge variant={statusInfo.variant}>
          {match.status === 'live' && (
            <span className="mr-1.5 h-1.5 w-1.5 rounded-full bg-midnight animate-pulse-live" />
          )}
          {statusInfo.label}
        </Badge>
      </div>

      <div className="flex items-center justify-between gap-4">
        <div className="flex-1 text-center">
          <p className="font-heading text-2xl sm:text-3xl font-bold text-primary">
            {match.homeTeam}
          </p>
        </div>
        <div className="flex items-center gap-3 sm:gap-4">
          <span className="font-heading text-5xl sm:text-7xl font-bold text-primary tabular-nums">
            {match.homeScore}
          </span>
          <span className="text-muted text-2xl sm:text-4xl font-light">-</span>
          <span className="font-heading text-5xl sm:text-7xl font-bold text-primary tabular-nums">
            {match.awayScore}
          </span>
        </div>
        <div className="flex-1 text-center">
          <p className="font-heading text-2xl sm:text-3xl font-bold text-primary">
            {match.awayTeam}
          </p>
        </div>
      </div>

      {match.minute !== undefined && (
        <div className="flex items-center justify-center">
          <span className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-pitch/10 border border-pitch/20">
            <span className="h-2 w-2 rounded-full bg-pitch animate-pulse-live" />
            <span className="font-heading text-sm font-semibold text-pitch">
              {match.status === 'halftime' ? 'HALF TIME' : `${match.minute}'`}
            </span>
          </span>
        </div>
      )}
    </div>
  );
}
