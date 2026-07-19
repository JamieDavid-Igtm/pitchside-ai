import { Match, MatchEvent, MatchStory, IMatchStory } from '../models/index.js';
import { AIMatchContext } from '../prompts/shared.js';
import { buildStoryPrompt, StoryEventSeed } from '../prompts/story.prompt.js';
import { generateStructured, isAIAvailable, StoryOutput } from './gemini.service.js';

export interface MatchStoryView {
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
  generatedBy: 'gemini' | 'template';
  createdAt: string;
}

type LeanStory = {
  _id: { toString(): string };
  title: string;
  summary: string;
  beginning: string;
  turningPoint: string;
  keyMoments?: string[];
  finalReflection: string;
  story: string;
  hero?: string;
  generatedBy: 'gemini' | 'template';
  createdAt: Date;
};

export async function getMatchStory(matchId: string): Promise<MatchStoryView | null> {
  const story = await MatchStory.findOne({ match: matchId }).lean();
  if (!story) return null;
  return toView(matchId, story as unknown as LeanStory);
}

function toView(matchId: string, story: LeanStory): MatchStoryView {
  return {
    _id: story._id.toString(),
    matchId,
    title: story.title,
    summary: story.summary,
    beginning: story.beginning,
    turningPoint: story.turningPoint,
    keyMoments: story.keyMoments || [],
    finalReflection: story.finalReflection,
    story: story.story,
    hero: story.hero,
    generatedBy: story.generatedBy,
    createdAt: story.createdAt.toISOString(),
  };
}

async function storySeeds(matchId: string): Promise<StoryEventSeed[]> {
  const events = await MatchEvent.find({ matchId }).sort({ createdAt: 1 }).lean();
  return events.map((e) => ({
    minute: e.minute,
    eventType: e.eventType,
    team: e.team,
    description: e.description,
  }));
}

function fallbackStory(match: InstanceType<typeof Match>, seeds: StoryEventSeed[]): StoryOutput {
  const score = `${match.homeTeam} ${match.homeScore} - ${match.awayScore} ${match.awayTeam}`;
  const winner =
    match.homeScore === match.awayScore
      ? 'The two sides could not be separated'
      : match.homeScore > match.awayScore
        ? `${match.homeTeam} edged it`
        : `${match.awayTeam} took the points`;
  const timeline =
    seeds.length > 0
      ? seeds.map((s) => `${s.minute ? `${s.minute}' ` : ''}${s.description}`).join(' ')
      : 'The match produced few defining moments.';

  const beginning = `${match.homeTeam} and ${match.awayTeam} met in a ${match.competition} clash that promised tension from the first whistle. ${timeline}`;
  const turningPoint = seeds.length
    ? seeds[Math.floor(seeds.length / 2)].description
    : 'The rhythm of the match shifted in the middle period.';
  const keyMoments = seeds.slice(0, 5).map((s) => `${s.minute ? `${s.minute}' ` : ''}${s.description}`);
  const finalReflection = `When the final whistle blew, ${score}. ${winner}, and the result will be remembered for the way the game ebbed and flowed.`;

  return {
    title: `${match.homeTeam} vs ${match.awayTeam}: A Story of Fine Margins`,
    summary: `A ${match.competition} encounter that finished ${score}.`,
    beginning,
    turningPoint,
    keyMoments: keyMoments.length ? keyMoments : [timeline],
    finalReflection,
    story: `${beginning} The turning point came when ${turningPoint} ${finalReflection}`,
    hero: undefined,
  };
}

export async function generateMatchStory(matchId: string): Promise<MatchStoryView | null> {
  const match = await Match.findById(matchId);
  if (!match) return null;
  if (match.storyGenerated) {
    return getMatchStory(matchId);
  }

  const seeds = await storySeeds(matchId);
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

  let output: StoryOutput;
  let generatedBy: 'gemini' | 'template' = 'gemini';

  if (isAIAvailable()) {
    try {
      const prompt = buildStoryPrompt(context, seeds);
      output = await generateStructured<StoryOutput>('story', prompt, 900);
    } catch (error) {
      console.error('Match story generation failed, using fallback:', error);
      output = fallbackStory(match, seeds);
      generatedBy = 'template';
    }
  } else {
    output = fallbackStory(match, seeds);
    generatedBy = 'template';
  }

  const saved = await MatchStory.findOneAndUpdate(
    { match: matchId },
    {
      match: matchId,
      title: output.title,
      summary: output.summary,
      beginning: output.beginning,
      turningPoint: output.turningPoint,
      keyMoments: output.keyMoments,
      finalReflection: output.finalReflection,
      story: output.story,
      hero: output.hero,
      generatedBy,
    },
    { upsert: true, new: true }
  );

  match.storyGenerated = true;
  await match.save();

  return toView(matchId, saved as unknown as LeanStory);
}
