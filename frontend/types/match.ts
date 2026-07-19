export type MatchStatus = 'scheduled' | 'live' | 'halftime' | 'fulltime' | 'postponed' | 'cancelled';
export type EventType = 'goal' | 'own_goal' | 'penalty' | 'penalty_missed' | 'yellow_card' | 'red_card' | 'substitution' | 'injury' | 'var' | 'kickoff' | 'halftime' | 'fulltime' | 'odds_shift';

export interface Match {
  _id: string;
  txlineMatchId: string;
  competition: string;
  season?: string;
  round?: string;
  status: MatchStatus;
  kickoffTime: string;
  homeTeam: string;
  awayTeam: string;
  homeScore: number;
  awayScore: number;
  minute?: number;
  stoppageTime?: number;
  currentOdds?: { home: number; draw: number; away: number };
  winProbability?: { home: number; draw: number; away: number };
  momentum?: number;
  currentMood?: string;
  lastEvent?: string;
  createdAt: string;
  updatedAt: string;
}

export interface MatchEvent {
  _id: string;
  matchId: string;
  minute?: number;
  stoppageMinute?: number;
  eventType: EventType;
  team?: string;
  player?: string;
  description: string;
  rawPayload: Record<string, unknown>;
  processed: boolean;
  createdAt: string;
}

export interface MatchWithEvents extends Match {
  events: MatchEvent[];
}

export type CommentaryTone = 'calm' | 'dramatic' | 'exciting' | 'tense' | 'historic';

export interface Commentary {
  _id: string;
  matchId: string;
  eventId?: string;
  headline: string;
  moment: string;
  whatChanged: string;
  marketReaction: string;
  watchNext: string;
  tone: CommentaryTone;
  generatedBy: 'gemini' | 'openai' | 'fallback' | 'template';
  createdAt: string;
}

export type MoodConfidence = 'high' | 'medium' | 'low';

export interface MatchMood {
  _id: string;
  matchId: string;
  minute?: number;
  mood: string;
  confidence: MoodConfidence;
  reason: string;
  createdAt: string;
}

export interface MarketExplanation {
  _id: string;
  matchId: string;
  previousOdds?: { home: number; draw: number; away: number };
  newOdds?: { home: number; draw: number; away: number };
  reason: string;
  confidence: number;
  explanation: string;
  generatedBy: 'gemini' | 'openai' | 'fallback' | 'template';
  createdAt: string;
}

export interface StorylineChapter {
  matchId: string;
  eventId: string;
  minute?: number;
  eventType: string;
  team?: string;
  title: string;
  headline: string;
  explanation: string;
  marketReaction: string;
  tacticalImplication: string;
  matchMood: string;
  createdAt: string;
}

export interface WhatYouMissed {
  goals: string[];
  cards: string[];
  momentumShifts: string[];
  biggestMarketMovement?: string;
  currentState: string;
  summary: string;
}

export interface MatchStory {
  _id: string;
  matchId: string;
  title: string;
  summary: string;
  beginning: string;
  turningPoint: string;
  keyMoments: string[];
  finalReflection: string;
  story: string;
  hero?: string;
  generatedBy: 'gemini' | 'openai' | 'template';
  createdAt: string;
}

export interface TelegramStatus {
  connected: boolean;
  telegramConnected: boolean;
}

export interface NotificationLogItem {
  _id: string;
  match: string;
  kind: string;
  status: string;
  headline: string;
  createdAt: string;
}

export interface NotificationsView {
  logs: NotificationLogItem[];
  telegramConnected: boolean;
}

export interface AITestResult {
  label: string;
  moodLabels: string[];
  context: Record<string, unknown>;
  pundit?: Commentary;
  mood?: MatchMood;
  market?: MarketExplanation;
  beginner?: string;
  generatedBy: 'gemini' | 'fallback' | 'unavailable';
  note: string;
}

export interface AIStatus {
  aiAvailable: boolean;
  hasLiveData: boolean;
}
