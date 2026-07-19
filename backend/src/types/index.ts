export interface TxLINEFixture {
  FixtureId: number;
  Sport?: string;
  Competition?: string;
  CompetitionId?: number;
  FixtureGroupId?: number;
  StartTime: string | number;
  Participant1: string;
  Participant2: string;
  Participant1IsHome: boolean;
  GameState: number;
}

export interface TxLINEScoreUpdate {
  seq: number;
  ts: number;
  fixtureId: number;
  gameState: number;
  stats?: Record<number, number>;
  actions?: TxLINEAction[];
}

export interface TxLINEAction {
  type: string;
  ts: number;
  minute?: number;
  participant?: number;
  data?: Record<string, unknown>;
}

export interface TxLINEOddsUpdate {
  seq: number;
  ts: number;
  fixtureId: number;
  odds: Record<string, unknown>;
}

export type MatchStatus = 'scheduled' | 'live' | 'halftime' | 'fulltime' | 'postponed' | 'cancelled';

export interface Match {
  txlineMatchId: string;
  competition: string;
  season?: string;
  round?: string;
  status: MatchStatus;
  kickoffTime: Date;
  homeTeam: string;
  awayTeam: string;
  homeScore: number;
  awayScore: number;
  minute?: number;
  stoppageTime?: number;
  currentOdds?: {
    home: number;
    draw: number;
    away: number;
  };
  winProbability?: {
    home: number;
    draw: number;
    away: number;
  };
  momentum?: number;
  currentMood?: string;
  lastEvent?: string;
  createdAt: Date;
  updatedAt: Date;
}

export type EventType =
  | 'goal'
  | 'own_goal'
  | 'penalty'
  | 'penalty_missed'
  | 'yellow_card'
  | 'red_card'
  | 'substitution'
  | 'injury'
  | 'var'
  | 'kickoff'
  | 'halftime'
  | 'fulltime'
  | 'odds_shift';

export interface MatchEvent {
  txlineEventId: string;
  matchId: string;
  minute?: number;
  stoppageMinute?: number;
  eventType: EventType;
  team?: string;
  player?: string;
  description: string;
  rawPayload: Record<string, unknown>;
  processed: boolean;
  createdAt: Date;
}
