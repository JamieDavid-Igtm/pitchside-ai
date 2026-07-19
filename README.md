# PitchSide AI

AI-powered football second-screen companion built on live TxLINE data.

> Never just watch the match. Understand every moment.

## Quick Start

### Prerequisites
- Node.js 18+
- MongoDB (local or Atlas)
- TxLINE API credentials (for live data)

### Setup

1. Install dependencies:
   ```bash
   npm run install:all
   ```

2. Configure environment variables:
   - Copy `.env.example` to `backend/.env`
   - Add your TxLINE credentials:
     ```
     TXLINE_GUEST_JWT=your_jwt
     TXLINE_API_TOKEN=your_token
     ```

3. Start MongoDB locally or update `MONGODB_URI` in `backend/.env`

4. Run the development servers:
   ```bash
   npm run dev
   ```

   Frontend: http://localhost:3000
   Backend: http://localhost:5000

## Architecture

- **Frontend**: Next.js 15 + TypeScript + Tailwind CSS + shadcn/ui
- **Backend**: Express + TypeScript + MongoDB + Socket.IO
- **Live Data**: TxLINE API (fixtures, scores, odds streams)

## TxLINE Integration

PitchSide AI uses the official TxLINE APIs for real-time match data.

1. Follow the [TxLINE Quickstart](https://txline.txodds.com/documentation/quickstart)
2. Subscribe on-chain using the World Cup Free Tier
3. Activate your API token
4. Add credentials to `backend/.env`

## Features

### Feature 1 — Live Match Centre
- Live match centre with real-time scores
- Storyline timeline with match events
- Match mood and momentum tracking
- Live odds display
- Real-time Socket.IO updates
- Mobile-first responsive design
- Loading, empty, and error states

### Feature 2 — AI Match Intelligence
- **Pundit's Take** — contextual AI analysis (The Moment / What Changed / Why The Market Reacted / Watch Next)
- **Match Mood** — dynamic 6-word-or-less mood label with reason and confidence
- **Storyline Timeline** — important events become story chapters (title, emotional headline, AI explanation, market reaction, tactical implication, match mood)
- **Market Explanation** — why the odds moved, in plain language, with confidence level (no betting jargon)
- **Explain Like I'm New** — one-tap beginner explanation (max 120 words)
- **What You Missed** — concise recap for late joiners (goals, cards, momentum shifts, biggest market move, current state)
- **Demo/Test Mode** — a clearly labelled AI test path (`GET /api/v1/ai/test` + in-app "AI Analysis — Demo Mode" panel) using a controlled test context. Real/live mode never falls back to test data.

### AI Pipeline
- Real TxLINE events trigger AI processing (high/medium priority events).
- Prompts live in `backend/src/prompts/` (separate from business logic).
- Outputs are validated with Zod and stored in MongoDB (Commentary, MatchMood, MarketExplanation).
- Generation is deduped per event and runs asynchronously so it never blocks the real-time data pipeline.
- Graceful template fallback when Gemini is unavailable.

## Environment Variables

| Variable | Purpose |
| --- | --- |
| `TXLINE_GUEST_JWT` / `TXLINE_API_TOKEN` | TxLINE live data credentials |
| `MONGODB_URI` | MongoDB connection |
| `GEMINI_API_KEY` | Google Gemini API key for live generated AI analysis |
| `GEMINI_MODEL` | Gemini model (default `gemini-2.0-flash`) |

## Tech Stack

- Next.js 15 (App Router)
- TypeScript
- Tailwind CSS
- Socket.IO
- Express
- MongoDB + Mongoose
- Google Gemini
- TxLINE
