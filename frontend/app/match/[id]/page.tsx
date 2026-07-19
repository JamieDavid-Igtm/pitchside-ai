'use client';

import { useState, useEffect, use } from 'react';
import { notFound } from 'next/navigation';
import { cn } from '@/utils/cn';
import { AppShell } from '@/components/layout/app-shell';
import { MatchHeader } from '@/components/match/match-header';
import { MoodBadge } from '@/components/match/mood-badge';
import { OddsCard } from '@/components/match/odds-card';
import { MomentumCard } from '@/components/match/momentum-card';
import { PunditsTake } from '@/components/ai/pundits-take';
import { MatchMoodCard } from '@/components/ai/match-mood-card';
import { MarketExplanationCard } from '@/components/ai/market-explanation-card';
import { BeginnerExplainer } from '@/components/ai/beginner-explainer';
import { WhatYouMissedAction } from '@/components/ai/what-you-missed';
import { MatchStoryCard } from '@/components/ai/match-story-card';
import { StorylineTimeline } from '@/components/match/storyline-timeline';
import { TelegramConnect } from '@/components/layout/telegram-connect';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { AlertCircle, TrendingUp, MessageSquare, Sparkles, Bot, BookOpen, GraduationCap, History } from 'lucide-react';
import { motion } from 'framer-motion';
import { useSocket } from '@/hooks/useSocket';
import {
  fetchMatchById,
  fetchMatchTimeline,
  fetchCommentary,
  fetchStoryline,
  fetchMarketExplanations,
  fetchMoodHistory,
  fetchAIStatus,
  fetchMatchStory,
} from '@/services/api';
import {
  MatchWithEvents,
  MatchEvent,
  Commentary,
  StorylineChapter,
  MarketExplanation,
  MatchMood,
  MatchStory,
  AIStatus,
} from '@/types/match';

function MatchDetailSkeleton() {
  return (
    <div className="space-y-6">
      <div className="space-y-4">
        <Skeleton className="h-4 w-32" />
        <div className="flex items-center justify-between">
          <Skeleton className="h-8 w-32" />
          <div className="flex items-center gap-2">
            <Skeleton className="h-8 w-8" />
            <Skeleton className="h-4 w-4" />
            <Skeleton className="h-8 w-8" />
          </div>
          <Skeleton className="h-8 w-32" />
        </div>
        <Skeleton className="h-10 w-40 mx-auto" />
      </div>
      <Skeleton className="h-48 w-full rounded-xl" />
      <Skeleton className="h-32 w-full rounded-xl" />
    </div>
  );
}

export default function MatchDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const [match, setMatch] = useState<MatchWithEvents | null>(null);
  const [timeline, setTimeline] = useState<MatchEvent[]>([]);
  const [commentary, setCommentary] = useState<Commentary[]>([]);
  const [storyline, setStoryline] = useState<StorylineChapter[]>([]);
  const [markets, setMarkets] = useState<MarketExplanation[]>([]);
  const [moodHistory, setMoodHistory] = useState<MatchMood[]>([]);
  const [story, setStory] = useState<MatchStory | null>(null);
  const [aiStatus, setAiStatus] = useState<AIStatus | null>(null);
  const [newPunditKey, setNewPunditKey] = useState<string>('');
  const [newMoodKey, setNewMoodKey] = useState<string>('');
  const [newMarketKeys, setNewMarketKeys] = useState<string[]>([]);
  const [newStoryKey, setNewStoryKey] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { socket, isConnected, subscribeToMatch, unsubscribeFromMatch } = useSocket();

  useEffect(() => {
    let mounted = true;

    async function loadMatch() {
      setLoading(true);
      setError(null);
      try {
        const [matchData, timelineData, commentaryData, storylineData, marketData, moodData, statusData] =
          await Promise.all([
            fetchMatchById(id),
            fetchMatchTimeline(id),
            fetchCommentary(id).catch(() => []),
            fetchStoryline(id).catch(() => []),
            fetchMarketExplanations(id).catch(() => []),
            fetchMoodHistory(id).catch(() => []),
            fetchAIStatus().catch(() => ({ aiAvailable: false, hasLiveData: false })),
          ]);
        if (!matchData) {
          notFound();
          return;
        }
        const storyData = matchData.status === 'fulltime' ? await fetchMatchStory(id).catch(() => null) : null;
        if (mounted) {
          setMatch(matchData);
          setTimeline(timelineData);
          setCommentary(commentaryData);
          setStoryline(storylineData);
          setMarkets(marketData);
          setMoodHistory(moodData);
          setStory(storyData);
          setAiStatus(statusData);
        }
      } catch {
        if (mounted) {
          setError('Unable to load match details. Please try again.');
        }
      } finally {
        if (mounted) {
          setLoading(false);
        }
      }
    }

    loadMatch();

    return () => {
      mounted = false;
    };
  }, [id]);

  useEffect(() => {
    if (!socket) return;

    subscribeToMatch(id);

    const handleMatchUpdate = (updatedMatch: MatchWithEvents) => {
      setMatch(updatedMatch);
    };

    const handleMatchEvent = (event: MatchEvent) => {
      setTimeline((prev) => [event, ...prev]);
    };

    const handleCommentary = (payload: { matchId: string; eventId: string; commentary: Commentary }) => {
      if (payload.matchId === id) {
        setCommentary((prev) => {
          if (prev.some((c) => c._id === payload.commentary._id)) return prev;
          return [...prev, payload.commentary];
        });
        setNewPunditKey(payload.commentary._id);
      }
    };

    const handleMood = (payload: { matchId: string; mood: MatchMood; currentMood?: string }) => {
      if (payload.matchId === id && payload.mood) {
        setMatch((prev) => (prev ? { ...prev, currentMood: payload.currentMood || payload.mood.mood } : prev));
        setMoodHistory((prev) => {
          if (prev.some((m) => m._id === payload.mood._id)) return prev;
          return [...prev, payload.mood];
        });
        setNewMoodKey(payload.mood._id);
      }
    };

    const handleMarket = (payload: { matchId: string; market: MarketExplanation }) => {
      if (payload.matchId === id && payload.market) {
        setMarkets((prev) => {
          if (prev.some((m) => m._id === payload.market._id)) return prev;
          const next = [...prev, payload.market];
          setNewMarketKeys((keys) => [...keys, payload.market._id]);
          return next.slice(-5);
        });
      }
    };

    const handleStoryline = (chapter: StorylineChapter) => {
      if (chapter.matchId === id) {
        setStoryline((prev) => {
          if (prev.some((c) => c.eventId === chapter.eventId)) return prev;
          return [chapter, ...prev];
        });
      }
    };

    const handleStory = (payload: { matchId: string; story: MatchStory }) => {
      if (payload.matchId === id && payload.story) {
        setStory(payload.story);
        setNewStoryKey(payload.story._id);
      }
    };

    socket.on('match:update', handleMatchUpdate);
    socket.on('match:event', handleMatchEvent);
    socket.on('commentary:new', handleCommentary);
    socket.on('mood:update', handleMood);
    socket.on('market:update', handleMarket);
    socket.on('storyline:chapter', handleStoryline);
    socket.on('match:story', handleStory);

    return () => {
      unsubscribeFromMatch(id);
      socket.off('match:update', handleMatchUpdate);
      socket.off('match:event', handleMatchEvent);
      socket.off('commentary:new', handleCommentary);
      socket.off('mood:update', handleMood);
      socket.off('market:update', handleMarket);
      socket.off('storyline:chapter', handleStoryline);
      socket.off('match:story', handleStory);
    };
  }, [id, socket, subscribeToMatch, unsubscribeFromMatch]);

  const latestCommentary = commentary.length ? commentary[commentary.length - 1] : null;
  const latestMood = moodHistory.length ? moodHistory[moodHistory.length - 1] : null;
  const hasLiveAI = aiStatus?.aiAvailable;

  if (loading) {
    return (
      <AppShell>
        <div className="max-w-2xl mx-auto px-4 pt-6">
          <MatchDetailSkeleton />
        </div>
      </AppShell>
    );
  }

  if (error || !match) {
    return (
      <AppShell>
        <div className="max-w-2xl mx-auto px-4 pt-6">
          <Card className="border-danger/30">
            <CardContent className="p-6">
              <div className="flex items-start gap-3">
                <AlertCircle className="h-5 w-5 text-danger shrink-0 mt-0.5" />
                <div>
                  <p className="font-heading font-semibold text-primary">Unable to load match</p>
                  <p className="text-sm text-secondary mt-1">{error || 'Match not found.'}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </AppShell>
    );
  }

  return (
    <AppShell>
      <div className="max-w-2xl mx-auto">
        <div className="px-4 pt-6 pb-4">
          <MatchHeader match={match} />

          <div className="flex items-center justify-center gap-3 mt-4">
            <MoodBadge match={match} />
            {match.status === 'live' && (
              <Badge variant={isConnected ? 'live' : 'outline'}>
                <span className={cn("mr-1.5 h-1.5 w-1.5 rounded-full", isConnected ? "bg-midnight animate-pulse-live" : "bg-muted")} />
                {isConnected ? 'Live' : 'Reconnecting...'}
              </Badge>
            )}
            {hasLiveAI !== null && (
              <Badge variant={hasLiveAI ? 'default' : 'outline'}>
                <Bot className="h-3 w-3 mr-1" />
                {hasLiveAI ? 'AI On' : 'AI Templates'}
              </Badge>
            )}
          </div>
        </div>

        <div className="px-4 space-y-4">
          {!hasLiveAI && aiStatus !== null && (
            <div className="flex items-center gap-2 rounded-xl border border-warning/30 bg-warning/5 px-3 py-2 text-xs text-secondary">
              <Sparkles className="h-3.5 w-3.5 text-warning shrink-0" />
              AI is running on smart templates. Add a Gemini key to the backend for live generated analysis.
            </div>
          )}

          {/* Quick-access discovery rail */}
          <div className="flex gap-2 overflow-x-auto pb-1 -mx-1 px-1">
            <DiscoverChip icon={BookOpen} label="Storyline" />
            {latestCommentary && <DiscoverChip icon={Bot} label="Pundit's Take" />}
            {latestMood && <DiscoverChip icon={Sparkles} label="Match Mood" />}
            <DiscoverChip icon={TrendingUp} label="Market" />
            <DiscoverChip icon={GraduationCap} label="Explain for New" />
            <DiscoverChip icon={History} label="What You Missed" />
          </div>

          <Tabs defaultValue="storyline" className="w-full">
            <TabsList className="w-full">
              <TabsTrigger value="storyline" className="flex-1">Storyline</TabsTrigger>
              <TabsTrigger value="insights" className="flex-1">Insights</TabsTrigger>
              <TabsTrigger value="markets" className="flex-1">Markets</TabsTrigger>
            </TabsList>

            {/* CENTRAL NARRATIVE: Storyline Timeline */}
            <TabsContent value="storyline" className="mt-4 space-y-4">
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-base flex items-center gap-2">
                    <BookOpen className="h-4 w-4 text-pitch" />
                    Storyline Timeline
                    <span className="text-xs font-normal text-muted">The match as a story</span>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <StorylineTimeline events={timeline} chapters={storyline} />
                </CardContent>
              </Card>

              {latestCommentary && (
                <motion.div
                  key={newPunditKey || latestCommentary._id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.25, ease: 'easeOut' }}
                >
                  <PunditsTake commentary={latestCommentary} isNew={newPunditKey === latestCommentary._id} />
                </motion.div>
              )}

              {story && (
                <motion.div
                  key={newStoryKey || story._id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.25, ease: 'easeOut' }}
                >
                  <MatchStoryCard story={story} />
                </motion.div>
              )}
            </TabsContent>

            {/* INSIGHTS: the rest of the experience, easy to discover */}
            <TabsContent value="insights" className="mt-4 space-y-4">
              {latestCommentary && (
                <PunditsTake commentary={latestCommentary} isNew={newPunditKey === latestCommentary._id} />
              )}
              {latestMood && (
                <MatchMoodCard mood={latestMood} isNew={newMoodKey === latestMood._id} />
              )}

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <BeginnerExplainer matchId={id} />
                <WhatYouMissedAction matchId={id} />
              </div>

              <TelegramPanel />
            </TabsContent>

            <TabsContent value="markets" className="mt-4 space-y-4">
              <OddsCard match={match} />
              <MomentumCard match={match} />
              {markets.length > 0 ? (
                markets.slice().reverse().map((market) => (
                  <MarketExplanationCard key={market._id} market={market} isNew={newMarketKeys.includes(market._id)} />
                ))
              ) : (
                <p className="text-sm text-muted text-center py-6">
                  Market explanations appear when the odds move meaningfully.
                </p>
              )}
            </TabsContent>
          </Tabs>

          {match.status === 'fulltime' && !story && (
            <div className="py-2">
              <Card className="border-pitch/30 bg-pitch/5">
                <CardContent className="p-6 text-center">
                  <p className="font-heading text-lg font-semibold text-primary mb-1">Full Time</p>
                  <p className="text-sm text-secondary">Match story will be available shortly.</p>
                </CardContent>
              </Card>
            </div>
          )}
        </div>
      </div>
    </AppShell>
  );
}

function DiscoverChip({ icon: Icon, label }: { icon: typeof BookOpen; label: string }) {
  return (
    <div className="flex shrink-0 items-center gap-1.5 rounded-full border border-border bg-surface px-3 py-1.5 text-xs text-secondary">
      <Icon className="h-3.5 w-3.5 text-pitch" />
      {label}
    </div>
  );
}

function TelegramPanel() {
  const [wallet, setWallet] = useState<string>('');
  useEffect(() => {
    try {
      const stored = localStorage.getItem('pitchside_wallet');
      if (stored) setWallet(stored);
    } catch {
      /* ignore */
    }
  }, []);

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center gap-2">
          <MessageSquare className="h-4 w-4 text-pitch" />
          Never Miss a Moment
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-2">
        <p className="text-sm text-secondary">
          Link Telegram to get goal, card, and full-time alerts with a one-tap return to this match.
        </p>
        <TelegramConnect wallet={wallet} />
      </CardContent>
    </Card>
  );
}
