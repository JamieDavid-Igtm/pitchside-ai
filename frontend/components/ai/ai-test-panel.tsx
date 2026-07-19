'use client';

import { useState, useEffect } from 'react';
import { AITestResult, Commentary } from '@/types/match';
import { fetchAITest, fetchAIStatus } from '@/services/api';
import { PunditsTake } from './pundits-take';
import { MatchMoodCard } from './match-mood-card';
import { MarketExplanationCard } from './market-explanation-card';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Loader2, FlaskConical, AlertCircle, CheckCircle2 } from 'lucide-react';

export function AITestPanel() {
  const [data, setData] = useState<(AITestResult & { mode: string }) | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [status, setStatus] = useState<{ aiAvailable: boolean; hasLiveData: boolean } | null>(null);

  useEffect(() => {
    fetchAIStatus()
      .then(setStatus)
      .catch(() => setStatus({ aiAvailable: false, hasLiveData: false }));
  }, []);

  async function runTest() {
    setLoading(true);
    setError(null);
    try {
      const result = await fetchAITest();
      setData(result);
    } catch {
      setError('AI test mode is unavailable. Is the backend running?');
    } finally {
      setLoading(false);
    }
  }

  return (
    <Card className="border-warning/30 bg-warning/5">
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center gap-2">
          <FlaskConical className="h-4 w-4 text-warning" />
          AI Analysis — Demo Mode
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="flex items-center gap-2 flex-wrap">
          <Badge variant="warning">
            <FlaskConical className="h-3 w-3 mr-1" />
            Test Data
          </Badge>
          {status && (
            <span className="text-xs text-muted flex items-center gap-1">
              {status.aiAvailable ? (
                <CheckCircle2 className="h-3 w-3 text-pitch" />
              ) : (
                <AlertCircle className="h-3 w-3 text-warning" />
              )}
              {status.aiAvailable ? 'Gemini connected' : 'Gemini not configured (templates)'}
            </span>
          )}
        </div>

        <p className="text-xs text-secondary">
          This uses a controlled test event, not a live match. Real/live mode never falls back to this.
        </p>

        <button
          onClick={runTest}
          disabled={loading}
          className="flex w-full items-center justify-center gap-2 rounded-xl bg-pitch px-4 py-2.5 text-sm font-semibold text-midnight transition-all hover:opacity-90 disabled:opacity-60"
        >
          {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <FlaskConical className="h-4 w-4" />}
          Run AI Test
        </button>

        {error && (
          <div className="flex items-start gap-2 text-sm text-danger">
            <AlertCircle className="h-4 w-4 mt-0.5 shrink-0" />
            {error}
          </div>
        )}

        {data && (
          <div className="space-y-3 pt-1">
            <p className="text-[11px] text-muted italic">{data.note}</p>
            {data.pundit && <PunditsTake commentary={data.pundit as Commentary} />}
            {data.mood && <MatchMoodCard mood={data.mood} />}
            {data.market && <MarketExplanationCard market={data.market} />}
            {data.beginner && (
              <p className="text-sm text-secondary bg-elevated rounded-lg p-3 leading-relaxed">
                {data.beginner}
              </p>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
