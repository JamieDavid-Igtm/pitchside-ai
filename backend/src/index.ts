import express from 'express';
import http from 'http';
import { Server } from 'socket.io';
import mongoose from 'mongoose';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import 'dotenv/config';
import { config } from './config/env.js';
import { connectDatabase } from './config/database.js';
import { txlineClient, ensureAuthenticated } from './services/txline.service.js';
import { getLiveMatches, getUpcomingMatches, getCompletedMatches, getMatchById, getMatchTimeline, syncFixtures, refreshLiveMinutes, processScoreUpdate } from './services/match.service.js';
import { Match } from './models/index.js';

function txlineMatchId(fixtureId: number | string) {
  return String(fixtureId);
}
import { processOddsShiftWithAI } from './services/ai-pipeline.service.js';
import { isSignificantOddsShift } from './services/odds.service.js';
import { dispatchOddsMovementNotification } from './services/notification.service.js';
import { setupTelegramBot, startTelegramLink as startTelegramLinkService, processTelegramUpdate } from './services/telegram.service.js';
import { generateMatchStory, getMatchStory } from './services/story.service.js';
import { User, NotificationLog } from './models/index.js';
import {
  getMatchCommentary,
  getMatchMoodHistory,
  getMarketExplanations,
  getStorylineChapters,
  getBeginnerExplanation,
  getWhatYouMissed,
  runAITestMode,
} from './services/ai-routes.service.js';
import { isAIAvailable } from './services/gemini.service.js';
import { errorHandler } from './middlewares/error.middleware.js';
import { authRouter } from './routes/auth.routes.js';

const app = express();
const server = http.createServer(app);

function extractOdds(odds: Record<string, unknown> | undefined): { home: number; draw: number; away: number } | null {
  if (!odds) return null;
  const num = (v: unknown): number | undefined => {
    const n = typeof v === 'number' ? v : parseFloat(String(v));
    return Number.isFinite(n) ? n : undefined;
  };
  const home = num(odds['1'] ?? odds.home ?? odds.Home);
  const draw = num(odds['2'] ?? odds.draw ?? odds.Draw);
  const away = num(odds['3'] ?? odds.away ?? odds.Away);
  if (home === undefined || draw === undefined || away === undefined) return null;
  return { home, draw, away };
}

const io = new Server(server, {
  cors: {
    origin: config.frontendUrl,
    methods: ['GET', 'POST'],
  },
});

app.use(helmet());
app.use(cors({ origin: config.frontendUrl }));
app.use(express.json());
app.use(morgan('combined'));

app.get('/health', (_req, res) => {
  res.json({ status: 'healthy', timestamp: new Date().toISOString() });
});

app.get('/health/database', async (_req, res) => {
      try {
        const db = mongoose.connection.db;
        if (!db) throw new Error('Database not connected');
        await db.admin().ping();
        res.json({ status: 'connected' });
      } catch {
    res.status(503).json({ status: 'disconnected' });
  }
});

app.get('/health/txline', (_req, res) => {
  res.json({ status: txlineClient.isConnected() ? 'connected' : 'disconnected' });
});

app.get('/api/v1/matches/live', async (_req, res) => {
  try {
    const matches = await getLiveMatches();
    res.json({ success: true, data: matches });
  } catch (error) {
    console.error('Error fetching live matches:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch live matches' });
  }
});

app.get('/api/v1/matches/upcoming', async (_req, res) => {
  try {
    const matches = await getUpcomingMatches();
    res.json({ success: true, data: matches });
  } catch (error) {
    console.error('Error fetching upcoming matches:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch upcoming matches' });
  }
});

app.get('/api/v1/matches/completed', async (_req, res) => {
  try {
    const matches = await getCompletedMatches();
    res.json({ success: true, data: matches });
  } catch (error) {
    console.error('Error fetching completed matches:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch completed matches' });
  }
});

app.get('/api/v1/matches/:matchId', async (req, res) => {
  try {
    const match = await getMatchById(req.params.matchId);
    if (!match) {
      return res.status(404).json({ success: false, message: 'Match not found' });
    }
    res.json({ success: true, data: match });
  } catch (error) {
    console.error('Error fetching match:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch match' });
  }
});

app.get('/api/v1/matches/:matchId/timeline', async (req, res) => {
  try {
    const events = await getMatchTimeline(req.params.matchId);
    res.json({ success: true, data: events });
  } catch (error) {
    console.error('Error fetching timeline:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch timeline' });
  }
});

app.get('/api/v1/matches/:matchId/commentary', async (req, res) => {
  try {
    const data = await getMatchCommentary(req.params.matchId);
    res.json({ success: true, data });
  } catch (error) {
    console.error('Error fetching commentary:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch commentary' });
  }
});

app.get('/api/v1/matches/:matchId/mood', async (req, res) => {
  try {
    const data = await getMatchMoodHistory(req.params.matchId);
    res.json({ success: true, data });
  } catch (error) {
    console.error('Error fetching mood history:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch mood history' });
  }
});

app.get('/api/v1/matches/:matchId/market', async (req, res) => {
  try {
    const data = await getMarketExplanations(req.params.matchId);
    res.json({ success: true, data });
  } catch (error) {
    console.error('Error fetching market explanations:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch market explanations' });
  }
});

app.get('/api/v1/matches/:matchId/storyline', async (req, res) => {
  try {
    const data = await getStorylineChapters(req.params.matchId);
    res.json({ success: true, data });
  } catch (error) {
    console.error('Error fetching storyline:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch storyline' });
  }
});

app.get('/api/v1/matches/:matchId/beginner', async (req, res) => {
  try {
    const explanation = await getBeginnerExplanation(req.params.matchId);
    res.json({ success: true, data: { explanation } });
  } catch (error) {
    console.error('Error generating beginner explanation:', error);
    res.status(500).json({ success: false, message: 'Failed to generate beginner explanation' });
  }
});

app.get('/api/v1/matches/:matchId/what-you-missed', async (req, res) => {
  try {
    const data = await getWhatYouMissed(req.params.matchId);
    res.json({ success: true, data });
  } catch (error) {
    console.error('Error generating recap:', error);
    res.status(500).json({ success: false, message: 'Failed to generate recap' });
  }
});

app.get('/api/v1/ai/test', async (_req, res) => {
  try {
    const data = await runAITestMode();
    res.json({ success: true, data: { ...data, mode: 'test' } });
  } catch (error) {
    console.error('AI test mode failed:', error);
    res.status(500).json({ success: false, message: 'AI test mode failed' });
  }
});

app.get('/api/v1/ai/status', async (_req, res) => {
  res.json({
    success: true,
    data: {
      aiAvailable: isAIAvailable(),
      hasLiveData: txlineClient.isConnected(),
    },
  });
});

app.get('/api/v1/matches/:matchId/story', async (req, res) => {
  try {
    const story = await getMatchStory(req.params.matchId);
    if (!story) {
      return res.status(404).json({ success: false, message: 'Match story not available yet.' });
    }
    res.json({ success: true, data: story });
  } catch (error) {
    console.error('Error fetching match story:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch match story' });
  }
});

app.post('/api/v1/matches/:matchId/story/generate', async (req, res) => {
  try {
    const story = await generateMatchStory(req.params.matchId);
    if (!story) {
      return res.status(404).json({ success: false, message: 'Match not found.' });
    }
    res.json({ success: true, data: story });
  } catch (error) {
    console.error('Error generating match story:', error);
    res.status(500).json({ success: false, message: 'Failed to generate match story' });
  }
});

app.post('/api/v1/telegram/link/:code', async (req, res) => {
  try {
    const result = await startTelegramLinkService(req.params.code);
    if (!result) {
      return res.status(404).json({ success: false, message: 'User not found.' });
    }
    res.json({ success: true, data: { linkCode: result.linkCode, expiresAt: result.expiresAt } });
  } catch (error) {
    console.error('Error creating telegram link:', error);
    res.status(500).json({ success: false, message: 'Failed to create telegram link' });
  }
});

app.get('/api/v1/telegram/status/:wallet', async (req, res) => {
  try {
    const user = await User.findOne({ walletAddress: req.params.wallet }).lean();
    res.json({
      success: true,
      data: {
        connected: Boolean(user?.telegramConnected),
        telegramConnected: Boolean(user?.telegramConnected),
      },
    });
  } catch (error) {
    console.error('Error fetching telegram status:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch telegram status' });
  }
});

app.post('/api/v1/telegram/disconnect/:wallet', async (req, res) => {
  try {
    await User.findOneAndUpdate(
      { walletAddress: req.params.wallet },
      { telegramConnected: false, telegramChatId: undefined, telegramLinkCode: undefined }
    );
    res.json({ success: true, message: 'Telegram disconnected.' });
  } catch (error) {
    console.error('Error disconnecting telegram:', error);
    res.status(500).json({ success: false, message: 'Failed to disconnect telegram' });
  }
});

app.get('/api/v1/notifications/:wallet', async (req, res) => {
  try {
    const logs = await NotificationLog.find({ user: req.params.wallet })
      .sort({ createdAt: -1 })
      .limit(50)
      .lean();
    const user = await User.findOne({ walletAddress: req.params.wallet }).lean();
    res.json({
      success: true,
      data: {
        logs: logs.map((l) => ({
          _id: l._id.toString(),
          match: l.match,
          kind: l.kind,
          status: l.status,
          headline: l.kind,
          createdAt: (l.createdAt as Date).toISOString(),
        })),
        telegramConnected: Boolean(user?.telegramConnected),
      },
    });
  } catch (error) {
    console.error('Error fetching notifications:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch notifications' });
  }
});

app.post('/api/v1/telegram/webhook', async (req, res) => {
  try {
    await processTelegramUpdate(req.body);
    res.sendStatus(200);
  } catch (error) {
    console.error('Telegram webhook processing failed:', error);
    res.sendStatus(500);
  }
});

app.use('/api/v1/auth', authRouter);

app.use(errorHandler);

io.on('connection', (socket) => {
  console.log('Client connected:', socket.id);

  socket.on('match:subscribe', (matchId: string) => {
    socket.join(`match:${matchId}`);
    console.log(`Socket ${socket.id} subscribed to match ${matchId}`);
  });

  socket.on('match:unsubscribe', (matchId: string) => {
    socket.leave(`match:${matchId}`);
    console.log(`Socket ${socket.id} unsubscribed from match ${matchId}`);
  });

  socket.on('disconnect', () => {
    console.log('Client disconnected:', socket.id);
  });
});

async function startTxLINEStreams() {
  console.log('Starting TxLINE streams...');

  const authenticated = await ensureAuthenticated();
  if (!authenticated) {
    console.warn('TxLINE authentication failed. Live data will not be available.');
    console.warn('To enable live data, add TXLINE_GUEST_JWT and TXLINE_API_TOKEN to backend/.env');
    return;
  }

  try {
    await syncFixtures(io);
  } catch (error) {
    console.error('Failed to sync fixtures:', error);
  }

  (async () => {
    try {
      for await (const raw of txlineClient.streamScores()) {
        try {
          // TxLINE emits one raw event per action with PascalCase fields
          // (FixtureId, Action, Clock, Stats, ...), not the {fixtureId, actions}
          // shape our processor expects. Normalize it.
          const fixtureId = raw.FixtureId ?? raw.fixtureId;
          if (!fixtureId) continue;

          const clockSeconds =
            raw.Clock?.Seconds ??
            raw.Data?.Clock?.Seconds ??
            raw.Score?.Clock?.Seconds ??
            (typeof raw.clock === 'number' ? raw.clock : raw.clock?.Seconds);

          const action = raw.Action
            ? {
                type: String(raw.Action),
                minute: clockSeconds != null ? Math.floor(clockSeconds / 60) : raw.minute,
                participant: raw.Participant ?? raw.participant,
                data: raw.Data ?? raw.data,
              }
            : undefined;

          const update = {
            seq: raw.Seq ?? raw.seq,
            ts: raw.Ts ?? raw.ts,
            fixtureId: Number(fixtureId),
            gameState: raw.GameState ?? raw.gameState,
            stats: raw.Stats ?? raw.stats,
            clock: clockSeconds,
            actions: action ? [action] : raw.actions,
          };

          await processScoreUpdate(update as Parameters<typeof processScoreUpdate>[0], io);
        } catch (error) {
          console.error('Error processing score update:', error);
        }
      }
    } catch (error) {
      console.error('Scores stream ended:', error);
    }
  })();

  const previousOddsByFixture = new Map<number, { home: number; draw: number; away: number }>();

  (async () => {
    try {
      for await (const update of txlineClient.streamOdds()) {
        try {
          if (!update.fixtureId) continue;
          const newOdds = extractOdds(update.odds);
          if (!newOdds) continue;

          const previous = previousOddsByFixture.get(update.fixtureId);
          previousOddsByFixture.set(update.fixtureId, newOdds);

          const matchDoc = await Match.findById(txlineMatchId(update.fixtureId));
          if (!matchDoc) continue;

          matchDoc.currentOdds = newOdds;
          await matchDoc.save();

          if (previous && isSignificantOddsShift(previous, newOdds)) {
            const matchIdStr = matchDoc._id.toString();
            processOddsShiftWithAI(matchIdStr, { previousOdds: previous, newOdds }, io).catch(
              (err) => console.error('Odds shift AI failed:', err)
            );
            dispatchOddsMovementNotification(
              matchIdStr,
              `odds-${update.seq}`,
              `Odds shifted on ${matchDoc.homeTeam} vs ${matchDoc.awayTeam}`
            ).catch((err) => console.error('Odds movement notification failed:', err));
          }

          io.to(`match:${update.fixtureId}`).emit('market:update', {
            fixtureId: update.fixtureId,
            previousOdds: previous,
            newOdds,
          });
        } catch (error) {
          console.error('Error processing odds update:', error);
        }
      }
    } catch (error) {
      console.error('Odds stream ended:', error);
    }
  })();
}

async function startServer() {
  await connectDatabase();

  server.listen(config.port, () => {
    console.log(`Server running on port ${config.port}`);
    console.log(`Environment: ${config.nodeEnv}`);
  });

  setupTelegramBot().catch((err) => console.error('Telegram bot setup failed:', err));
  startTxLINEStreams();

  // Periodically re-sync fixtures so newly added matches are picked up and
  // statuses self-heal (the live status is driven by the action stream).
  setInterval(() => {
    syncFixtures(io).catch((err) => console.error('Periodic fixture sync failed:', err));
  }, 60_000);

  // Keep the displayed minute fresh from TxLINE snapshots and fire an AI
  // pundit take on every 5-minute milestone while the match is live.
  setInterval(() => {
    refreshLiveMinutes(io).catch((err) => console.error('refreshLiveMinutes failed:', err));
  }, 15_000);
}

startServer().catch((error) => {
  console.error('Failed to start server:', error);
  process.exit(1);
});

export { app, server, io };
