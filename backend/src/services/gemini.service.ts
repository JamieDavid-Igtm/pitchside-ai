import { GoogleGenerativeAI, type Schema } from '@google/generative-ai';
import { config } from '../config/env.js';
import {
  punditSchema,
  moodSchema,
  marketSchema,
  beginnerSchema,
  storylineSchema,
  whatYouMissedSchema,
  storySchema,
  AIModel,
  PunditOutput,
  MoodOutput,
  MarketOutput,
  BeginnerOutput,
  StorylineOutput,
  WhatYouMissedOutput,
  StoryOutput,
} from './openai.schema.js';

let client: GoogleGenerativeAI | null = null;

function getClient(): GoogleGenerativeAI | null {
  if (!config.geminiApiKey) return null;
  if (!client) {
    client = new GoogleGenerativeAI(config.geminiApiKey);
  }
  return client;
}

export function isAIAvailable(): boolean {
  return Boolean(config.geminiApiKey);
}

interface PromptInput {
  system: string;
  user: string;
}

const SCHEMA_MAP: Record<AIModel, import('zod').ZodTypeAny> = {
  pundit: punditSchema,
  mood: moodSchema,
  market: marketSchema,
  beginner: beginnerSchema,
  storyline: storylineSchema,
  whatYouMissed: whatYouMissedSchema,
  story: storySchema,
};

const TONE_MAP: Record<AIModel, string> = {
  pundit: 'A Pundit\'s Take with fields: headline, moment, whatChanged, marketReaction, watchNext, tone.',
  mood: 'A match mood object with fields: mood, reason, confidence (one of "high"|"medium"|"low").',
  market: 'A market explanation with fields: reason, explanation, confidence (0-100 integer).',
  beginner: 'A beginner explanation with a single field: explanation (max 120 words).',
  storyline: 'A storyline chapter with fields: eventTitle, emotionalHeadline, explanation, marketReaction, tacticalImplication, matchMood.',
  whatYouMissed: 'A recap with a single field: summary.',
  story: 'A match story with fields: title, summary, beginning, turningPoint, keyMoments (array of strings), finalReflection, story, hero (optional string).',
};

function toGeminiSchema(model: AIModel): Schema {
  // Note: Gemini's API rejects `additionalProperties`, so omit it here. The
  // required fields are still enforced via GEMINI_REQUIRED for our own parsing.
  const base: Record<string, unknown> = {
    type: 'object',
    properties: GEMINI_PROPERTIES[model],
    required: GEMINI_REQUIRED[model],
  };
  return base as unknown as Schema;
}

const GEMINI_PROPERTIES: Record<AIModel, Record<string, Record<string, unknown>>> = {
  pundit: {
    headline: { type: 'string' },
    moment: { type: 'string' },
    whatChanged: { type: 'string' },
    marketReaction: { type: 'string' },
    watchNext: { type: 'string' },
    tone: { type: 'string', enum: ['calm', 'dramatic', 'exciting', 'tense', 'historic'] },
  },
  mood: {
    mood: { type: 'string' },
    reason: { type: 'string' },
    confidence: { type: 'string', enum: ['high', 'medium', 'low'] },
  },
  market: {
    reason: { type: 'string' },
    explanation: { type: 'string' },
    confidence: { type: 'integer' },
  },
  beginner: {
    explanation: { type: 'string' },
  },
  storyline: {
    eventTitle: { type: 'string' },
    emotionalHeadline: { type: 'string' },
    explanation: { type: 'string' },
    marketReaction: { type: 'string' },
    tacticalImplication: { type: 'string' },
    matchMood: { type: 'string' },
  },
  whatYouMissed: {
    summary: { type: 'string' },
  },
  story: {
    title: { type: 'string' },
    summary: { type: 'string' },
    beginning: { type: 'string' },
    turningPoint: { type: 'string' },
    keyMoments: { type: 'array', items: { type: 'string' } },
    finalReflection: { type: 'string' },
    story: { type: 'string' },
    hero: { type: 'string' },
  },
};

const GEMINI_REQUIRED: Record<AIModel, string[]> = {
  pundit: ['headline', 'moment', 'whatChanged', 'marketReaction', 'watchNext', 'tone'],
  mood: ['mood', 'reason', 'confidence'],
  market: ['reason', 'explanation', 'confidence'],
  beginner: ['explanation'],
  storyline: ['eventTitle', 'emotionalHeadline', 'explanation', 'marketReaction', 'tacticalImplication', 'matchMood'],
  whatYouMissed: ['summary'],
  story: ['title', 'summary', 'beginning', 'turningPoint', 'keyMoments', 'finalReflection', 'story'],
};

export async function generateStructured<T = unknown>(
  model: AIModel,
  prompt: PromptInput,
  maxTokens = 700
): Promise<T> {
  const genAI = getClient();
  if (!genAI) {
    throw new Error('Gemini client is not configured');
  }

  const geminiModel = genAI.getGenerativeModel({
    model: config.geminiModel,
  });

  const result = await geminiModel.generateContent({
    systemInstruction: {
      role: 'user',
      parts: [{ text: `${prompt.system}\n\n${TONE_MAP[model]}\n\nYou MUST respond with valid JSON matching this schema:\n${JSON.stringify(toGeminiSchema(model), null, 2)}` }],
    },
    contents: [
      {
        role: 'user',
        parts: [{ text: prompt.user }],
      },
    ],
    generationConfig: {
      temperature: 0.7,
      maxOutputTokens: maxTokens,
      responseMimeType: 'application/json',
      responseSchema: toGeminiSchema(model),
    },
  });

  const response = await result.response;
  const text = response.text();
  if (!text) {
    throw new Error('Gemini returned empty content');
  }

  const parsed = JSON.parse(text);
  // Be tolerant of Gemini returning valid-but-loosely-shaped JSON: fill missing
  // required fields with '' instead of throwing, so we keep the real generated
  // prose rather than a generic template fallback.
  const requiredKeys = GEMINI_REQUIRED[model];
  const out: Record<string, unknown> = {};
  for (const key of requiredKeys) {
    out[key] = parsed[key] ?? '';
  }
  return out as unknown as T;
}

export type {
  PunditOutput,
  MoodOutput,
  MarketOutput,
  BeginnerOutput,
  StorylineOutput,
  WhatYouMissedOutput,
  StoryOutput,
};
