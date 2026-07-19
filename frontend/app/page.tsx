'use client';

import { useState, useEffect } from 'react';
import { cn } from '@/utils/cn';
import { AppShell } from '@/components/layout/app-shell';
import { MatchCard } from '@/components/match/match-card';
import { MatchWithEvents } from '@/types/match';
import { fetchLiveMatches, fetchUpcomingMatches, fetchCompletedMatches } from '@/services/api';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { AITestPanel } from '@/components/ai/ai-test-panel';
import { AlertCircle, Radio, Clock, CheckCircle } from 'lucide-react';

type Tab = 'live' | 'upcoming' | 'completed';

const tabs: { id: Tab; label: string; icon: typeof Radio }[] = [
  { id: 'live', label: 'Live', icon: Radio },
  { id: 'upcoming', label: 'Upcoming', icon: Clock },
  { id: 'completed', label: 'Completed', icon: CheckCircle },
];

function MatchCardSkeleton() {
  return (
    <div className="rounded-xl border border-border bg-surface p-4 space-y-3">
      <div className="flex items-center justify-between">
        <Skeleton className="h-3 w-32" />
        <Skeleton className="h-5 w-14 rounded-full" />
      </div>
      <div className="flex items-center justify-between gap-4">
        <Skeleton className="h-4 w-24" />
        <div className="flex items-center gap-2">
          <Skeleton className="h-6 w-6" />
          <Skeleton className="h-4 w-4" />
          <Skeleton className="h-6 w-6" />
        </div>
        <Skeleton className="h-4 w-24" />
      </div>
      <div className="flex items-center justify-between pt-3 border-t border-border">
        <Skeleton className="h-3 w-16" />
        <Skeleton className="h-3 w-12" />
      </div>
    </div>
  );
}

export default function HomePage() {
  const [activeTab, setActiveTab] = useState<Tab>('live');
  const [liveMatches, setLiveMatches] = useState<MatchWithEvents[]>([]);
  const [upcomingMatches, setUpcomingMatches] = useState<MatchWithEvents[]>([]);
  const [completedMatches, setCompletedMatches] = useState<MatchWithEvents[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function loadMatches() {
      setLoading(true);
      setError(null);
      try {
        const [live, upcoming, completed] = await Promise.all([
          fetchLiveMatches(),
          fetchUpcomingMatches(),
          fetchCompletedMatches(),
        ]);
        setLiveMatches(live);
        setUpcomingMatches(upcoming);
        setCompletedMatches(completed);
      } catch {
        setError('Unable to load matches. Please check your connection.');
      } finally {
        setLoading(false);
      }
    }
    loadMatches();

    const interval = setInterval(loadMatches, 30000);
    return () => clearInterval(interval);
  }, []);

  const getMatches = () => {
    switch (activeTab) {
      case 'live': return liveMatches;
      case 'upcoming': return upcomingMatches;
      case 'completed': return completedMatches;
    }
  };

  const matches = getMatches();

  return (
    <AppShell>
      <div className="max-w-2xl mx-auto">
        <div className="px-4 pt-6 pb-4">
          <p className="text-sm text-secondary">Never just watch the match. Understand every moment.</p>
        </div>

        <div className="px-4 mb-4">
          <div className="flex rounded-lg bg-surface border border-border p-1">
            {tabs.map((tab) => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={cn(
                    "flex-1 flex items-center justify-center gap-1.5 py-2 px-3 rounded-md text-sm font-medium transition-all duration-150",
                    isActive
                      ? "bg-elevated text-primary shadow-sm"
                      : "text-muted hover:text-secondary"
                  )}
                >
                  <Icon className="h-4 w-4" />
                  <span className="hidden sm:inline">{tab.label}</span>
                </button>
              );
            })}
          </div>
        </div>

        {error && (
          <div className="mx-4 mb-4 rounded-xl border border-danger/30 bg-danger/10 p-4">
            <div className="flex items-start gap-3">
              <AlertCircle className="h-5 w-5 text-danger shrink-0 mt-0.5" />
              <div>
                <p className="text-sm text-primary font-medium">Connection Error</p>
                <p className="text-xs text-secondary mt-1">{error}</p>
              </div>
            </div>
          </div>
        )}

        <div className="px-4 space-y-3">
          {loading ? (
            <>
              <MatchCardSkeleton />
              <MatchCardSkeleton />
              <MatchCardSkeleton />
            </>
          ) : matches.length === 0 ? (
            <div className="rounded-xl border border-border bg-surface p-8 text-center">
              <div className="flex flex-col items-center gap-3">
                <div className="h-12 w-12 rounded-full bg-elevated flex items-center justify-center">
                  {activeTab === 'live' && <Radio className="h-6 w-6 text-muted" />}
                  {activeTab === 'upcoming' && <Clock className="h-6 w-6 text-muted" />}
                  {activeTab === 'completed' && <CheckCircle className="h-6 w-6 text-muted" />}
                </div>
                <div>
                  <p className="font-heading font-semibold text-primary">
                    {activeTab === 'live' && 'No live matches right now'}
                    {activeTab === 'upcoming' && 'No upcoming matches'}
                    {activeTab === 'completed' && 'No completed matches'}
                  </p>
                  <p className="text-sm text-muted mt-1">
                    {activeTab === 'live' && 'Check back soon or browse upcoming fixtures.'}
                    {activeTab === 'upcoming' && 'Fixtures will appear here when scheduled.'}
                    {activeTab === 'completed' && 'Completed match stories will appear here.'}
                  </p>
                </div>
              </div>
            </div>
          ) : (
            <>
              {activeTab === 'live' && liveMatches.length > 0 && (
                <div className="mb-4">
                  <Badge variant="live" className="mb-3">
                    <span className="mr-1.5 h-1.5 w-1.5 rounded-full bg-midnight animate-pulse-live" />
                    {liveMatches.length} Live Match{liveMatches.length !== 1 ? 'es' : ''}
                  </Badge>
                </div>
              )}
              {matches.map((match) => (
                <MatchCard key={match._id} match={match} />
              ))}

              {activeTab === 'live' && !loading && liveMatches.length === 0 && (
                <div className="mt-2">
                  <AITestPanel />
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </AppShell>
  );
}
