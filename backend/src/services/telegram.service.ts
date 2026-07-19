import { User, NotificationLog, Match, IUser } from '../models/index.js';
import { config } from '../config/env.js';
import TelegramBot from 'node-telegram-bot-api';
import crypto from 'crypto';

let bot: TelegramBot | null = null;

export function getTelegramBot(): TelegramBot | null {
  if (!config.telegramBotToken) return null;
  if (!bot) {
    bot = new TelegramBot(config.telegramBotToken, { polling: false });
  }
  return bot;
}

export const TELEGRAM_LINK_TTL_MS = 10 * 60 * 1000;

export function generateLinkCode(): string {
  return crypto.randomBytes(5).toString('hex').toUpperCase();
}

export async function startTelegramLink(walletAddress: string): Promise<{ linkCode: string; expiresAt: Date }> {
  const linkCode = generateLinkCode();
  const expiresAt = new Date(Date.now() + TELEGRAM_LINK_TTL_MS);
  await User.findOneAndUpdate(
    { walletAddress },
    { telegramLinkCode: linkCode, telegramLinkCodeExpiresAt: expiresAt },
    { upsert: true, new: true }
  );
  return { linkCode, expiresAt };
}

export async function consumeTelegramLink(linkCode: string, chatId: string): Promise<IUser | null> {
  const user = await User.findOne({
    telegramLinkCode: linkCode,
    telegramLinkCodeExpiresAt: { $gt: new Date() },
  });
  if (!user) return null;

  user.telegramChatId = chatId;
  user.telegramConnected = true;
  user.telegramLinkCode = undefined;
  user.telegramLinkCodeExpiresAt = undefined;
  await user.save();
  return user;
}

export function buildDeepLink(matchId: string): string {
  const base = config.frontendUrl.replace(/\/$/, '');
  return `${base}/match/${matchId}`;
}

export interface TelegramNotificationInput {
  match: InstanceType<typeof Match>;
  kind: 'goal' | 'red_card' | 'kickoff' | 'halftime' | 'fulltime' | 'penalty' | 'odds_movement' | 'match_story';
  headline: string;
  detail?: string;
  aiContext?: string;
  eventId: string;
}

function notificationText(input: TelegramNotificationInput): { text: string; parse: 'Markdown' } {
  const match = input.match;
  const score = `${match.homeTeam} ${match.homeScore} - ${match.awayScore} ${match.awayTeam}`;
  const minute = match.minute !== undefined ? `${match.minute}'` : '';

  const header = `*${input.headline}*\n${score}${minute ? ` · ${minute}` : ''}`;
  const body = input.detail ? `\n\n${input.detail}` : '';
  const ai = input.aiContext ? `\n\n_${input.aiContext}_` : '';

  return {
    text: `${header}${body}${ai}`,
    parse: 'Markdown',
  };
}

export async function alreadyNotified(
  user: IUser,
  matchId: string,
  kind: string,
  eventId: string
): Promise<boolean> {
  const existing = await NotificationLog.findOne({
    user: user._id.toString(),
    match: matchId,
    kind,
    event: eventId,
  });
  return Boolean(existing);
}

export async function sendTelegramNotification(
  user: IUser,
  input: TelegramNotificationInput
): Promise<boolean> {
  if (!user.telegramConnected || !user.telegramChatId) return false;
  if (!user.notificationsEnabled) return false;

  const dup = await alreadyNotified(user, input.match._id.toString(), input.kind, input.eventId);
  if (dup) return false;

  const log = await NotificationLog.create({
    user: user._id.toString(),
    match: input.match._id.toString(),
    event: input.eventId,
    channel: 'telegram',
    kind: input.kind,
    status: 'pending',
  });

  const botInstance = getTelegramBot();
  if (!botInstance) {
    log.status = 'failed';
    await log.save();
    return false;
  }

  const { text } = notificationText(input);
  const deepLink = buildDeepLink(input.match._id.toString());

  try {
    await botInstance.sendMessage(user.telegramChatId, text, {
      parse_mode: 'Markdown',
      reply_markup: {
        inline_keyboard: [
          [{ text: '⚽ Open Match', url: deepLink }],
        ],
      },
    });
    log.status = 'sent';
    log.sentAt = new Date();
    await log.save();
    return true;
  } catch (error) {
    console.error('Telegram send failed for user', user._id, error);
    log.status = 'failed';
    await log.save();
    return false;
  }
}

const KIND_PREF_MAP: Record<TelegramNotificationInput['kind'], keyof IUser['notificationPreferences']> = {
  goal: 'goals',
  red_card: 'redCards',
  penalty: 'penalties',
  kickoff: 'kickoff',
  halftime: 'halfTime',
  fulltime: 'fullTime',
  odds_movement: 'majorOdds',
  match_story: 'matchStory',
};

export function qualifiesForUser(
  user: IUser,
  kind: TelegramNotificationInput['kind']
): boolean {
  const prefKey = KIND_PREF_MAP[kind];
  return Boolean(user.notificationPreferences?.[prefKey]);
}

export async function notifyFollowersForEvent(
  matchId: string,
  kind: TelegramNotificationInput['kind'],
  input: Omit<TelegramNotificationInput, 'match' | 'kind'>
): Promise<void> {
  const match = await Match.findById(matchId);
  if (!match) return;

  const users = await User.find({
    telegramConnected: true,
    notificationsEnabled: true,
    favoriteTeams: { $in: [match.homeTeam, match.awayTeam] },
  });

  for (const user of users) {
    if (!qualifiesForUser(user, kind)) continue;
    sendTelegramNotification(user, { ...input, kind, match }).catch((err) =>
      console.error('notifyFollowers failed for', user._id, err)
    );
  }
}

export async function setupTelegramBot(): Promise<boolean> {
  const botInstance = getTelegramBot();
  if (!botInstance) {
    console.log('Telegram bot token not configured. Telegram notifications disabled.');
    return false;
  }

  botInstance.on('message', async (msg) => {
    try {
      const text = msg.text || '';
      if (text.startsWith('/start')) {
        await handleBotStart(msg.chat.id, text);
      } else if (text.startsWith('/help')) {
        await botInstance.sendMessage(
          msg.chat.id,
          '⚽ *PitchSide AI commands*\n/start — link your account\n/help — this message\n\nGoal, card, and full-time alerts are sent automatically for your favourite teams.'
        );
      }
    } catch (error) {
      console.error('Telegram message handling failed:', error);
    }
  });

  if (config.telegramWebhookUrl) {
    try {
      await botInstance.setWebHook(config.telegramWebhookUrl, {
        drop_pending_updates: true,
      });
      console.log(`Telegram webhook set to ${config.telegramWebhookUrl}`);
    } catch (error) {
      console.error('Failed to set Telegram webhook:', error);
    }
  } else {
    console.log('TELEGRAM_WEBHOOK_URL not set — Telegram updates will not be received.');
  }

  console.log('Telegram bot listening for /start messages.');
  return true;
}

export async function processTelegramUpdate(update: unknown): Promise<void> {
  const botInstance = getTelegramBot();
  if (!botInstance) return;
  try {
    await botInstance.processUpdate(update as Parameters<TelegramBot['processUpdate']>[0]);
  } catch (error) {
    console.error('Failed to process Telegram update:', error);
  }
}

export async function handleBotStart(chatId: number, text: string): Promise<void> {
  const botInstance = getTelegramBot();
  if (!botInstance) return;

  const parts = (text || '').split(' ');
  const linkCode = parts[1];
  if (linkCode) {
    const user = await consumeTelegramLink(linkCode, String(chatId));
    if (user) {
      await botInstance.sendMessage(
        chatId,
        `✅ Linked! You'll now get PitchSide AI alerts for your favourite teams.\n\nOpen the match here: ${config.frontendUrl.replace(/\/$/, '')}`
      );
      return;
    }
  }

  await botInstance.sendMessage(
    chatId,
    `⚽ *PitchSide AI*\n\nUnderstand every moment of the match.\n\nLink your account from the PitchSide AI settings page to get goal, card, and full-time alerts. Use /help for commands.`
  );
}
