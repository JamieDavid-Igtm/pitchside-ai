import { Match } from '../models/index.js';
import { MatchEvent } from '../models/index.js';
import {
  generatePunditForEvent,
  generateMoodForEvent,
  generateMarketExplanation,
  isMeaningfulEvent,
} from './ai.service.js';
import { AIEventInput } from './ai.service.js';
import { OddsShiftInput } from './odds.service.js';

type MatchBroadcaster = { to: (room: string) => { emit: (event: string, data: unknown) => void } };

function emitMatchData(io: MatchBroadcaster, matchId: string) {
  return {
    to: (room: string) => ({
      emit: (event: string, data: unknown) => io.to(room).emit(event, data),
    }),
  };
}

export interface PipelineResult {
  commentary?: unknown;
  mood?: unknown;
  market?: unknown;
}

export async function processMatchEventWithAI(
  matchId: string,
  event: InstanceType<typeof MatchEvent>,
  io: MatchBroadcaster
): Promise<void> {
  const match = await Match.findById(matchId);
  if (!match) return;

  if (!isMeaningfulEvent(event.eventType)) {
    return;
  }

  const baseInput: AIEventInput = {
    matchId,
    eventType: event.eventType,
    eventId: event._id.toString(),
    txlineEventId: event.txlineEventId,
    minute: event.minute,
    team: event.team,
    description: event.description,
    score: { home: match.homeScore, away: match.awayScore },
  };

  const broadcaster = emitMatchData(io, matchId);

  try {
    const [commentary, mood] = await Promise.all([
      generatePunditForEvent(baseInput, match),
      generateMoodForEvent(baseInput, match),
    ]);

    const updatedMatch = await Match.findById(matchId).lean();
    broadcaster.to(`match:${matchId}`).emit('commentary:new', {
      matchId,
      eventId: event._id.toString(),
      commentary,
    });
    broadcaster.to(`match:${matchId}`).emit('mood:update', {
      matchId,
      mood,
      currentMood: updatedMatch?.currentMood,
    });
    broadcaster.to(`match:${matchId}`).emit('match:update', updatedMatch);

    if (event.eventType === 'goal' || event.eventType === 'own_goal' || event.eventType === 'red_card') {
      broadcaster.to(`match:${matchId}`).emit('storyline:chapter', {
        matchId,
        eventId: event._id.toString(),
        minute: event.minute,
        eventType: event.eventType,
        team: event.team,
        title: commentary.headline,
        headline: commentary.moment,
        explanation: commentary.whatChanged,
        marketReaction: commentary.marketReaction,
        tacticalImplication: commentary.watchNext,
        matchMood: mood.mood,
      });
    }
  } catch (error) {
    console.error('AI pipeline error for event', event._id, error);
  }
}

export async function processOddsShiftWithAI(
  matchId: string,
  shift: OddsShiftInput,
  io: MatchBroadcaster
): Promise<void> {
  const match = await Match.findById(matchId);
  if (!match) return;

  try {
    const market = await generateMarketExplanation(
      {
        matchId,
        eventType: 'odds_shift',
        description: 'Odds movement detected.',
        score: { home: match.homeScore, away: match.awayScore },
        previousOdds: shift.previousOdds,
        newOdds: shift.newOdds,
      },
      match
    );

    if (market) {
      emitMatchData(io, matchId).to(`match:${matchId}`).emit('market:update', {
        matchId,
        market,
      });
    }
  } catch (error) {
    console.error('Odds shift AI error', error);
  }
}
