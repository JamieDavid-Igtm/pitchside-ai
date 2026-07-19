import { AIMatchContext, PUNDIT_PERSONALITY } from './shared.js';

const MOOD_VALUES = [
  'Taking Control',
  'Momentum Shift',
  'Balanced Contest',
  'High Pressure',
  'Defensive Battle',
  'End-to-End Football',
  'Late Drama',
  'Game Settled',
];

export function buildMoodPrompt(context: AIMatchContext): { system: string; user: string } {
  const score = `${context.homeTeam} ${context.homeScore} - ${context.awayScore} ${context.awayTeam}`;
  const minute = context.minute !== undefined ? `${context.minute}'` : 'pre-match';
  const recentEvents = context.previousEvents && context.previousEvents.length > 0
    ? context.previousEvents.slice(-5).join('\n- ')
    : 'No previous major events.';
  const winProbBlock = context.winProbability
    ? `Win probability: ${context.homeTeam} ${context.winProbability.home}%, Draw ${context.winProbability.draw}%, ${context.awayTeam} ${context.winProbability.away}%`
    : '';
  const moodBlock = context.currentMood ? `Previous mood: ${context.currentMood}` : '';

  const system = `${PUNDIT_PERSONALITY}

You summarise the emotional state of a football match in a single short label and a one-sentence reason.
Allowed mood labels (choose the single best fit):
${MOOD_VALUES.map((m) => `- ${m}`).join('\n')}
Respond ONLY with strict JSON matching the required schema. The mood label must be one of the allowed values.
The mood must be a maximum of six words. The reason must be a single clear sentence.`;

  const user = `Match: ${context.homeTeam} vs ${context.awayTeam}
Score: ${score}
Minute: ${minute}
${moodBlock}
${winProbBlock}
Recent significant events:
- ${recentEvents}

What is the current emotional mood of this match?`;

  return { system, user };
}

export const MOOD_LABELS = MOOD_VALUES;
