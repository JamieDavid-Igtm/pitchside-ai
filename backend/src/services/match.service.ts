import { Match, MatchEvent, IMatch, IMatchEvent } from '../models/index.js';
import { txlineClient } from '../services/txline.service.js';
import { processMatchEventWithAI } from '../services/ai-pipeline.service.js';
import { dispatchEventNotification, dispatchFullTimeStoryNotification } from './notification.service.js';
import { generateMatchStory } from './story.service.js';
import { MatchStatus, EventType } from '../types/index.js';
import mongoose from 'mongoose';

function isDatabaseConnected(): boolean {
  return mongoose.connection.readyState === 1;
}

function mapGameStateToStatusLocal(gameState: number | string | undefined): MatchStatus {
  if (gameState === undefined) return 'scheduled';
  const key = typeof gameState === 'string' ? Number(gameState) : gameState;
  const map: Record<number, MatchStatus> = {
    1: 'scheduled', 2: 'live', 3: 'halftime', 4: 'live', 5: 'fulltime',
    6: 'cancelled', 7: 'live', 8: 'halftime', 9: 'live', 10: 'fulltime',
    11: 'live', 12: 'live', 13: 'fulltime', 14: 'live', 15: 'cancelled',
    16: 'cancelled', 17: 'cancelled', 18: 'scheduled', 19: 'postponed',
  };
  return map[key] || 'scheduled';
}

// In-progress actions that prove a match is actually being played (TxLINE's
// `GameState` field is unreliable and often stuck on "scheduled" even while live).
const LIVE_ACTION_TYPES = new Set([
  'kickoff', 'goal', 'own_goal', 'penalty_scored', 'penalty_missed', 'penalty',
  'yellow_card', 'red_card', 'second_yellow_card', 'substitution', 'injury', 'var',
  'shot', 'corner', 'free_kick', 'throw_in', 'goal_kick', 'possible',
  'possession', 'safe_possession', 'danger_possession', 'high_danger_possession',
  'attack_possession', 'comment', 'clock_adjustment',
]);

const END_ACTION_TYPES = new Set(['fulltime', 'game_finalised', 'halftime']);

// Derive the match status from the live action stream. This avoids relying on
// TxLINE's broken/unreliable `GameState` field. It never regresses a match that
// is already live/fulltime back to scheduled.
function deriveStatusFromActions(
  actionTypes: string[],
  currentStatus: MatchStatus,
  gameState?: number | string
): MatchStatus {
  const hasEnd = actionTypes.some((t) => END_ACTION_TYPES.has(t));
  const hasLive = actionTypes.some((t) => LIVE_ACTION_TYPES.has(t));

  if (currentStatus === 'fulltime' || currentStatus === 'cancelled' || currentStatus === 'postponed') {
    // Only allow a real gameState downgrade for cancellations; otherwise keep terminal state.
    if (hasEnd && (actionTypes.includes('fulltime') || actionTypes.includes('game_finalised'))) {
      return 'fulltime';
    }
    return currentStatus;
  }

  if (hasEnd) {
    if (actionTypes.includes('fulltime') || actionTypes.includes('game_finalised')) return 'fulltime';
    if (actionTypes.includes('halftime')) return 'halftime';
  }

  if (hasLive) return 'live';

  // Fallback to gameState mapping, but never force a live match back to scheduled.
  const fromState = mapGameStateToStatusLocal(gameState);
  if (currentStatus === 'live' && fromState === 'scheduled') return 'live';
  return fromState;
}

function getEventType(actionType: string): EventType | null {
  const mapping: Record<string, EventType> = {
    goal: 'goal',
    own_goal: 'own_goal',
    penalty_scored: 'penalty',
    penalty_missed: 'penalty_missed',
    yellow_card: 'yellow_card',
    red_card: 'red_card',
    second_yellow_card: 'red_card',
    substitution: 'substitution',
    injury: 'injury',
    var: 'var',
    kickoff: 'kickoff',
    halftime: 'halftime',
    fulltime: 'fulltime',
    game_finalised: 'fulltime',
  };
  return mapping[actionType] || null;
}

function getMoodFromMomentum(momentum: number): string {
  if (momentum >= 80) return 'Taking Control';
  if (momentum >= 60) return 'Momentum Shift';
  if (momentum >= 40) return 'Balanced Contest';
  if (momentum >= 20) return 'High Pressure';
  return 'Defensive Battle';
}

export async function syncFixtures(
  io: { to: (room: string) => { emit: (event: string, data: unknown) => void } }
) {
  if (!isDatabaseConnected()) {
    console.warn('Skipping fixture sync: database not connected');
    return [];
  }

  const fixtures = await txlineClient.getFixtures();
  const results: (ReturnType<typeof Match.findOneAndUpdate> extends Promise<infer R> ? R : never)[] = [];

  for (const fixture of fixtures) {
    if (!fixture.Participant1 || !fixture.Participant2) {
      console.warn('Skipping fixture with missing participants:', fixture.FixtureId);
      continue;
    }
    const homeTeam = fixture.Participant1IsHome ? fixture.Participant1 : fixture.Participant2;
    const awayTeam = fixture.Participant1IsHome ? fixture.Participant2 : fixture.Participant1;
    const seedStatus = mapGameStateToStatusLocal(fixture.GameState);

    try {
      const existing = await Match.findOne({ txlineMatchId: String(fixture.FixtureId) }).lean();
      // TxLINE's GameState is unreliable (often stuck on "scheduled" while live),
      // so never downgrade an in-progress/finished match back to scheduled on re-sync.
      const status =
        existing && existing.status !== 'scheduled' ? existing.status : seedStatus;

      const match = await Match.findOneAndUpdate(
        { txlineMatchId: String(fixture.FixtureId) },
        {
          txlineMatchId: String(fixture.FixtureId),
          competition: fixture.Competition || 'Unknown Competition',
          status,
          kickoffTime: new Date(fixture.StartTime),
          homeTeam: homeTeam || 'Unknown',
          awayTeam: awayTeam || 'Unknown',
          participant1IsHome: Boolean(fixture.Participant1IsHome),
          homeScore: 0,
          awayScore: 0,
          updatedAt: new Date(),
        },
        { upsert: true, new: true }
      );

      results.push(match);
      io.to(`match:${match._id.toString()}`).emit('match:update', match.toObject());
    } catch (error) {
      console.error(`Failed to sync fixture ${fixture.FixtureId}:`, error);
    }
  }

  return results;
}

export async function processScoreUpdate(
  update: { fixtureId: number; gameState: number; stats?: Record<number, number>; actions?: Array<{ type: string; minute?: number; participant?: number; data?: Record<string, unknown> }> },
  io: { to: (room: string) => { emit: (event: string, data: unknown) => void } }
) {
  if (!isDatabaseConnected()) {
    console.warn('Skipping score update processing: database not connected');
    return null;
  }

  const fixtureId = String(update.fixtureId);
  const match = await Match.findOne({ txlineMatchId: fixtureId });
  if (!match) return null;

  let homeScore = match.homeScore;
  let awayScore = match.awayScore;
  let minute = match.minute;

  if (update.stats) {
    const p1Goals = update.stats[1] || 0;
    const p2Goals = update.stats[2] || 0;
    const p1IsHome = match.participant1IsHome ?? true;
    homeScore = p1IsHome ? p1Goals : p2Goals;
    awayScore = p1IsHome ? p2Goals : p1Goals;
  }

  const events: Array<{ type: string; minute?: number; participant?: number; data?: Record<string, unknown> }> = [];
  const allActionTypes: string[] = [];
  if (update.actions) {
    for (const action of update.actions) {
      allActionTypes.push(action.type);
      const eventType = getEventType(action.type);
      if (eventType) {
        minute = action.minute || minute;
        events.push(action);
      }
    }
  }

  match.homeScore = homeScore;
  match.awayScore = awayScore;
  match.minute = minute;
  match.status = deriveStatusFromActions(allActionTypes, match.status, update.gameState);

  if (match.momentum !== undefined) {
    match.currentMood = getMoodFromMomentum(match.momentum);
  }
  match.lastEvent = events[events.length - 1]?.type || match.lastEvent;
  await match.save();

  for (const action of events) {
    const eventType = getEventType(action.type);
    if (!eventType) continue;

    const eventId = `${fixtureId}-${action.type}-${action.minute || 0}-${action.participant || 0}`;
    const team = action.participant === 1 ? match.homeTeam : match.awayTeam;
    const description = getEventDescription(eventType, { minute: action.minute, participant: action.participant }, match);

    try {
      const eventDoc = await MatchEvent.findOneAndUpdate(
        { txlineEventId: eventId },
        {
          txlineEventId: eventId,
          matchId: match._id.toString(),
          minute: action.minute,
          eventType,
          team,
          description,
          rawPayload: action.data || {},
          processed: false,
        },
        { upsert: true, new: true }
      );

      io.to(`match:${match._id.toString()}`).emit('match:event', {
        eventId: eventDoc._id.toString(),
        eventType,
        minute: action.minute,
        team,
        description,
        rawPayload: action.data || {},
      });

      if (match._id) {
        const matchId = match._id.toString();
        processMatchEventWithAI(matchId, eventDoc, io).catch((err) =>
          console.error('AI pipeline failed for event', eventDoc._id, err)
        );
        dispatchEventNotification(matchId, eventDoc).catch((err) =>
          console.error('Notification dispatch failed for event', eventDoc._id, err)
        );
      }
    } catch (error) {
      console.error(`Failed to process event ${eventId}:`, error);
    }
  }

  const reachedFullTime = match.status === 'fulltime' && !match.storyGenerated;
  io.to(`match:${match._id.toString()}`).emit('match:update', match.toObject());

  if (reachedFullTime && match._id) {
    handleFullTime(match._id.toString(), io).catch((err) =>
      console.error('Full-time handling failed for', match._id, err)
    );
  }
  return match;
}

async function handleFullTime(matchId: string, io: MatchBroadcaster) {
  const story = await generateMatchStory(matchId);
  if (!story) return;
  io.to(`match:${matchId}`).emit('match:story', { matchId, story });
  dispatchFullTimeStoryNotification(matchId, `story-${matchId}`, story.title).catch((err) =>
    console.error('Full-time story notification failed', err)
  );
}

type MatchBroadcaster = { to: (room: string) => { emit: (event: string, data: unknown) => void } };

export async function getLiveMatches() {
  if (!isDatabaseConnected()) return [];
  return Match.find({ status: 'live' }).sort({ updatedAt: -1 }).lean();
}

export async function getUpcomingMatches() {
  if (!isDatabaseConnected()) return [];
  return Match.find({ status: 'scheduled' }).sort({ kickoffTime: 1 }).lean();
}

export async function getCompletedMatches() {
  if (!isDatabaseConnected()) return [];
  return Match.find({ status: 'fulltime' }).sort({ updatedAt: -1 }).limit(50).lean();
}

export async function getMatchById(matchId: string) {
  if (!isDatabaseConnected()) return null;
  const match = await Match.findById(matchId).lean();
  if (!match) return null;

  const events = await MatchEvent.find({ matchId }).sort({ createdAt: -1 }).limit(50).lean();
  return { ...match, events } as { events: unknown[] };
}

export async function getMatchTimeline(matchId: string) {
  if (!isDatabaseConnected()) return [];
  return MatchEvent.find({ matchId }).sort({ createdAt: -1 }).lean();
}

function getEventDescription(
  eventType: EventType,
  data: Record<string, unknown>,
  match: { homeTeam: string; awayTeam: string }
): string {
  const minute = data.minute || '';
  const team = data.participant === 1 ? match.homeTeam : match.awayTeam;
  const descriptions: Record<EventType, string> = {
    goal: `${team} scores${minute ? ` in the ${minute}'` : ''}!`,
    own_goal: `Own goal by ${team}${minute ? ` in the ${minute}'` : ''}.`,
    penalty: `Penalty awarded to ${team}${minute ? ` in the ${minute}'` : ''}.`,
    penalty_missed: `${team} misses the penalty${minute ? ` in the ${minute}'` : ''}.`,
    yellow_card: `Yellow card shown to ${team}${minute ? ` in the ${minute}'` : ''}.`,
    red_card: `Red card shown to ${team}${minute ? ` in the ${minute}'` : ''}.`,
    substitution: `Substitution for ${team}${minute ? ` in the ${minute}'` : ''}.`,
    injury: `Injury reported for ${team}${minute ? ` in the ${minute}'` : ''}.`,
    var: `VAR review for ${team}${minute ? ` in the ${minute}'` : ''}.`,
    kickoff: 'Match kicked off.',
    halftime: 'Half time.',
    fulltime: 'Full time.',
    odds_shift: 'Odds movement detected.',
  };
  return descriptions[eventType] || 'Match event occurred.';
}
