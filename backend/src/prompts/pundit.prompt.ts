import { AIMatchContext, PUNDIT_PERSONALITY, STRUCTURE_RULES } from './shared.js';

export function buildPunditPrompt(context: AIMatchContext): { system: string; user: string } {
  const score = `${context.homeTeam} ${context.homeScore} - ${context.awayScore} ${context.awayTeam}`;
  const minute = context.minute !== undefined ? `${context.minute}'` : 'pre-match';
  const recentEvents = context.previousEvents && context.previousEvents.length > 0
    ? context.previousEvents.slice(-6).join('\n- ')
    : 'No previous major events.';

  const oddsBlock = context.currentOdds
    ? `Current odds (home / draw / away): ${context.currentOdds.home} / ${context.currentOdds.draw} / ${context.currentOdds.away}`
    : 'Odds not available.';
  const prevOddsBlock = context.previousOdds
    ? `Previous odds (home / draw / away): ${context.previousOdds.home} / ${context.previousOdds.draw} / ${context.previousOdds.away}`
    : 'Previous odds not available.';
  const winProbBlock = context.winProbability
    ? `Win probability: ${context.homeTeam} ${context.winProbability.home}%, Draw ${context.winProbability.draw}%, ${context.awayTeam} ${context.winProbability.away}%`
    : 'Win probability not available.';
  const moodBlock = context.currentMood ? `Current match mood: ${context.currentMood}` : '';

  const system = `${PUNDIT_PERSONALITY}\n\n${STRUCTURE_RULES}\n\nRespond ONLY with strict JSON matching the required schema. Keep each section between 1 and 3 short sentences. Total roughly 100-180 words.`;

  const user = `Match: ${context.homeTeam} vs ${context.awayTeam}
Competition: ${context.competition}
Score: ${score}
Minute: ${minute}
Status: ${context.status}
${moodBlock}

Event: ${context.eventType ?? 'match update'}
${context.eventTeam ? `Involved team: ${context.eventTeam}\n` : ''}${context.eventDescription ?? ''}

${oddsBlock}
${prevOddsBlock}
${winProbBlock}

Recent significant events:
- ${recentEvents}

Write the Pundit's Take for this event following the required structure.`;

  return { system, user };
}
