# GrowEasy — AI-Powered CSV Lead Importer

Imports CRM leads from **any** CSV layout (Facebook Ads exports, Google Ads exports, real-estate
CRM exports, hand-made spreadsheets, etc.) by using an LLM to map arbitrary columns onto GrowEasy's
fixed CRM schema — instead of relying on fixed column names.

```
frontend/   Next.js 14 (App Router) + TypeScript + Tailwind — upload, preview, results UI
backend/    Node.js + Express + TypeScript — CSV parsing + batched AI field mapping
```

## How it works

1. **Upload** — drag & drop or pick a `.csv` file (frontend only).
2. **Preview** — parsed client-side with PapaParse and shown in a sticky-header, scrollable table.
   *No AI call happens yet.*
3. **Confirm** — user clicks "Confirm & Import"; only now does the frontend call the backend.
4. **AI mapping** — the backend splits rows into batches (default 25 rows/batch), sends each batch
   to Gemini (or OpenAI) with a schema-constrained prompt, retries failed batches up to 2 times,
   and defensively re-validates enum fields (`crm_status`, `data_source`) server-side even after
   the model responds.
5. **Results** — imported vs. skipped records, with counts, shown in a second table.

## 1. Get a free AI API key

You don't have a key yet — the fastest free option is **Google Gemini**:

1. Go to https://aistudio.google.com/apikey
2. Sign in with a Google account → "Create API key" → copy it.
3. Gemini's free tier is generous and is enough for this assignment.

(OpenAI also works — set `AI_PROVIDER=openai` and `OPENAI_API_KEY` instead — but Gemini needs no
billing setup, so it's recommended if you're starting from scratch.)

## 2. Run locally

**Backend**
```bash
cd backend
npm install
cp .env.example .env
# paste your key into .env:  GEMINI_API_KEY=xxxxx
npm run dev        # starts on http://localhost:4000
```

**Frontend** (separate terminal)
```bash
cd frontend
npm install
cp .env.example .env.local
# NEXT_PUBLIC_API_BASE_URL=http://localhost:4000
npm run dev         # starts on http://localhost:3000
```

Open http://localhost:3000, upload a CSV, preview it, confirm, and check the results table.

## 3. Deploy (free tier friendly)

**Backend → Render** (or Railway)
1. Push this repo to GitHub.
2. On Render: New → Web Service → connect the repo → set **Root Directory** to `backend`.
3. Build command: `npm install && npm run build`  |  Start command: `npm start`
4. Add environment variables: `GEMINI_API_KEY`, `AI_PROVIDER=gemini`, `CORS_ORIGIN=<your-vercel-url>`.
5. Deploy — copy the resulting URL, e.g. `https://groweasy-backend.onrender.com`.

**Frontend → Vercel**
1. On Vercel: New Project → import the same repo → set **Root Directory** to `frontend`.
2. Add environment variable: `NEXT_PUBLIC_API_BASE_URL=https://groweasy-backend.onrender.com`.
3. Deploy — Vercel gives you a public URL to submit.

> Note: Render's free tier spins down when idle, so the first AI request after inactivity can take
> ~30–60s to wake up. That's expected, not a bug.

## Environment variables

**backend/.env**
| Variable | Purpose |
|---|---|
| `AI_PROVIDER` | `gemini` (default) or `openai` |
| `GEMINI_API_KEY` / `GEMINI_MODEL` | Gemini credentials/model |
| `OPENAI_API_KEY` / `OPENAI_MODEL` | Only if `AI_PROVIDER=openai` |
| `AI_BATCH_SIZE` | Rows sent to the AI per request (default 25) |
| `AI_MAX_RETRIES` | Retries per failed batch (default 2) |
| `CORS_ORIGIN` | Your deployed frontend origin |
| `PORT` | Default 4000 |

**frontend/.env.local**
| Variable | Purpose |
|---|---|
| `NEXT_PUBLIC_API_BASE_URL` | URL of the running backend |

## Design notes (for reviewers)

- **Why parsing happens twice (client + server):** the assignment requires the *frontend* to
  preview without calling the AI, and separately requires the *backend* to independently accept
  and parse CSV data — so the client parses for preview (PapaParse) while the server has its own
  parser (`csv-parse`) for the real import, keeping the two responsibilities decoupled.
- **Enum safety net:** even though the model is instructed (and schema-constrained, for Gemini) to
  only emit allowed `crm_status`/`data_source` values, `batchProcessor.ts` re-validates every value
  server-side and blanks anything that doesn't match — the AI response is never trusted blindly.
- **Skip rule:** rows with neither an email nor a phone number are excluded from `imported` and
  surfaced separately in `skipped` with a reason, both when the AI marks them and as a backend-side
  fallback check.
- **Resilience:** each batch is retried (exponential-ish backoff) before being marked fully skipped,
  so one bad batch never fails the whole import.

## Position applying for

_(fill in: Software Developer Intern / Software Developer Full-Time)_
