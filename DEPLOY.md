# Deploying PitchSide AI

Hosting target (PRD): **Railway** (backend) + **Vercel** (frontend) + **MongoDB Atlas** (already provisioned).

## 1. Backend → Railway

1. Create a new project on https://railway.app and **Deploy from GitHub repo** → select this repo.
2. Set the **Root Directory** to `backend`.
3. Railway auto-detects Node, runs `npm run build` (tsc → `dist`), then `npm run start` (`node dist/index.js`). `railway.json` pins this.
4. Add the **Environment Variables** below.
5. Note the generated domain, e.g. `https://pitchside-ai-backend.up.railway.app`. This is your `NEXT_PUBLIC_API_URL` / `NEXT_PUBLIC_SOCKET_URL` base for the frontend.

### Backend env vars (Settings → Variables)
```
NODE_ENV=production
PORT=5000
MONGODB_URI=<your MongoDB Atlas connection string>
FRONTEND_URL=https://<your-vercel-app>.vercel.app
GEMINI_API_KEY=<your gemini key>
GEMINI_MODEL=gemini-2.0-flash
TELEGRAM_BOT_TOKEN=<optional>
TELEGRAM_WEBHOOK_URL=
TXLINE_API_ORIGIN=https://txline-dev.txodds.com
TXLINE_GUEST_JWT=<your TxLINE guest JWT>
TXLINE_API_TOKEN=<your TxLINE API token>
TXLINE_LEAGUES=
JWT_SECRET=<generate a long random string, e.g. openssl rand -hex 32>
JWT_EXPIRES_IN=24h
```

Verify health: `GET https://<railway-domain>/health` → `{ "status": "healthy" }`.

## 2. Frontend → Vercel

1. Import the repo at https://vercel.com → select this repo.
2. Set **Framework Preset = Next.js**, **Root Directory = `frontend`**.
3. Set the **Environment Variables** below, then Deploy.
4. Vercel auto-runs `next build`.

### Frontend env vars (Settings → Environment Variables)
```
NEXT_PUBLIC_API_URL=https://<railway-domain>/api/v1
NEXT_PUBLIC_SOCKET_URL=https://<railway-domain>
NEXT_PUBLIC_SOLANA_NETWORK=mainnet
```

> `NEXT_PUBLIC_*` values are baked in at build time — set them **before** the first deploy and re-deploy after changing them.

## 3. Post-deploy checks
- Open the Vercel URL → Live matches load.
- Click **Connect Wallet** → Phantom opens → sign → button shows a shortened address (`9GhK…81Df`); reload keeps you signed in; Disconnect clears the session.
- `GET /health`, `/health/database` return healthy.

## Local smoke (optional)
```bash
npm install && npm run dev      # backend :5000, frontend :3000
```
