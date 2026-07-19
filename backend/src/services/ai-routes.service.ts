import { Commentary, MatchMood, MarketExplanation } from '../models/index.js';
import {
  generateBeginnerExplanation,
  getMoodLabels,
} from './ai.service.js';
import {
  buildStorylineChapters,
  generateWhatYouMissed,
  WhatYouMissedView,
  StorylineChapterView,
} from './ai-narrative.service.js';
import { AIMatchContext } from '../prompts/shared.js';
import { buildPunditPrompt } from '../prompts/pundit.prompt.js';
import { buildMoodPrompt } from '../prompts/mood.prompt.js';
import { buildMarketPrompt } from '../prompts/market.prompt.js';
import { buildBeginnerPrompt } from '../prompts/beginner.prompt.js';
import { generateStructured, isAIAvailable, PunditOutput, MoodOutput, MarketOutput, BeginnerOutput } from './gemini.service.js';

export async function getMatchCommentary(matchId: string) {
  return Commentary.find({ matchId }).sort({ createdAt: 1 }).lean();
}

export async function getMatchMoodHistory(matchId: string) {
  return MatchMood.find({ matchId }).sort({ createdAt: 1 }).lean();
}

export async function getMarketExplanations(matchId: string) {
  return MarketExplanation.find({ matchId }).sort({ createdAt: 1 }).lean();
}

export async function getStorylineChapters(matchId: string): Promise<StorylineChapterView[]> {
  return buildStorylineChapters(matchId);
}

export async function getBeginnerExplanation(matchId: string): Promise<string> {
  const { Match } = await import('../models/index.js');
  const match = await Match.findById(matchId);
  if (!match) return 'Match not found.';
  return generateBeginnerExplanation(match);
}

export async function getWhatYouMissed(matchId: string): Promise<WhatYouMissedView> {
  return generateWhatYouMissed(matchId);
}

export interface AITestResult {
  label: string;
  moodLabels: string[];
  context: AIMatchContext;
  pundit?: PunditOutput;
  mood?: MoodOutput;
  market?: MarketOutput;
  beginner?: string;
  generatedBy: 'gemini' | 'fallback' | 'unavailable';
  note: string;
}

const TEST_CONTEXT: AIMatchContext = {
  homeTeam: 'Argentina',
  awayTeam: 'Brazil',
  competition: 'FIFA World Cup - Group Stage',
  status: 'live',
  homeScore: 1,
  awayScore: 1,
  minute: 78,
  currentOdds: { home: 1.8, draw: 3.4, away: 4.5 },
  previousOdds: { home: 2.4, draw: 3.2, away: 3.1 },
  winProbability: { home: 58, draw: 24, away: 18 },
  currentMood: 'Momentum Shift',
  eventType: 'goal',
  eventDescription: 'Argentina score a late equaliser in the 78th minute.',
  eventTeam: 'Argentina',
  previousEvents: [
    "12' Brazil take the lead with a fine finish.",
    "45' Half time: Brazil 1 - 0 Argentina.",
    "67' Argentina level with a tap-in.",
  ],
};

export async function runAITestMode(): Promise<AITestResult> {
  const result: AITestResult = {
    label: 'Controlled AI test event (not live data)',
    moodLabels: getMoodLabels(),
    context: TEST_CONTEXT,
    generatedBy: isAIAvailable() ? 'gemini' : 'unavailable',
    note: isAIAvailable()
      ? 'Generated from a controlled test context using the live Gemini pipeline.'
      : 'Gemini key not configured. Returning template-based fallback output for preview only — this is NOT live match data.',
  };

  if (isAIAvailable()) {
    try {
      result.pundit = await generateStructured<PunditOutput>('pundit', buildPunditPrompt(TEST_CONTEXT));
    } catch (error) {
      console.error('Test pundit failed:', error);
    }
    try {
      result.mood = await generateStructured<MoodOutput>('mood', buildMoodPrompt(TEST_CONTEXT));
    } catch (error) {
      console.error('Test mood failed:', error);
    }
    try {
      result.market = await generateStructured<MarketOutput>('market', buildMarketPrompt(TEST_CONTEXT));
    } catch (error) {
      console.error('Test market failed:', error);
    }
    try {
      const beginner = await generateStructured<BeginnerOutput>('beginner', buildBeginnerPrompt(TEST_CONTEXT));
      result.beginner = beginner.explanation;
    } catch (error) {
      console.error('Test beginner failed:', error);
    }
  } else {
    result.pundit = {
      headline: 'Argentina strike back late.',
      moment: 'With twelve minutes left, Argentina finally find their equaliser.',
      whatChanged: 'The score is level at 1-1 and the atmosphere has changed completely.',
      marketReaction: 'Argentina are now clear favourites because there is little time left for Brazil to respond.',
      watchNext: 'Watch for Argentina pushing for a winner while Brazil look to hit on the break.',
      tone: 'exciting',
    };
    result.mood = { mood: 'Late Drama', reason: 'A late equaliser has the match finely balanced.', confidence: 'high' };
    result.market = {
      reason: 'Late equaliser',
      explanation: 'Because the scores are level late on, the market favours the side with the momentum. Odds just show how likely each result is.',
      confidence: 70,
    };
    result.beginner = 'Two teams are tied 1-1 near the end. Whoever scores next likely wins, so every attack matters.';
  }

  return result;
}
