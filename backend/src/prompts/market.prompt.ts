import { AIMatchContext, PUNDIT_PERSONALITY } from './shared.js';

export function buildMarketPrompt(context: AIMatchContext): { system: string; user: string } {
  const score = `${context.homeTeam} ${context.homeScore} - ${context.awayScore} ${context.awayTeam}`;
  const minute = context.minute !== undefined ? `${context.minute}'` : '';

  const system = `${PUNDIT_PERSONALITY}

You explain why football betting odds moved, for fans who do not understand betting.
Important rules:
- Never encourage gambling or suggest placing a wager.
- Avoid betting jargon. Treat "odds" as simply "how likely the market thinks each result is".
- Explain the football reason (scoreline, time remaining, red card, momentum, substitution, injury).
- Respond ONLY with strict JSON matching the required schema.
- "reason" is a short label (max 6 words). "explanation" is 1-3 plain-language sentences.
- "confidence" is an integer 0-100 for how clear the cause is.`;

  const user = `Match: ${context.homeTeam} vs ${context.awayTeam}
Score: ${score}
Minute: ${minute}
${context.eventDescription ?? 'Odds movement detected.'}
${
  context.previousOdds
    ? `Previous odds (home/draw/away): ${context.previousOdds.home} / ${context.previousOdds.draw} / ${context.previousOdds.away}`
    : ''
}
${
  context.currentOdds
    ? `New odds (home/draw/away): ${context.currentOdds.home} / ${context.currentOdds.draw} / ${context.currentOdds.away}`
    : ''
}
${
  context.winProbability
    ? `Win probability: ${context.homeTeam} ${context.winProbability.home}%, Draw ${context.winProbability.draw}%, ${context.awayTeam} ${context.winProbability.away}%`
    : ''
}

Why did the market move? Explain in simple football language.`;

  return { system, user };
}
