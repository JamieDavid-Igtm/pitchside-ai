import { AIMatchContext, PUNDIT_PERSONALITY } from './shared.js';

export interface StoryEventSeed {
  minute?: number;
  eventType: string;
  team?: string;
  description: string;
}

export function buildStoryPrompt(
  context: AIMatchContext,
  events: StoryEventSeed[]
): { system: string; user: string } {
  const score = `${context.homeTeam} ${context.homeScore} - ${context.awayScore} ${context.awayTeam}`;
  const statusLabel =
    context.status === 'fulltime'
      ? 'Full time'
      : context.status === 'halftime'
        ? 'Half time'
        : context.status === 'live'
          ? 'In progress'
          : context.status;

  const system = `${PUNDIT_PERSONALITY}

You write the "Match Story" — a recap of a football match written like a journalist for a national newspaper, not a data dump.
Rules:
- 200-400 words total across all fields.
- "title": a memorable, story-driven headline (no score in the title unless natural).
- "summary": a 1-2 sentence hook that sets the scene.
- "beginning": how the match started and the early story.
- "turningPoint": the single moment that changed the match.
- "keyMoments": 3-5 short bullet fragments of the biggest moments (each under 12 words).
- "finalReflection": a thoughtful closing that captures what the result means.
- "story": the full flowing recap weaving the above together in 200-400 words.
- "hero": optional one named/described standout performer or team, or omit if none clear.
- Never mention being an AI. No betting jargon. Respect both teams.
Respond ONLY with strict JSON matching the required schema.`;

  const user = `Match: ${context.homeTeam} vs ${context.awayTeam}
Competition: ${context.competition}
Final score: ${score}
Status: ${statusLabel}
${context.winProbability ? `Win probability trend: ${context.homeTeam} ${context.winProbability.home}%, Draw ${context.winProbability.draw}%, ${context.awayTeam} ${context.winProbability.away}%` : ''}
${context.currentMood ? `Closing mood: ${context.currentMood}` : ''}

Key events (chronological):
${
  events.length > 0
    ? events.map((e) => `- ${e.minute ? `${e.minute}' ` : ''}${e.description}`).join('\n')
    : '- No notable events recorded.'
}

Write the full Match Story.`;

  return { system, user };
}

export interface StorylineChapterSeed {
  minute?: number;
  eventType: string;
  team?: string;
  title: string;
  headline: string;
  explanation: string;
  marketReaction: string;
  tacticalImplication: string;
  matchMood: string;
}

export function buildStorylinePrompt(
  context: AIMatchContext,
  chapters: StorylineChapterSeed[]
): { system: string; user: string } {
  const score = `${context.homeTeam} ${context.homeScore} - ${context.awayScore} ${context.awayTeam}`;
  const minute = context.minute !== undefined ? `${context.minute}'` : '';

  const system = `${PUNDIT_PERSONALITY}

You prepare the "Storyline Timeline" of a football match: the running narrative of its biggest moments.
For the latest event, produce a chapter with an emotional headline and a short explanation.
Rules:
- The "emotionalHeadline" must feel like a story chapter title, not "Goal Scored".
- "explanation" is 1-2 sentences of plain-language football storytelling.
- "marketReaction" is one sentence on why the market moved (no jargon).
- "tacticalImplication" is one sentence on what changes tactically.
- "matchMood" is the current mood in at most six words.
Respond ONLY with strict JSON matching the required schema.`;

  const user = `Match: ${context.homeTeam} vs ${context.awayTeam}
Score: ${score}
Minute: ${minute}
Status: ${context.status}
${context.eventDescription ?? ''}
${context.winProbability ? `Win probability: ${context.homeTeam} ${context.winProbability.home}%, Draw ${context.winProbability.draw}%, ${context.awayTeam} ${context.winProbability.away}%` : ''}

Existing storyline chapters (oldest first):
${
  chapters.length > 0
    ? chapters.map((c) => `- ${c.minute ?? '?'}': ${c.eventType} — ${c.title}`).join('\n')
    : '- No chapters yet.'
}

Write the chapter for the latest event.`;

  return { system, user };
}

export function buildWhatYouMissedPrompt(
  context: AIMatchContext,
  summary: {
    goals: string[];
    cards: string[];
    momentumShifts: string[];
    biggestMarketMovement?: string;
  }
): { system: string; user: string } {
  const score = `${context.homeTeam} ${context.homeScore} - ${context.awayScore} ${context.awayTeam}`;
  const minute = context.minute !== undefined ? `${context.minute}'` : '';

  const system = `${PUNDIT_PERSONALITY}

You write a concise "What You Missed" recap for a fan who just joined the match late.
Rules:
- Plain language, friendly, brief.
- Cover goals, cards, momentum shifts, the biggest market movement, and the current state.
- Do not encourage betting.
Respond ONLY with strict JSON matching the required schema.`;

  const user = `Match: ${context.homeTeam} vs ${context.awayTeam}
Current score: ${score}
Current minute: ${minute}
Status: ${context.status}

Goals:
${summary.goals.length ? summary.goals.map((g) => `- ${g}`).join('\n') : '- None yet.'}
Cards:
${summary.cards.length ? summary.cards.map((c) => `- ${c}`).join('\n') : '- None yet.'}
Momentum shifts:
${summary.momentumShifts.length ? summary.momentumShifts.map((m) => `- ${m}`).join('\n') : '- None yet.'}
Biggest market movement: ${summary.biggestMarketMovement ?? 'None significant.'}

Write a short recap a late-arriving fan would understand.`;

  return { system, user };
}
