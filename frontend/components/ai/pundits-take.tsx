'use client';

import { Commentary } from '@/types/match';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/utils/cn';
import { Mic, Sparkles } from 'lucide-react';

const toneColors: Record<string, string> = {
  calm: 'text-info',
  dramatic: 'text-danger',
  exciting: 'text-pitch',
  tense: 'text-warning',
  historic: 'text-pitch',
};

export function PunditsTake({
  commentary,
  isNew = false,
  minimal = false,
}: {
  commentary: Commentary;
  isNew?: boolean;
  minimal?: boolean;
}) {
  if (!commentary) return null;

  return (
    <Card
      className={cn(
        'relative overflow-hidden border-pitch/20 bg-gradient-to-b from-surface to-surface/60',
        isNew && 'ring-1 ring-pitch/40'
      )}
    >
      <div className="absolute inset-x-0 top-0 h-0.5 bg-pitch/60" />
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between gap-2">
          <CardTitle className="text-base flex items-center gap-2">
            <span className="flex h-7 w-7 items-center justify-center rounded-full bg-pitch/15">
              <Mic className="h-4 w-4 text-pitch" />
            </span>
            Pundit&apos;s Take
          </CardTitle>
          <Badge variant="outline" className={cn('capitalize', toneColors[commentary.tone])}>
            {commentary.tone}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        <p className="font-heading text-lg font-semibold text-primary leading-snug">
          {commentary.headline}
        </p>

        {!minimal && (
          <div className="space-y-3 text-sm">
            <Section label="The Moment" text={commentary.moment} />
            <Section label="What Changed" text={commentary.whatChanged} />
            <Section label="Why The Market Reacted" text={commentary.marketReaction} />
            <Section label="Watch Next" text={commentary.watchNext} />
          </div>
        )}

        {minimal && <p className="text-sm text-secondary">{commentary.moment}</p>}

        {commentary.generatedBy !== 'gemini' && (
          <div className="flex items-center gap-1.5 text-xs text-muted">
            <Sparkles className="h-3 w-3" />
            <span>Smart template (AI unavailable)</span>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function Section({ label, text }: { label: string; text: string }) {
  return (
    <div>
      <p className="text-xs font-semibold uppercase tracking-wider text-muted mb-0.5">{label}</p>
      <p className="text-secondary leading-relaxed">{text}</p>
    </div>
  );
}
