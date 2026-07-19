import mongoose, { Schema, Document } from 'mongoose';
import { MatchStatus, EventType } from '../types/index.js';

export interface IMatch extends Document {
  txlineMatchId: string;
  competition: string;
  season?: string;
  round?: string;
  status: MatchStatus;
  kickoffTime: Date;
  homeTeam: string;
  awayTeam: string;
  participant1IsHome: boolean;
  participant1Id?: number;
  participant2Id?: number;
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
  storyGenerated?: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const MatchSchema = new Schema<IMatch>(
  {
  txlineMatchId: { type: String, required: true, unique: true },
  competition: { type: String, required: true },
  season: { type: String },
  round: { type: String },
  status: {
    type: String,
    required: true,
    enum: ['scheduled', 'live', 'halftime', 'fulltime', 'postponed', 'cancelled'],
  },
  kickoffTime: { type: Date, required: true },
  homeTeam: { type: String, required: true },
  awayTeam: { type: String, required: true },
  participant1IsHome: { type: Boolean, required: true, default: true },
  participant1Id: { type: Number },
  participant2Id: { type: Number },
  homeScore: { type: Number, default: 0 },
  awayScore: { type: Number, default: 0 },
    minute: { type: Number },
    stoppageTime: { type: Number },
    currentOdds: {
      home: { type: Number },
      draw: { type: Number },
      away: { type: Number },
    },
    winProbability: {
      home: { type: Number },
      draw: { type: Number },
      away: { type: Number },
    },
    momentum: { type: Number },
    currentMood: { type: String },
    lastEvent: { type: String },
    storyGenerated: { type: Boolean, default: false },
  },
  { timestamps: { createdAt: 'createdAt', updatedAt: 'updatedAt' } }
);

MatchSchema.index({ status: 1 });
MatchSchema.index({ kickoffTime: 1 });

export const Match = mongoose.model<IMatch>('Match', MatchSchema);

export interface IMatchEvent extends Document {
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

const MatchEventSchema = new Schema<IMatchEvent>(
  {
    txlineEventId: { type: String, required: true, unique: true },
    matchId: { type: String, required: true, index: true },
    minute: { type: Number },
    stoppageMinute: { type: Number },
    eventType: {
      type: String,
      required: true,
      enum: [
        'goal',
        'own_goal',
        'penalty',
        'penalty_missed',
        'yellow_card',
        'red_card',
        'substitution',
        'injury',
        'var',
        'kickoff',
        'halftime',
        'fulltime',
        'odds_shift',
      ],
    },
    team: { type: String },
    player: { type: String },
    description: { type: String, required: true },
    rawPayload: { type: Schema.Types.Mixed, required: true },
    processed: { type: Boolean, default: false },
  },
  { timestamps: { createdAt: 'createdAt', updatedAt: 'updatedAt' } }
);

MatchEventSchema.index({ matchId: 1, eventType: 1 });
MatchEventSchema.index({ matchId: 1, createdAt: -1 });

export const MatchEvent = mongoose.model<IMatchEvent>('MatchEvent', MatchEventSchema);

export type CommentaryTone = 'calm' | 'dramatic' | 'exciting' | 'tense' | 'historic';

export interface ICommentary extends Document {
  matchId: string;
  eventId?: string;
  txlineEventId?: string;
  headline: string;
  moment: string;
  whatChanged: string;
  marketReaction: string;
  watchNext: string;
  tone: CommentaryTone;
  generatedBy: 'gemini' | 'openai' | 'fallback' | 'template';
  createdAt: Date;
}

const CommentarySchema = new Schema<ICommentary>(
  {
    matchId: { type: String, required: true, index: true },
    eventId: { type: String },
    txlineEventId: { type: String, index: true },
    headline: { type: String, required: true },
    moment: { type: String, required: true },
    whatChanged: { type: String, required: true },
    marketReaction: { type: String, required: true },
    watchNext: { type: String, required: true },
    tone: {
      type: String,
      enum: ['calm', 'dramatic', 'exciting', 'tense', 'historic'],
      default: 'calm',
    },
    generatedBy: {
      type: String,
      enum: ['gemini', 'openai', 'fallback', 'template'],
      default: 'gemini',
    },
  },
  { timestamps: { createdAt: 'createdAt', updatedAt: 'updatedAt' } }
);

CommentarySchema.index({ matchId: 1, eventId: 1 });

export const Commentary = mongoose.model<ICommentary>('Commentary', CommentarySchema);

export type MoodConfidence = 'high' | 'medium' | 'low';

export interface IMatchMood extends Document {
  matchId: string;
  minute?: number;
  mood: string;
  confidence: MoodConfidence;
  reason: string;
  generatedBy: 'gemini' | 'openai' | 'fallback' | 'template' | 'rule';
  createdAt: Date;
}

const MatchMoodSchema = new Schema<IMatchMood>(
  {
    matchId: { type: String, required: true, index: true },
    minute: { type: Number },
    mood: { type: String, required: true },
    confidence: {
      type: String,
      enum: ['high', 'medium', 'low'],
      default: 'medium',
    },
    reason: { type: String, default: '' },
    generatedBy: {
      type: String,
      enum: ['gemini', 'openai', 'fallback', 'template', 'rule'],
      default: 'rule',
    },
  },
  { timestamps: { createdAt: 'createdAt', updatedAt: 'updatedAt' } }
);

MatchMoodSchema.index({ matchId: 1, createdAt: -1 });

export const MatchMood = mongoose.model<IMatchMood>('MatchMood', MatchMoodSchema);

export interface IMarketExplanation extends Document {
  matchId: string;
  eventId?: string;
  txlineEventId?: string;
  previousOdds?: { home: number; draw: number; away: number };
  newOdds?: { home: number; draw: number; away: number };
  reason: string;
  confidence: number;
  explanation: string;
  generatedBy: 'gemini' | 'openai' | 'fallback' | 'template';
  createdAt: Date;
}

const MarketExplanationSchema = new Schema<IMarketExplanation>(
  {
    matchId: { type: String, required: true, index: true },
    eventId: { type: String },
    txlineEventId: { type: String, index: true },
    previousOdds: {
      home: { type: Number },
      draw: { type: Number },
      away: { type: Number },
    },
    newOdds: {
      home: { type: Number },
      draw: { type: Number },
      away: { type: Number },
    },
    reason: { type: String, required: true },
    confidence: { type: Number, min: 0, max: 100, default: 50 },
    explanation: { type: String, required: true },
    generatedBy: {
      type: String,
      enum: ['gemini', 'openai', 'fallback', 'template'],
      default: 'gemini',
    },
  },
  { timestamps: { createdAt: 'createdAt', updatedAt: 'updatedAt' } }
);

MarketExplanationSchema.index({ matchId: 1, eventId: 1 });

export const MarketExplanation = mongoose.model<IMarketExplanation>('MarketExplanation', MarketExplanationSchema);

export type NotificationChannel = 'telegram';
export type NotificationStatus = 'pending' | 'sent' | 'failed' | 'delivered';

export interface INotificationLog extends Document {
  user: string;
  match: string;
  event: string;
  channel: NotificationChannel;
  status: NotificationStatus;
  kind: string;
  sentAt?: Date;
  opened: boolean;
  openedAt?: Date;
  createdAt: Date;
}

const NotificationLogSchema = new Schema<INotificationLog>(
  {
    user: { type: String, required: true, index: true },
    match: { type: String, required: true, index: true },
    event: { type: String, required: true },
    channel: {
      type: String,
      enum: ['telegram'],
      default: 'telegram',
    },
    status: {
      type: String,
      enum: ['pending', 'sent', 'failed', 'delivered'],
      default: 'pending',
    },
    kind: { type: String, required: true },
    sentAt: { type: Date },
    opened: { type: Boolean, default: false },
    openedAt: { type: Date },
  },
  { timestamps: { createdAt: 'createdAt', updatedAt: 'updatedAt' } }
);

NotificationLogSchema.index({ user: 1, match: 1, kind: 1 });

export const NotificationLog = mongoose.model<INotificationLog>('NotificationLog', NotificationLogSchema);

export interface IMatchStory extends Document {
  match: string;
  title: string;
  summary: string;
  beginning: string;
  turningPoint: string;
  keyMoments: string[];
  finalReflection: string;
  story: string;
  hero?: string;
  generatedBy: 'gemini' | 'openai' | 'template';
  createdAt: Date;
}

const MatchStorySchema = new Schema<IMatchStory>(
  {
    match: { type: String, required: true, unique: true, index: true },
    title: { type: String, required: true },
    summary: { type: String, required: true },
    beginning: { type: String, required: true },
    turningPoint: { type: String, required: true },
    keyMoments: { type: [String], default: [] },
    finalReflection: { type: String, required: true },
    story: { type: String, required: true },
    hero: { type: String },
    generatedBy: {
      type: String,
      enum: ['gemini', 'openai', 'template'],
      default: 'gemini',
    },
  },
  { timestamps: { createdAt: 'createdAt', updatedAt: 'updatedAt' } }
);

export const MatchStory = mongoose.model<IMatchStory>('MatchStory', MatchStorySchema);

export type TelegramConnectionStatus = 'connected' | 'disconnected';

export interface IUser extends Document {
  walletAddress: string;
  username?: string;
  displayName?: string;
  telegramChatId?: string;
  telegramLinkCode?: string;
  telegramLinkCodeExpiresAt?: Date;
  telegramConnected: boolean;
  avatar?: string;
  favoriteTeams: string[];
  notificationsEnabled: boolean;
  notificationPreferences: {
    kickoff: boolean;
    goals: boolean;
    redCards: boolean;
    penalties: boolean;
    halfTime: boolean;
    fullTime: boolean;
    majorOdds: boolean;
    matchStory: boolean;
  };
  lastLogin?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const UserSchema = new Schema<IUser>(
  {
    walletAddress: { type: String, required: true, unique: true, index: true },
    username: { type: String },
    displayName: { type: String },
    telegramChatId: { type: String, index: true },
    telegramLinkCode: { type: String, index: true },
    telegramLinkCodeExpiresAt: { type: Date },
    telegramConnected: { type: Boolean, default: false },
    avatar: { type: String },
    favoriteTeams: { type: [String], default: [], validate: [arrayMax(10), 'Cannot follow more than 10 teams'] },
    notificationsEnabled: { type: Boolean, default: true },
    notificationPreferences: {
      kickoff: { type: Boolean, default: true },
      goals: { type: Boolean, default: true },
      redCards: { type: Boolean, default: true },
      penalties: { type: Boolean, default: true },
      halfTime: { type: Boolean, default: true },
      fullTime: { type: Boolean, default: true },
      majorOdds: { type: Boolean, default: true },
      matchStory: { type: Boolean, default: true },
    },
    lastLogin: { type: Date },
  },
  { timestamps: { createdAt: 'createdAt', updatedAt: 'updatedAt' } }
);

function arrayMax(max: number) {
  return (val: string[]) => !val || val.length <= max;
}

UserSchema.index({ telegramChatId: 1 });

export const User = mongoose.model<IUser>('User', UserSchema);
