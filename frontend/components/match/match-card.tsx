'use client';

import Link from 'next/link';
import { Match, MatchStatus } from '@/types/match';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/utils/cn';
import { Play } from 'lucide-react';

const statusLabels: Record<MatchStatus, { label: string; variant: 'live' | 'warning' | 'secondary' | 'danger' | 'outline' }> = {
  live: { label: 'LIVE', variant: 'live' },
  halftime: { label: 'HT', variant: 'warning' },
  fulltime: { label: 'FT', variant: 'secondary' },
  scheduled: { label: 'UPCOMING', variant: 'outline' },
  postponed: { label: 'POSTPONED', variant: 'danger' },
  cancelled: { label: 'CANCELLED', variant: 'danger' },
};

function formatKickoffTime(iso: string): string {
  const date = new Date(iso);
  return date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: false });
}

export function MatchCard({ match }: { match: Match }) {
  const statusInfo = statusLabels[match.status];

  return (
    <Link href={`/match/${match._id}`} className="block">
      <div className="group relative rounded-xl border border-border bg-surface p-4 transition-all duration-150 hover:border-pitch/50 hover:shadow-lg hover:shadow-pitch/5 hover:scale-[1.01]">
        <div className="flex items-center justify-between mb-3">
          <span className="text-xs text-muted font-medium truncate flex-1">
            {match.competition}
          </span>
          <Badge variant={statusInfo.variant} className="ml-2">
            {match.status === 'live' && <span className="mr-1.5 h-1.5 w-1.5 rounded-full bg-midnight animate-pulse-live" />}
            {statusInfo.label}
          </Badge>
        </div>

        <div className="flex items-center justify-between gap-4">
          <div className="flex-1 min-w-0">
            <p className="font-heading font-semibold text-primary truncate text-sm">
              {match.homeTeam || 'TBD'}
            </p>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <span className="font-heading text-2xl font-bold text-primary tabular-nums">
              {match.homeScore ?? 0}
            </span>
            <span className="text-muted text-lg">-</span>
            <span className="font-heading text-2xl font-bold text-primary tabular-nums">
              {match.awayScore ?? 0}
            </span>
          </div>
          <div className="flex-1 min-w-0 text-right">
            <p className="font-heading font-semibold text-primary truncate text-sm">
              {match.awayTeam || 'TBD'}
            </p>
          </div>
        </div>

        <div className="flex items-center justify-between mt-3 pt-3 border-t border-border">
          <div className="flex items-center gap-2">
            {match.minute !== undefined && match.status === 'live' && (
              <span className="text-xs font-medium text-pitch">
                {match.minute}&apos;
              </span>
            )}
            {match.currentMood && (
              <span className="text-xs text-secondary hidden sm:inline">
                {match.currentMood}
              </span>
            )}
          </div>
          <div className="flex items-center gap-1 text-xs text-muted">
            {match.status === 'live' && (
              <>
                <Play className="h-3 w-3 text-pitch" />
                <span className="text-pitch font-medium">Watch</span>
              </>
            )}
            {match.status === 'scheduled' && (
              <span>{formatKickoffTime(match.kickoffTime)}</span>
            )}
          </div>
        </div>
      </div>
    </Link>
  );
}
