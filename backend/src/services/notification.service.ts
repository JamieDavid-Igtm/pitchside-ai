import { Match, MatchEvent } from '../models/index.js';
import { Commentary } from '../models/index.js';
import { notifyFollowersForEvent } from './telegram.service.js';
import { EventType } from '../types/index.js';

export type NotificationKind =
  | 'goal'
  | 'red_card'
  | 'kickoff'
  | 'halftime'
  | 'fulltime'
  | 'penalty'
  | 'odds_movement'
  | 'match_story';

const EVENT_KIND_MAP: Partial<Record<EventType, NotificationKind>> = {
  goal: 'goal',
  own_goal: 'goal',
  penalty: 'penalty',
  red_card: 'red_card',
  kickoff: 'kickoff',
  halftime: 'halftime',
  fulltime: 'fulltime',
};

interface NotifyEventContext {
  headline: string;
  detail?: string;
  aiContext?: string;
}

function contextForEvent(
  event: InstanceType<typeof MatchEvent>,
  match: InstanceType<typeof Match>,
  commentary?: InstanceType<typeof Commentary> | null
): NotifyEventContext {
  const minute = event.minute !== undefined ? `${event.minute}'` : '';
  const team = event.team ? `${event.team} ` : '';

  const base: NotifyEventContext = {
    headline: '',
    detail: event.description,
  };

  switch (event.eventType) {
    case 'goal':
    case 'own_goal':
      base.headline = `⚽ Goal · ${match.homeTeam} ${match.homeScore}-${match.awayScore} ${match.awayTeam}`;
      break;
    case 'penalty':
      base.headline = `🎯 Penalty · ${team}${minute}`;
      break;
    case 'red_card':
      base.headline = `🟥 Red Card · ${team}${minute}`;
      break;
    case 'kickoff':
      base.headline = `🟢 Kickoff · ${match.homeTeam} vs ${match.awayTeam}`;
      break;
    case 'halftime':
      base.headline = `⏸ Half Time · ${match.homeTeam} ${match.homeScore}-${match.awayScore} ${match.awayTeam}`;
      break;
    case 'fulltime':
      base.headline = `🔚 Full Time · ${match.homeTeam} ${match.homeScore}-${match.awayScore} ${match.awayTeam}`;
      break;
    default:
      base.headline = `${team}${event.description}`;
  }

  if (commentary) {
    base.aiContext = commentary.moment || commentary.headline;
  }

  return base;
}

export async function dispatchEventNotification(
  matchId: string,
  event: InstanceType<typeof MatchEvent>
): Promise<void> {
  const kind = EVENT_KIND_MAP[event.eventType];
  if (!kind) return;

  const match = await Match.findById(matchId);
  if (!match) return;

  const commentary = event._id
    ? await Commentary.findOne({ eventId: event._id.toString() }).lean()
    : null;

  const ctx = contextForEvent(event, match, commentary as InstanceType<typeof Commentary> | null);

  await notifyFollowersForEvent(matchId, kind, {
    eventId: event.txlineEventId,
    headline: ctx.headline,
    detail: ctx.detail,
    aiContext: ctx.aiContext,
  });
}

export async function dispatchOddsMovementNotification(
  matchId: string,
  eventId: string,
  headline: string,
  explanation?: string
): Promise<void> {
  await notifyFollowersForEvent(matchId, 'odds_movement', {
    eventId,
    headline: `📈 Odds Move · ${headline}`,
    aiContext: explanation,
  });
}

export async function dispatchFullTimeStoryNotification(
  matchId: string,
  eventId: string,
  title: string
): Promise<void> {
  const match = await Match.findById(matchId);
  if (!match) return;
  await notifyFollowersForEvent(matchId, 'match_story', {
    eventId,
    headline: `📖 Match Story · ${title}`,
    detail: `${match.homeTeam} ${match.homeScore}-${match.awayScore} ${match.awayTeam}`,
  });
}
