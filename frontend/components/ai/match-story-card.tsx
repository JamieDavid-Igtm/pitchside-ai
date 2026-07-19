'use client';

import { MatchStory } from '@/types/match';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { BookOpen, Sparkles, Trophy } from 'lucide-react';

export function MatchStoryCard({ story }: { story: MatchStory }) {
  if (!story) return null;
  return (
    <Card className="border-pitch/30 bg-gradient-to-b from-surface to-surface/60">
      <div className="absolute inset-x-0 top-0 h-0.5 bg-pitch/60" />
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center gap-2">
          <span className="flex h-7 w-7 items-center justify-center rounded-full bg-pitch/15">
            <BookOpen className="h-4 w-4 text-pitch" />
          </span>
          Match Story
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <h3 className="font-heading text-xl font-bold text-primary leading-tight">{story.title}</h3>
        <p className="text-sm text-secondary italic">{story.summary}</p>

        <Section label="The Beginning" text={story.beginning} />
        <Section label="The Turning Point" text={story.turningPoint} />

        {story.keyMoments && story.keyMoments.length > 0 && (
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-muted mb-1.5">Key Moments</p>
            <ul className="space-y-1">
              {story.keyMoments.map((m, i) => (
                <li key={i} className="flex items-start gap-2 text-sm text-secondary">
                  <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-pitch" />
                  {m}
                </li>
              ))}
            </ul>
          </div>
        )}

        {story.hero && (
          <p className="text-sm text-secondary">
            <Trophy className="inline h-3.5 w-3.5 text-warning mr-1" />
            <span className="font-medium text-primary">Hero:</span> {story.hero}
          </p>
        )}

        <Section label="Final Reflection" text={story.finalReflection} />

        <p className="text-sm leading-relaxed text-secondary whitespace-pre-line">{story.story}</p>

        {story.generatedBy !== 'gemini' && (
          <div className="flex items-center gap-1.5 text-xs text-muted">
            <Sparkles className="h-3 w-3" />
            <span>Smart template (AI unavailable)</span>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function Section({ label, text }: { label: string; text: string }) {
  return (
    <div>
      <p className="text-xs font-semibold uppercase tracking-wider text-muted mb-0.5">{label}</p>
      <p className="text-secondary leading-relaxed">{text}</p>
    </div>
  );
}
