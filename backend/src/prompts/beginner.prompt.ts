import { AIMatchContext, PUNDIT_PERSONALITY } from './shared.js';

export function buildBeginnerPrompt(context: AIMatchContext): { system: string; user: string } {
  const score = `${context.homeTeam} ${context.homeScore} - ${context.awayScore} ${context.awayTeam}`;
  const minute = context.minute !== undefined ? `${context.minute}'` : '';

  const system = `${PUNDIT_PERSONALITY}

You explain the current football situation to a complete beginner who has never watched the sport.
Rules:
- Maximum 120 words.
- Assume zero prior football knowledge.
- Use simple comparisons (e.g. "like a countdown timer").
- Explain the score, how much time is left, and what matters right now.
- Never use jargon without explaining it immediately.
- Do not mention betting or odds.
Respond ONLY with strict JSON matching the required schema. "explanation" is a single plain-language paragraph, max 120 words.`;

  const user = `Match: ${context.homeTeam} vs ${context.awayTeam}
Score: ${score}
Minute: ${minute}
Status: ${context.status}
${context.eventDescription ? `Latest event: ${context.eventDescription}` : ''}

Explain what is happening in this match right now, as if talking to someone who has never watched football.`;

  return { system, user };
}
