import { Match, Commentary, MatchMood, MarketExplanation } from '../models/index.js';
import { MatchEvent } from '../models/index.js';
import { AIMatchContext } from '../prompts/shared.js';
import { buildStorylinePrompt, buildWhatYouMissedPrompt, StorylineChapterSeed } from '../prompts/story.prompt.js';
import { generateStructured, isAIAvailable, StorylineOutput, WhatYouMissedOutput } from './gemini.service.js';

export interface StorylineChapterView {
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

export async function buildStorylineChapters(matchId: string): Promise<StorylineChapterView[]> {
  const events = await MatchEvent.find({ matchId })
    .sort({ createdAt: 1 })
    .lean();

  const commentaries = await Commentary.find({ matchId }).sort({ createdAt: 1 }).lean();
  const moods = await MatchMood.find({ matchId }).sort({ createdAt: 1 }).lean();
  const markets = await MarketExplanation.find({ matchId }).sort({ createdAt: 1 }).lean();

  const commentaryByEvent = new Map(commentaries.map((c) => [c.eventId, c]));
  const moodByMinute = new Map(moods.map((m) => [`${m.minute ?? ''}`, m]));

  const chapters: StorylineChapterView[] = [];

  for (const event of events) {
    if (['goal', 'own_goal', 'penalty', 'red_card', 'penalty_missed', 'var'].includes(event.eventType)) {
      const commentary = commentaryByEvent.get(event._id.toString());
      const mood = moodByMinute.get(`${event.minute ?? ''}`);
      chapters.push({
        matchId,
        eventId: event._id.toString(),
        minute: event.minute,
        eventType: event.eventType,
        team: event.team,
        title: commentary?.headline || event.description,
        headline: commentary?.moment || event.description,
        explanation: commentary?.whatChanged || event.description,
        marketReaction: commentary?.marketReaction || 'The market adjusted its view of the match.',
        tacticalImplication: commentary?.watchNext || 'Watch how both teams respond.',
        matchMood: mood?.mood || 'Balanced Contest',
        createdAt: (event.createdAt as Date).toISOString(),
      });
    }
  }

  return chapters;
}

export async function generateStorylineChapterForEvent(
  matchId: string,
  event: InstanceType<typeof MatchEvent>
): Promise<StorylineOutput | null> {
  const match = await Match.findById(matchId);
  if (!match) return null;

  const existing = await buildStorylineChapters(matchId);
  const seeds: StorylineChapterSeed[] = existing.map((c) => ({
    minute: c.minute,
    eventType: c.eventType,
    team: c.team,
    title: c.title,
    headline: c.headline,
    explanation: c.explanation,
    marketReaction: c.marketReaction,
    tacticalImplication: c.tacticalImplication,
    matchMood: c.matchMood,
  }));

  const context: AIMatchContext = {
    homeTeam: match.homeTeam,
    awayTeam: match.awayTeam,
    competition: match.competition,
    status: match.status,
    homeScore: match.homeScore,
    awayScore: match.awayScore,
    minute: event.minute,
    winProbability: match.winProbability,
    eventType: event.eventType,
    eventDescription: event.description,
    eventTeam: event.team,
  };

  if (!isAIAvailable()) return null;

  try {
    const prompt = buildStorylinePrompt(context, seeds);
    return await generateStructured<StorylineOutput>('storyline', prompt, 500);
  } catch (error) {
    console.error('Storyline chapter generation failed:', error);
    return null;
  }
}

export interface WhatYouMissedView {
  goals: string[];
  cards: string[];
  momentumShifts: string[];
  biggestMarketMovement?: string;
  currentState: string;
  summary: string;
}

export async function generateWhatYouMissed(matchId: string): Promise<WhatYouMissedView> {
  const match = await Match.findById(matchId);
  const events = await MatchEvent.find({ matchId }).sort({ createdAt: 1 }).lean();
  const markets = await MarketExplanation.find({ matchId }).sort({ createdAt: 1 }).lean();

  const goals = events
    .filter((e) => e.eventType === 'goal' || e.eventType === 'own_goal')
    .map((e) => `${e.minute ? `${e.minute}' ` : ''}${e.description}`);
  const cards = events
    .filter((e) => e.eventType === 'yellow_card' || e.eventType === 'red_card')
    .map((e) => `${e.minute ? `${e.minute}' ` : ''}${e.description}`);
  const momentumShifts = events
    .filter((e) => e.eventType === 'red_card' || e.eventType === 'penalty')
    .map((e) => `${e.minute ? `${e.minute}' ` : ''}${e.description}`);
  const biggestMarketMovement = markets.length
    ? `${markets[markets.length - 1].reason}: ${markets[markets.length - 1].explanation}`
    : undefined;

  const currentState = match
    ? `${match.homeTeam} ${match.homeScore} - ${match.awayScore} ${match.awayTeam}${match.minute !== undefined ? `, ${match.minute}'` : ''}`
    : 'Match state unknown.';

  let summary = `${currentState}. ${
    goals.length ? `${goals.length} goal(s) so far.` : 'No goals yet.'
  } ${cards.length ? `Cards shown: ${cards.length}.` : ''} ${match?.currentMood ? `Current mood: ${match.currentMood}.` : ''}`;

  if (isAIAvailable() && match) {
    try {
      const context: AIMatchContext = {
        homeTeam: match.homeTeam,
        awayTeam: match.awayTeam,
        competition: match.competition,
        status: match.status,
        homeScore: match.homeScore,
        awayScore: match.awayScore,
        minute: match.minute,
        winProbability: match.winProbability,
        currentMood: match.currentMood,
      };
      const prompt = buildWhatYouMissedPrompt(context, { goals, cards, momentumShifts, biggestMarketMovement });
      const output = await generateStructured<WhatYouMissedOutput>('whatYouMissed', prompt, 400);
      summary = output.summary.slice(0, 1000);
    } catch (error) {
      console.error('What You Missed generation failed, using template:', error);
    }
  }

  return {
    goals,
    cards,
    momentumShifts,
    biggestMarketMovement,
    currentState,
    summary,
  };
}
