import { MatchWithEvents, MatchEvent, Commentary, MatchMood, MarketExplanation, StorylineChapter, WhatYouMissed, AITestResult, AIStatus, MatchStory, TelegramStatus, NotificationsView } from '@/types/match';
import { AuthChallenge, AuthVerifyResponse, AuthUser } from '@/types/auth';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api/v1';

async function fetchWithTimeout(url: string, timeoutMs = 10000, options?: RequestInit): Promise<Response> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(url, { ...options, signal: controller.signal });
    return res;
  } finally {
    clearTimeout(timeoutId);
  }
}

export async function fetchLiveMatches() {
  const res = await fetchWithTimeout(`${API_URL}/matches/live`);
  if (!res.ok) throw new Error('Failed to fetch live matches');
  const json = await res.json();
  return json.data || [];
}

export async function fetchUpcomingMatches() {
  const res = await fetchWithTimeout(`${API_URL}/matches/upcoming`);
  if (!res.ok) throw new Error('Failed to fetch upcoming matches');
  const json = await res.json();
  return json.data || [];
}

export async function fetchCompletedMatches() {
  const res = await fetchWithTimeout(`${API_URL}/matches/completed`);
  if (!res.ok) throw new Error('Failed to fetch completed matches');
  const json = await res.json();
  return json.data || [];
}

export async function fetchMatchById(matchId: string) {
  const res = await fetchWithTimeout(`${API_URL}/matches/${matchId}`);
  if (!res.ok) throw new Error('Failed to fetch match');
  const json = await res.json();
  return json.data;
}

export async function fetchMatchTimeline(matchId: string) {
  const res = await fetchWithTimeout(`${API_URL}/matches/${matchId}/timeline`);
  if (!res.ok) throw new Error('Failed to fetch timeline');
  const json = await res.json();
  return json.data || [];
}

export async function fetchCommentary(matchId: string): Promise<Commentary[]> {
  const res = await fetchWithTimeout(`${API_URL}/matches/${matchId}/commentary`);
  if (!res.ok) throw new Error('Failed to fetch commentary');
  const json = await res.json();
  return json.data || [];
}

export async function fetchMoodHistory(matchId: string): Promise<MatchMood[]> {
  const res = await fetchWithTimeout(`${API_URL}/matches/${matchId}/mood`);
  if (!res.ok) throw new Error('Failed to fetch mood history');
  const json = await res.json();
  return json.data || [];
}

export async function fetchMarketExplanations(matchId: string): Promise<MarketExplanation[]> {
  const res = await fetchWithTimeout(`${API_URL}/matches/${matchId}/market`);
  if (!res.ok) throw new Error('Failed to fetch market explanations');
  const json = await res.json();
  return json.data || [];
}

export async function fetchStoryline(matchId: string): Promise<StorylineChapter[]> {
  const res = await fetchWithTimeout(`${API_URL}/matches/${matchId}/storyline`);
  if (!res.ok) throw new Error('Failed to fetch storyline');
  const json = await res.json();
  return json.data || [];
}

export async function fetchBeginnerExplanation(matchId: string): Promise<string> {
  const res = await fetchWithTimeout(`${API_URL}/matches/${matchId}/beginner`);
  if (!res.ok) throw new Error('Failed to fetch beginner explanation');
  const json = await res.json();
  return json.data?.explanation || '';
}

export async function fetchWhatYouMissed(matchId: string): Promise<WhatYouMissed> {
  const res = await fetchWithTimeout(`${API_URL}/matches/${matchId}/what-you-missed`);
  if (!res.ok) throw new Error('Failed to fetch recap');
  const json = await res.json();
  return json.data;
}

export async function fetchAITest(): Promise<AITestResult & { mode: string }> {
  const res = await fetchWithTimeout(`${API_URL}/ai/test`);
  if (!res.ok) throw new Error('Failed to run AI test');
  const json = await res.json();
  return json.data;
}

export async function fetchAIStatus(): Promise<AIStatus> {
  const res = await fetchWithTimeout(`${API_URL}/ai/status`);
  if (!res.ok) throw new Error('Failed to fetch AI status');
  const json = await res.json();
  return json.data;
}

export async function fetchMatchStory(matchId: string): Promise<MatchStory | null> {
  const res = await fetchWithTimeout(`${API_URL}/matches/${matchId}/story`);
  if (!res.ok) return null;
  const json = await res.json();
  return json.data || null;
}

export async function fetchTelegramStatus(wallet: string): Promise<TelegramStatus> {
  const res = await fetchWithTimeout(`${API_URL}/telegram/status/${encodeURIComponent(wallet)}`);
  if (!res.ok) throw new Error('Failed to fetch telegram status');
  const json = await res.json();
  return json.data;
}

export async function startTelegramLink(wallet: string): Promise<{ linkCode: string; expiresAt: string }> {
  const res = await fetchWithTimeout(`${API_URL}/telegram/link/${encodeURIComponent(wallet)}`, 10000, { method: 'POST' });
  if (!res.ok) throw new Error('Failed to create telegram link');
  const json = await res.json();
  return json.data;
}

export async function disconnectTelegram(wallet: string): Promise<void> {
  const res = await fetchWithTimeout(`${API_URL}/telegram/disconnect/${encodeURIComponent(wallet)}`, 10000, { method: 'POST' });
  if (!res.ok) throw new Error('Failed to disconnect telegram');
}

export async function fetchNotifications(wallet: string): Promise<NotificationsView> {
  const res = await fetchWithTimeout(`${API_URL}/notifications/${encodeURIComponent(wallet)}`);
  if (!res.ok) throw new Error('Failed to fetch notifications');
  const json = await res.json();
  return json.data;
}

export async function fetchAuthChallenge(walletAddress: string): Promise<AuthChallenge> {
  const res = await fetchWithTimeout(
    `${API_URL}/auth/challenge`,
    10000,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ walletAddress }),
    }
  );
  if (!res.ok) {
    const json = await res.json().catch(() => ({}));
    throw new Error(json.message || 'Failed to generate authentication challenge.');
  }
  const json = await res.json();
  return json.data;
}

export async function verifyAuthSignature(
  walletAddress: string,
  signature: string,
  message: string
): Promise<AuthVerifyResponse> {
  const res = await fetchWithTimeout(
    `${API_URL}/auth/verify`,
    10000,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ walletAddress, signature, message }),
    }
  );
  if (!res.ok) {
    const json = await res.json().catch(() => ({}));
    throw new Error(json.message || 'Failed to verify wallet signature.');
  }
  const json = await res.json();
  return json.data;
}

export async function fetchCurrentUser(token: string): Promise<AuthUser | null> {
  const res = await fetchWithTimeout(`${API_URL}/auth/me`, 10000, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) return null;
  const json = await res.json();
  return json.data?.user ?? null;
}
