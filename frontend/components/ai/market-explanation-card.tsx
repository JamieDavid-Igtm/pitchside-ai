'use client';

import { MarketExplanation } from '@/types/match';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { cn } from '@/utils/cn';
import { TrendingUp, ShieldQuestion } from 'lucide-react';

function confidenceTone(confidence: number): { label: string; color: string } {
  if (confidence >= 75) return { label: 'High', color: 'text-pitch' };
  if (confidence >= 45) return { label: 'Medium', color: 'text-warning' };
  return { label: 'Low', color: 'text-muted' };
}

export function MarketExplanationCard({
  market,
  isNew = false,
}: {
  market: MarketExplanation;
  isNew?: boolean;
}) {
  if (!market) return null;
  const tone = confidenceTone(market.confidence);

  return (
    <Card className={cn(isNew && 'ring-1 ring-info/40')}>
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center gap-2">
          <TrendingUp className="h-4 w-4 text-info" />
          Why Did The Market Move?
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="flex items-center justify-between gap-2">
          <p className="font-heading text-sm font-semibold text-primary">{market.reason}</p>
          <span className={cn('text-xs font-medium flex items-center gap-1', tone.color)}>
            <ShieldQuestion className="h-3 w-3" />
            {tone.label} · {market.confidence}%
          </span>
        </div>

        <p className="text-sm text-secondary leading-relaxed">{market.explanation}</p>

        {market.previousOdds && market.newOdds && (
          <div className="grid grid-cols-3 gap-2 pt-1">
            {(['home', 'draw', 'away'] as const).map((key) => {
              const prev = market.previousOdds?.[key];
              const next = market.newOdds?.[key];
              const moved = prev !== next;
              return (
                <div key={key} className="rounded-lg bg-elevated p-2 text-center">
                  <p className="text-[10px] uppercase tracking-wide text-muted">
                    {key === 'home' ? 'Home' : key === 'draw' ? 'Draw' : 'Away'}
                  </p>
                  <p className="font-heading text-sm font-semibold text-primary tabular-nums">
                    {next?.toFixed(2)}
                  </p>
                  {moved && prev !== undefined && (
                    <p className="text-[10px] text-muted line-through tabular-nums">
                      {prev.toFixed(2)}
                    </p>
                  )}
                </div>
              );
            })}
          </div>
        )}

        <p className="text-[11px] text-muted italic">
          Odds reflect how likely each result is. This is analysis, not a betting tip.
        </p>
      </CardContent>
    </Card>
  );
}
