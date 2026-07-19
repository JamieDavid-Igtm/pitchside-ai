import { z } from 'zod';

export const punditSchema = z.object({
  headline: z.string().min(1).max(120),
  moment: z.string().min(1),
  whatChanged: z.string().min(1),
  marketReaction: z.string().min(1),
  watchNext: z.string().min(1),
  tone: z.enum(['calm', 'dramatic', 'exciting', 'tense', 'historic']).default('calm'),
});

export const moodSchema = z.object({
  mood: z.string().min(1).max(60),
  reason: z.string().min(1).max(200),
  confidence: z.enum(['high', 'medium', 'low']).default('medium'),
});

export const marketSchema = z.object({
  reason: z.string().min(1).max(60),
  explanation: z.string().min(1),
  confidence: z.number().min(0).max(100).default(50),
});

export const beginnerSchema = z.object({
  explanation: z.string().min(1).max(800),
});

export const storylineSchema = z.object({
  eventTitle: z.string().min(1).max(80),
  emotionalHeadline: z.string().min(1).max(120),
  explanation: z.string().min(1),
  marketReaction: z.string().min(1),
  tacticalImplication: z.string().min(1),
  matchMood: z.string().min(1).max(60),
});

export const whatYouMissedSchema = z.object({
  summary: z.string().min(1),
});

export const storySchema = z.object({
  title: z.string().min(1).max(120),
  summary: z.string().min(1),
  beginning: z.string().min(1),
  turningPoint: z.string().min(1),
  keyMoments: z.array(z.string().min(1).max(120)).max(8).default([]),
  finalReflection: z.string().min(1),
  story: z.string().min(50),
  hero: z.string().max(120).optional(),
});

export type PunditOutput = z.infer<typeof punditSchema>;
export type MoodOutput = z.infer<typeof moodSchema>;
export type MarketOutput = z.infer<typeof marketSchema>;
export type BeginnerOutput = z.infer<typeof beginnerSchema>;
export type StorylineOutput = z.infer<typeof storylineSchema>;
export type WhatYouMissedOutput = z.infer<typeof whatYouMissedSchema>;
export type StoryOutput = z.infer<typeof storySchema>;

export type AIModel =
  | 'pundit'
  | 'mood'
  | 'market'
  | 'beginner'
  | 'storyline'
  | 'whatYouMissed'
  | 'story';
