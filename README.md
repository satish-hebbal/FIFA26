# FIFA World Cup 2026 — Bracket Map & Live Scores

A mobile-first, single-page site that shows the **32-team knockout bracket** filling in
as matches finish, plus a **live scores** strip during match hours. Built with Next.js
(App Router, TypeScript) + Tailwind CSS. Styled after the CBS Sports *Golazo* World Cup
2026 board — deep royal-blue, white team plates, gold score tabs, a trophy beside the Final.

Data comes from [football-data.org v4](https://www.football-data.org) (free tier; the
FIFA World Cup is free forever). **Visitors never call football-data.org directly** — only
our server does, at most once per ~60s, and every visitor reads our cached copy. This keeps
us structurally under the 10-requests/minute free limit and hides the API token.

---

## Quick start

```bash
npm install
cp .env.local.example .env.local   # then paste your token into .env.local
npm run dev                        # http://localhost:3000
```

### Get a token

1. Register a free account at <https://www.football-data.org> (no card required).
2. Copy your API token.
3. Put it in `.env.local`:

   ```
   FOOTBALL_DATA_TOKEN=your_token_here
   ```

> The token is read **only** server-side (in `app/api/worldcup/route.ts`). It is never
> shipped to the browser, so it is **not** prefixed with `NEXT_PUBLIC_`.

The site renders even with **no token / no network** — it falls back to the committed
bracket skeleton (`data/fallback.json`), so you always see the tree.

---

## How the caching layer works

```
Browser ──poll every ~45s──▶ /api/worldcup (our server)
                                 │  (Next data cache, revalidate: 60)
                                 │  cache stale?
                                 ▼
                    football-data.org /v4/competitions/WC/matches
                                 │  retry ×2 → serve last-good → static fallback
                                 ▼
                       normalize → return 200 JSON (always valid)
```

- `lib/footballData.ts` — fetches `WC` matches with `X-Auth-Token`, `revalidate: 60`,
  retries twice on failure.
- `lib/normalize.ts` — merges live results onto the fixed `data/fallback.json` skeleton:
  R32 by team pairing, deeper rounds positionally, then propagates winners into the next
  round's empty slots so the tree visibly fills up.
- `app/api/worldcup/route.ts` — always returns valid normalized JSON with HTTP 200. On
  upstream failure it serves the last good in-memory payload, then the static skeleton.
- `lib/useWorldCup.ts` — client hook polling `/api/worldcup` every ~45s, keeping the last
  good state on any error (never blanks the screen). Also refreshes when the tab regains
  focus.

Because of `revalidate: 60`, even 10,000 visitors polling our route trigger **at most one**
upstream call per minute.

---

## Deploy (Vercel)

1. Push to GitHub (already wired to `origin`).
2. Import the repo into Vercel.
3. Add the env var **`FOOTBALL_DATA_TOKEN`** in Project → Settings → Environment Variables.
4. Deploy. Attach your custom domain in Vercel.

Everything else works out of the box.

### Optional upgrade: guaranteed freshness with Vercel Cron

The current design refreshes upstream only when someone visits. If you want the data to
stay fresh during a live match **even when nobody is watching**, add a [Vercel Cron](https://vercel.com/docs/cron-jobs)
job hitting `/api/worldcup` every minute. That's the only moving part needed — no database.
Not built in v1 to keep infrastructure at zero.

---

## Goal scorers

Per-goal scorer data is a paid ("stats") feature on football-data.org and is generally
**not available on the free tier**. The live cards are built to render a scorer list *only
if* the payload includes one (`scorers` on a match) and to show nothing otherwise — no
error either way. It's progressive enhancement, not a hard dependency.

---

## Project structure

```
app/
  api/worldcup/route.ts   cached upstream fetch + retry + serve-stale + normalize
  layout.tsx  page.tsx  globals.css
components/
  Header  LiveScores  LiveMatchCard  Bracket  BracketRound  MatchNode  Dashboard
lib/
  footballData.ts  normalize.ts  types.ts  bracket.ts  useWorldCup.ts
data/
  fallback.json           fixed knockout skeleton (real R32 pairings + full wiring)
```

## Tournament facts

48 teams → 12 groups → 32 knockout teams. Rounds: Round of 32 → Round of 16 →
Quarter-finals → Semi-finals → Final, plus a Third-place playoff (standalone card).
Final: **July 19, 2026, MetLife Stadium, New York/New Jersey.**
