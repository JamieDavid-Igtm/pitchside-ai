import { EventType } from '../types/index.js';

export interface OddsShiftInput {
  previousOdds: { home: number; draw: number; away: number };
  newOdds: { home: number; draw: number; away: number };
}

export function isSignificantOddsShift(
  previous: { home: number; draw: number; away: number } | undefined,
  next: { home: number; draw: number; away: number } | undefined
): boolean {
  if (!previous || !next) return false;

  const threshold = 0.15;
  const moved = (a: number, b: number) => {
    if (a <= 0 || b <= 0) return false;
    const change = Math.abs(a - b) / a;
    return change >= threshold;
  };

  return moved(previous.home, next.home) || moved(previous.draw, next.draw) || moved(previous.away, next.away);
}

export function oddsShiftEventType(): EventType {
  return 'odds_shift';
}
