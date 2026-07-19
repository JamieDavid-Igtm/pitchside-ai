'use client';

import { MatchEvent, StorylineChapter } from '@/types/match';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/utils/cn';
import { Zap, Target, AlertTriangle, RefreshCw, BookOpen } from 'lucide-react';
import { motion } from 'framer-motion';

const eventIcons: Record<string, typeof Zap> = {
  goal: Target,
  own_goal: Target,
  penalty: Target,
  penalty_missed: Target,
  yellow_card: AlertTriangle,
  red_card: AlertTriangle,
  var: RefreshCw,
  substitution: RefreshCw,
  injury: AlertTriangle,
  kickoff: Zap,
  halftime: Zap,
  fulltime: Zap,
  odds_shift: RefreshCw,
};

const eventColors: Record<string, string> = {
  goal: 'text-pitch',
  own_goal: 'text-danger',
  penalty: 'text-warning',
  penalty_missed: 'text-danger',
  yellow_card: 'text-warning',
  red_card: 'text-danger',
  var: 'text-info',
  substitution: 'text-secondary',
  injury: 'text-danger',
  kickoff: 'text-pitch',
  halftime: 'text-warning',
  fulltime: 'text-info',
  odds_shift: 'text-info',
};

export function StorylineTimeline({
  events,
  chapters,
}: {
  events: MatchEvent[];
  chapters?: StorylineChapter[];
}) {
  const hasContent = (events && events.length > 0) || (chapters && chapters.length > 0);

  if (!hasContent) {
    return (
      <div className="text-center py-12 text-muted">
        <p className="text-sm">No moments yet. The story begins with the first whistle.</p>
      </div>
    );
  }

  const allItems: Array<
    | { kind: 'event'; data: MatchEvent }
    | { kind: 'chapter'; data: StorylineChapter }
  > = [];

  for (const event of events || []) {
    const chapter = (chapters || []).find((c) => c.eventId === event._id);
    if (chapter) {
      allItems.push({ kind: 'chapter', data: chapter });
    } else {
      allItems.push({ kind: 'event', data: event });
    }
  }

  return (
    <div className="relative space-y-0">
      {allItems.map((item, index) => {
        const isLast = index === allItems.length - 1;
        if (item.kind === 'chapter') {
          return (
            <motion.div
              key={item.data.eventId}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.25, ease: 'easeOut' }}
              className="relative flex gap-4 pb-6 last:pb-0"
            >
              {!isLast && <div className="absolute left-[15px] top-8 bottom-0 w-px bg-border" />}
              <div className="relative z-10 flex h-8 w-8 shrink-0 items-center justify-center rounded-full border-2 border-pitch/40 bg-pitch/10">
                <BookOpen className="h-4 w-4 text-pitch" />
              </div>
              <div className="flex-1 min-w-0 pt-1">
                <div className="flex items-center gap-2 mb-1">
                  {item.data.minute !== undefined && (
                    <span className="font-heading text-xs font-semibold text-pitch tabular-nums">
                      {item.data.minute}&apos;
                    </span>
                  )}
                  <span className="font-heading text-sm font-semibold text-primary">
                    {item.data.title}
                  </span>
                </div>
                <p className="text-sm text-secondary leading-snug">{item.data.headline}</p>
                <p className="text-xs text-muted mt-1 leading-snug">{item.data.explanation}</p>

                <div className="mt-2 space-y-1.5">
                  <MiniLine label="Market" value={item.data.marketReaction} />
                  <MiniLine label="Tactics" value={item.data.tacticalImplication} />
                </div>

                <div className="mt-2 flex items-center gap-2">
                  <Badge variant="outline" className="text-[10px]">
                    {item.data.matchMood}
                  </Badge>
                  {item.data.team && (
                    <span className="text-[11px] text-muted">{item.data.team}</span>
                  )}
                </div>
              </div>
            </motion.div>
          );
        }

        const event = item.data;
        const Icon = eventIcons[event.eventType] || Zap;
        const colorClass = eventColors[event.eventType] || 'text-secondary';

        return (
          <div key={event._id} className="relative flex gap-4 pb-6 last:pb-0">
            {!isLast && <div className="absolute left-[15px] top-8 bottom-0 w-px bg-border" />}
            <div className={cn("relative z-10 flex h-8 w-8 shrink-0 items-center justify-center rounded-full border-2 border-border bg-surface", colorClass)}>
              <Icon className="h-4 w-4" />
            </div>
            <div className="flex-1 min-w-0 pt-1">
              <div className="flex items-center gap-2 mb-1">
                {event.minute !== undefined && (
                  <span className="font-heading text-xs font-semibold text-pitch tabular-nums">
                    {event.minute}&apos;
                  </span>
                )}
                <span className="text-xs text-muted">{event.description}</span>
              </div>
              {event.team && (
                <p className="text-sm text-secondary font-medium">{event.team}</p>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}

function MiniLine({ label, value }: { label: string; value: string }) {
  return (
    <p className="text-[11px] text-muted leading-snug">
      <span className="font-semibold text-secondary">{label}: </span>
      {value}
    </p>
  );
}
