import { IMatch, Commentary, MatchMood } from '../models/index.js';
import { EventType } from '../types/index.js';
import { MatchEvent, MarketExplanation } from '../models/index.js';
import { AIMatchContext, MatchContext } from '../prompts/shared.js';
import { buildPunditPrompt } from '../prompts/pundit.prompt.js';
import { buildMoodPrompt, MOOD_LABELS } from '../prompts/mood.prompt.js';
import { buildMarketPrompt } from '../prompts/market.prompt.js';
import { buildBeginnerPrompt } from '../prompts/beginner.prompt.js';
import { generateStructured, isAIAvailable, PunditOutput, MoodOutput, MarketOutput, BeginnerOutput } from './gemini.service.js';

export interface AIEventInput {
  matchId: string;
  eventType: EventType;
  eventId?: string;
  txlineEventId?: string;
  minute?: number;
  team?: string;
  description: string;
  score: { home: number; away: number };
  previousOdds?: { home: number; draw: number; away: number };
  newOdds?: { home: number; draw: number; away: number };
}

const HIGH_PRIORITY: EventType[] = ['goal', 'own_goal', 'penalty', 'red_card', 'fulltime'];
const MEDIUM_PRIORITY: EventType[] = ['penalty_missed', 'var', 'injury', 'halftime', 'yellow_card'];

export function isHighPriority(eventType: EventType): boolean {
  return HIGH_PRIORITY.includes(eventType);
}

export function isMeaningfulEvent(eventType: EventType): boolean {
  return HIGH_PRIORITY.includes(eventType) || MEDIUM_PRIORITY.includes(eventType) || eventType === 'kickoff';
}

function contextFromMatch(match: IMatch, extra: Partial<AIMatchContext> = {}): AIMatchContext {
  return {
    homeTeam: match.homeTeam,
    awayTeam: match.awayTeam,
    competition: match.competition,
    status: match.status,
    homeScore: match.homeScore,
    awayScore: match.awayScore,
    minute: match.minute,
    currentOdds: match.currentOdds,
    winProbability: match.winProbability,
    currentMood: match.currentMood,
    ...extra,
  };
}

async function recentEventDescriptions(matchId: string, limit = 8): Promise<string[]> {
  const recent = await MatchEvent.find({ matchId })
    .sort({ createdAt: -1 })
    .limit(limit)
    .lean();
  return recent
    .reverse()
    .map((e) => `${e.minute ? `${e.minute}' ` : ''}${e.description}`);
}

async function saveCommentary(input: AIEventInput, output: PunditOutput, generatedBy: 'gemini' | 'fallback' | 'template') {
  return Commentary.findOneAndUpdate(
    { matchId: input.matchId, txlineEventId: input.txlineEventId || `manual-${input.eventId}` },
    {
      matchId: input.matchId,
      eventId: input.eventId,
      txlineEventId: input.txlineEventId || `manual-${input.eventId}`,
      headline: output.headline,
      moment: output.moment,
      whatChanged: output.whatChanged,
      marketReaction: output.marketReaction,
      watchNext: output.watchNext,
      tone: output.tone,
      generatedBy,
    },
    { upsert: true, new: true }
  ).lean();
}

async function saveMood(input: AIEventInput, output: MoodOutput, generatedBy: 'gemini' | 'rule' | 'fallback') {
  return MatchMood.findOneAndUpdate(
    { matchId: input.matchId, minute: input.minute },
    {
      matchId: input.matchId,
      minute: input.minute,
      mood: output.mood,
      confidence: output.confidence,
      reason: output.reason,
      generatedBy,
    },
    { upsert: true, new: true }
  ).lean();
}

function eventToMood(eventType: EventType): string | null {
  switch (eventType) {
    case 'goal':
    case 'own_goal':
      return 'Momentum Shift';
    case 'red_card':
      return 'High Pressure';
    case 'penalty':
      return 'High Pressure';
    case 'halftime':
      return 'Balanced Contest';
    case 'fulltime':
      return 'Game Settled';
    default:
      return null;
  }
}

function moodConfidenceFromEvent(eventType: EventType): 'high' | 'medium' | 'low' {
  if (eventType === 'goal' || eventType === 'red_card' || eventType === 'own_goal') return 'high';
  if (eventType === 'penalty' || eventType === 'fulltime' || eventType === 'halftime') return 'medium';
  return 'low';
}

export async function generateMoodForEvent(
  input: AIEventInput,
  match: IMatch
): Promise<MoodOutput> {
  const previousEvents = await recentEventDescriptions(input.matchId);
  const context = contextFromMatch(match, {
    eventType: input.eventType,
    eventDescription: input.description,
    eventTeam: input.team,
    previousEvents,
  });

  if (isAIAvailable()) {
    try {
      const prompt = buildMoodPrompt(context);
      const output = await generateStructured<MoodOutput>('mood', prompt, 300);
      await saveMood(input, output, 'gemini');
      match.currentMood = output.mood;
      await match.save();
      return output;
    } catch (error) {
      console.error('Mood generation failed, using fallback:', error);
    }
  }

  const mood = eventToMood(input.eventType) || match.currentMood || 'Balanced Contest';
  const fallback: MoodOutput = {
    mood,
    reason: fallbackMoodReason(input),
    confidence: moodConfidenceFromEvent(input.eventType),
  };
  await saveMood(input, fallback, 'rule');
  match.currentMood = mood;
  await match.save();
  return fallback;
}

function fallbackMoodReason(input: AIEventInput): string {
  switch (input.eventType) {
    case 'goal':
    case 'own_goal':
      return `A goal changes everything. ${input.team ?? 'A side'} have the momentum now.`;
    case 'red_card':
      return `${input.team ?? 'A side'} are down to ten men, shifting the balance of control.`;
    case 'penalty':
      return 'A penalty award raises the stakes and the tension.';
    case 'halftime':
      return 'The first half is done. Time to regroup.';
    case 'fulltime':
      return 'The final whistle brings the story to a close.';
    default:
      return 'The match continues to unfold.';
  }
}

export async function generatePunditForEvent(
  input: AIEventInput,
  match: IMatch
): Promise<PunditOutput> {
  const previousEvents = await recentEventDescriptions(input.matchId);
  const context = contextFromMatch(match, {
    eventType: input.eventType,
    eventDescription: input.description,
    eventTeam: input.team,
    previousEvents,
  });

  if (isAIAvailable()) {
    try {
      const prompt = buildPunditPrompt(context);
      const output = await generateStructured<PunditOutput>('pundit', prompt, 700);
      await saveCommentary(input, output, 'gemini');
      return output;
    } catch (error) {
      console.error('Pundit generation failed, using fallback:', error);
    }
  }

  const fallback = fallbackPundit(input, match);
  await saveCommentary(input, fallback, 'template');
  return fallback;
}

function fallbackPundit(input: AIEventInput, match: IMatch): PunditOutput {
  const minute = input.minute !== undefined ? `${input.minute}'` : '';
  const leader = match.homeScore === match.awayScore
    ? 'Neither side'
    : match.homeScore > match.awayScore
      ? match.homeTeam
      : match.awayTeam;

  const opening: Record<string, string> = {
    goal: `${input.team ?? 'A side'} find the breakthrough${minute ? ` in the ${minute}` : ''}.`,
    own_goal: `An own goal shifts the scoreline${minute ? ` in the ${minute}` : ''}.`,
    penalty: `A penalty is awarded${minute ? ` in the ${minute}` : ''} — a huge moment.`,
    red_card: `${input.team ?? 'A side'} are reduced to ten men${minute ? ` in the ${minute}` : ''}.`,
    fulltime: 'The final whistle blows.',
    var: 'A VAR review changes the moment.',
    halftime: 'Half time arrives.',
    injury: `An injury concern for ${input.team ?? 'a side'}.`,
    yellow_card: `A yellow card for ${input.team ?? 'a side'}.`,
    penalty_missed: `The penalty is missed — a let-off for the opponents.`,
  };

  return {
    headline: opening[input.eventType] || 'A key moment in the match.',
    moment: opening[input.eventType] || `Something happens in the ${minute || 'match'}.`,
    whatChanged: `The score is now ${match.homeTeam} ${match.homeScore} - ${match.awayScore} ${match.awayTeam}. ${leader} hold the edge.`,
    marketReaction: 'With the latest twist, the market adjusts its view of who is more likely to win.',
    watchNext: 'Stay tuned — the next few minutes will show how the teams respond.',
    tone: input.eventType === 'goal' || input.eventType === 'red_card' ? 'dramatic' : 'calm',
  };
}

export async function generateMarketExplanation(
  input: AIEventInput,
  match: IMatch
): Promise<InstanceType<typeof MarketExplanation> | null> {
  if (!input.previousOdds || !input.newOdds) return null;

  const context = contextFromMatch(match, {
    eventType: input.eventType,
    eventDescription: input.description,
    eventTeam: input.team,
    previousOdds: input.previousOdds,
    currentOdds: input.newOdds,
  });

  let output: MarketOutput;
  let generatedBy: 'gemini' | 'template' = 'gemini';

  if (isAIAvailable()) {
    try {
      const prompt = buildMarketPrompt(context);
      output = await generateStructured<MarketOutput>('market', prompt, 400);
    } catch (error) {
      console.error('Market explanation failed, using fallback:', error);
      output = fallbackMarket(input);
      generatedBy = 'template';
    }
  } else {
    output = fallbackMarket(input);
    generatedBy = 'template';
  }

  return MarketExplanation.findOneAndUpdate(
    { matchId: input.matchId, txlineEventId: input.txlineEventId || `manual-${input.eventId}` },
    {
      matchId: input.matchId,
      eventId: input.eventId,
      txlineEventId: input.txlineEventId || `manual-${input.eventId}`,
      previousOdds: input.previousOdds,
      newOdds: input.newOdds,
      reason: output.reason,
      confidence: output.confidence,
      explanation: output.explanation,
      generatedBy,
    },
    { upsert: true, new: true }
  );
}

function fallbackMarket(input: AIEventInput): MarketOutput {
  const leader = input.score.home === input.score.away
    ? 'the sides are level'
    : input.score.home > input.score.away
      ? 'the home side lead'
      : 'the away side lead';
  return {
    reason: marketReasonLabel(input),
    explanation: `Because ${leader}, the market now sees that result as more likely. Odds simply reflect how likely each outcome is — lower odds mean more likely.`,
    confidence: 60,
  };
}

function marketReasonLabel(input: AIEventInput): string {
  switch (input.eventType) {
    case 'goal':
    case 'own_goal':
      return 'Goal changes outlook';
    case 'red_card':
      return 'Red card impact';
    case 'penalty':
      return 'Penalty awarded';
    case 'fulltime':
      return 'Match decided';
    default:
      return 'Odds movement';
  }
}

export async function generateBeginnerExplanation(match: IMatch): Promise<string> {
  const context = contextFromMatch(match);
  if (isAIAvailable()) {
    try {
      const prompt = buildBeginnerPrompt(context);
      const output = await generateStructured<BeginnerOutput>('beginner', prompt, 300);
      return output.explanation.slice(0, 800);
    } catch (error) {
      console.error('Beginner explanation failed, using fallback:', error);
    }
  }
  const minute = match.minute !== undefined ? `${match.minute} minutes` : 'the match';
  return `Two teams, ${match.homeTeam} and ${match.awayTeam}, are trying to score more goals than the other. Right now it is ${match.homeScore} to ${match.awayScore}, and about ${minute} have been played. The team with more goals is winning. Think of it like a race where scoring a goal is the only way to move ahead.`;
}

export function getMoodLabels(): string[] {
  return MOOD_LABELS;
}

export async function getLatestCommentary(matchId: string) {
  return Commentary.findOne({ matchId }).sort({ createdAt: -1 }).lean();
}
