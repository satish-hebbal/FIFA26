# FIFA World Cup 2026 — Bracket Map & Live Scores

**Build spec for Claude Code.** Read this top to bottom, then build the whole thing in one pass. This document is the single source of truth for scope, architecture, data shapes, and file layout. Don't re-research the API — the relevant facts are inlined below.

---

## 0. TL;DR for the build agent

Build a **mobile-first, single-page Next.js (App Router) site** with two sections on one screen:

1. **Knockout bracket map** — the 32-team knockout tree (Round of 32 → Round of 16 → Quarter-finals → Semi-finals → Final), which visually fills in as matches finish and winners advance. This is the hero of the page.
2. **Live scores** — a compact list of matches currently in play, with score and status. Goal-scorer detail is shown *only if the API provides it* (see §5.4 — likely not on the free tier; degrade gracefully).

Data comes from **football-data.org v4** (free tier, FIFA World Cup is free forever). The crux of the engineering is a **caching layer**: the user's browser NEVER calls football-data.org directly. Only our server does, at most once per ~60s, and every visitor reads our cached copy. This keeps us comfortably under the 10-requests/minute free limit and hides the API token.

No landing page. No routing. One page that renders the bracket instantly on load. Deploy target: **Vercel**. The only env var the human will set is the API token.

---

## 1. Tournament facts (hardcode the structure; pull results from the API)

- 48 teams → 12 groups of 4 (Groups A–L). Group stage is complete.
- Knockout qualifiers: 12 group winners + 12 runners-up + 8 best third-placed teams = **32 teams**.
- Knockout rounds, in order: **Round of 32 → Round of 16 → Quarter-finals → Semi-finals → Final**. (There is also a Third-place playoff — include it as a small separate card, not part of the main bracket tree.)
- Single elimination. If level after 90 min → extra time → penalties.
- Total tournament: 104 matches. Knockout matches are numbered 73–104 (group stage = 1–72).
- Final: **July 19, 2026, MetLife Stadium, New York/New Jersey.**
- The knockout bracket is **fixed** (no redraws), so the tree structure is static and known in advance. Only the team names and results change as the API updates. This is why the static fallback (§6) can carry the full skeleton.

**Bracket scope decision:** the visual bracket represents the **32-team knockout tree only**. The group stage is not drawn as a bracket (it isn't one). Optionally render a small collapsed "Groups" summary strip above the bracket if time allows, but the knockout tree is the priority and the part that "fills up."

---

## 2. Tech stack

- **Next.js** (App Router, TypeScript).
- **Tailwind CSS** for styling. Mobile-first; ~90% of traffic is mobile, so design for a ~380px viewport first and let it scale up.
- No database, no external cache service, no auth. Keep dependencies minimal.
- Before writing any UI, **read the `frontend-design` skill** (`/mnt/skills/public/frontend-design/SKILL.md`) and apply its design-token and styling guidance so the bracket looks intentional, not templated.

---

## 3. Architecture — the caching layer (most important part)

### 3.1 The principle
Decouple "how often we hit football-data.org" from "how many people visit the site." Visitors hit *our* endpoint; our endpoint serves a cached copy; the upstream API is refreshed on a timer, once, no matter how many visitors there are.

### 3.2 Chosen mechanism (simplest robust option — use this)
A **Next.js Route Handler** at `/api/worldcup` that fetches football-data.org using Next's built-in data cache with timed revalidation:

```ts
const res = await fetch("https://api.football-data.org/v4/competitions/WC/matches", {
  headers: { "X-Auth-Token": process.env.FOOTBALL_DATA_TOKEN! },
  next: { revalidate: 60 }, // upstream is re-fetched at most once per 60s
});
```

- The frontend calls **our** `/api/worldcup`, never football-data.org.
- The frontend polls `/api/worldcup` on an interval (every 30–60s) so the bracket and live scores update during matches without a manual refresh.
- Because of `revalidate: 60`, even 10,000 visitors polling our route trigger **at most one** upstream call per minute. We are structurally incapable of exceeding the 10/min limit with this design.
- The token lives server-side in the route handler. It is never shipped to the browser.

This satisfies the human's exact mental model ("fetch once a minute, store it, serve the stored value to everyone") with zero external infrastructure.

### 3.3 Why not a separate cron + database
A Vercel Cron job writing to Vercel KV/Redis would also work and guarantees a background refresh even with zero traffic. It's more moving parts and adds env vars and a paid-tier-adjacent store. **Skip it for v1.** If the human later wants guaranteed freshness during a live match even when nobody's watching, a Vercel Cron hitting `/api/worldcup` every minute is the clean upgrade path — note it in the README but don't build it now.

### 3.4 Resilience (no user should ever see an error or empty state)
1. **Retry:** in the route handler, retry the upstream fetch up to 2 times on network error or non-200 (small backoff). 
2. **Serve-stale-on-error:** if all retries fail, return the **last successfully cached payload** rather than an error. Keep the most recent good normalized payload in a module-level variable as a warm in-memory copy.
3. **Static fallback:** if there is no cached copy yet AND upstream fails (e.g. cold start during an outage), serve the committed `data/fallback.json` snapshot (§6) so the bracket skeleton always renders. 
4. The route handler **always returns valid, normalized JSON with HTTP 200** to the client. The client never has to handle an API error — worst case it shows the skeleton with "—" placeholders.
5. Client-side: wrap the poll in try/catch; on failure keep showing the last good state. Never blank the screen.

### 3.5 Request flow summary
```
Browser ──poll every 30–60s──▶ /api/worldcup (our server)
                                   │
                          (cache fresh? serve it)
                                   │ cache stale (>60s)
                                   ▼
                      football-data.org /v4/competitions/WC/matches
                                   │  (retry x2, then serve-stale, then fallback.json)
                                   ▼
                        normalize → cache → return JSON
```

---

## 4. football-data.org API reference (v4)

- **Base URL:** `https://api.football-data.org/v4/`
- **Auth:** header `X-Auth-Token: <token>`. Register a free account at football-data.org to get one. No card required.
- **Free tier limit:** 10 requests/minute. FIFA World Cup is included in the free tier.
- **World Cup competition code:** `WC`

### 4.1 Primary endpoint
```
GET /v4/competitions/WC/matches
```
Returns `{ "matches": [ ... ] }`. One call gives the entire tournament (all rounds), which is all we need. Optionally filter knockout-only with `?stage=LAST_32` etc., but fetching everything in one call is simplest and rate-friendly.

### 4.2 Relevant fields on each match object
```jsonc
{
  "id": 12345,
  "utcDate": "2026-07-01T19:00:00Z",
  "status": "FINISHED",          // see §4.3
  "stage": "LAST_32",            // see §4.4
  "group": null,                 // null for knockout
  "lastUpdated": "2026-07-01T21:05:00Z",
  "homeTeam": { "id": 1, "name": "United States", "shortName": "USA", "tla": "USA", "crest": "https://..." },
  "awayTeam": { "id": 2, "name": "Bosnia and Herzegovina", "shortName": "Bosnia", "tla": "BIH", "crest": "https://..." },
  "score": {
    "winner": "HOME_TEAM",       // HOME_TEAM | AWAY_TEAM | DRAW | null
    "duration": "REGULAR",       // REGULAR | EXTRA_TIME | PENALTY_SHOOTOUT
    "fullTime": { "home": 2, "away": 1 },
    "halfTime": { "home": 1, "away": 0 }
  }
}
```
Use `tla` (3-letter code) and `crest` (flag/badge URL) for compact mobile display. Handle nulls everywhere — early in the bracket, future matches have no teams resolved yet.

### 4.3 `status` values
`SCHEDULED`, `TIMED`, `IN_PLAY`, `PAUSED`, `FINISHED`, `SUSPENDED`, `POSTPONED`, `CANCELLED`, `AWARDED`.
- Treat `IN_PLAY` and `PAUSED` as **live** (live scores section).
- Treat `FINISHED` and `AWARDED` as **decided** (advance the winner in the bracket).
- Everything else is **upcoming**.

### 4.4 `stage` values (knockout)
`GROUP_STAGE`, `LAST_32`, `LAST_16`, `QUARTER_FINALS`, `SEMI_FINALS`, `THIRD_PLACE`, `FINAL`.
Map these to bracket columns: `LAST_32 → Round of 32`, `LAST_16 → Round of 16`, `QUARTER_FINALS → QF`, `SEMI_FINALS → SF`, `FINAL → Final`. `THIRD_PLACE` is a standalone card. Ignore `GROUP_STAGE` for the bracket tree.

### 4.5 Determining the winner / advancing
For a `FINISHED`/`AWARDED` match, `score.winner` gives `HOME_TEAM` or `AWAY_TEAM` (penalties already resolved into this field; `duration` tells you if it went to ET/pens, which you can surface as a small "(pens)" tag). Use the winner to highlight the advancing team and feed the next round's slot in the UI model.

---

## 5. UI / UX

Mobile-first, single screen, no router. On load → bracket renders immediately (from cache/fallback), then the client poll keeps it live.

### 5.1 Page layout (top to bottom on mobile)
1. **Slim header:** "FIFA World Cup 2026" + a subtle live indicator (e.g. a pulsing dot + "LIVE" when any match is `IN_PLAY`, otherwise next-match countdown or date). Keep it short.
2. **Live scores section** (only meaningful when matches are in play) — see §5.3. Place it near the top so live action is the first thing a returning visitor sees during match hours. When nothing is live, collapse it to a one-line "No matches live right now — next: <team> v <team>, <local time>".
3. **Bracket map** — see §5.2. The main attraction; takes the rest of the screen.

### 5.2 Bracket map
- Render the knockout tree as **columns**, one per round: `R32 | R16 | QF | SF | Final`. The champion sits at the end (highlight with a trophy/crown treatment once decided).
- On mobile a full 32-team tree won't fit; make the bracket **horizontally pan/scrollable** with momentum, and add a small **round selector** (tappable chips: R32 / R16 / QF / SF / Final) that scroll-snaps the canvas to that column. This is the key mobile affordance — don't try to cram all rounds on screen at once.
- Each **match node** is a small card with two stacked team rows: `[flag] [TLA/short name] [score]`. 
  - Decided match: winner row emphasized (bold + accent), loser row dimmed; show "(pens)" / "(AET)" tag if `duration` ≠ `REGULAR`.
  - Live match: subtle live pulse on the node + current score.
  - Upcoming match with both teams known: plain, show kickoff time.
  - Unresolved slot (team not determined yet): placeholder ("Winner of M89") — derivable from bracket structure in fallback.json.
- Connector lines between rounds are a nice-to-have; if they complicate the responsive layout, skip them and rely on column grouping + the round selector. Don't let connectors block the build.
- **Third-place playoff:** one separate card below or beside the Final, clearly labelled, not wired into the main tree.
- Reserve a clean visual slot for the **champion**. When the Final is `FINISHED`, surface the winner prominently (the "map filled to completion" payoff the human described).

### 5.2.1 Visual style (match the reference)
The design north star is the **CBS Sports Golazo World Cup 2026 bracket**. Replicate that look:
- **Deep royal-blue board background** with a soft radial glow toward the center-right (behind the Final).
- **Team plates:** white rounded-rectangle pills, each with a country **flag** on the left, team **name** in bold dark text, and a small **yellow/gold square "score tab"** on the right edge of the pill (this tab is where the score sits; keep it visible even when empty as part of the visual rhythm).
- **Winner/advancement boxes** (R16 → Final): white rounded boxes with the same gold score tab, initially empty, filled with the advancing team as results come in.
- **Final:** a distinct box labeled **"FINAL"** with a dark header strip, two stacked slots, positioned at the right beside a **World Cup trophy** graphic. When decided, the champion gets the prominent treatment.
- **Third place:** a small separate box labeled **"3RD PLACE"** at the bottom-right, two slots, not wired into the main tree.
- Flags: use the API `crest` URLs when available; the trophy can be a static asset/SVG.

### 5.2.2 Reconciling this layout with mobile-first
The reference shows the *entire* 32-team tree at once (all teams stacked left, flowing right to a centered Final). That full view is ideal on desktop/tablet but **cannot be legible at ~380px**. So:
- **Mobile (default):** render the same visual style but as the **horizontally scroll-snapping column layout** from §5.2 (R32 → R16 → QF → SF → Final columns + round-selector chips). Same plates, same gold tabs, same blue board — just panned one round at a time instead of all at once.
- **Wider screens (optional, time permitting):** progressively reveal more columns side by side, approaching the full reference board on desktop. Build the component column-first so this is just a matter of how many columns fit.
- The data model (§7) is layout-independent, so this is purely a rendering concern.

> The exact R32 pairings shown in the reference are real and are pre-wired into the shipped `data/fallback.json` (§6) — use that file as the bracket's structural backbone.

### 5.3 Live scores section
- List matches where `status ∈ { IN_PLAY, PAUSED }`.
- Each row: both flags + names + live score + a status pill (e.g. "LIVE" / "HT" for paused at half). 
- Empty state: the collapsed one-liner described in §5.1.

### 5.4 Goal scorers ("who scored") — conditional, must degrade gracefully
The human would like to show who scored each goal and for which team. **Important:** goal-by-goal scorer/event data is generally a paid ("stats") feature on football-data.org and is **likely NOT available on the free tier**. Build the live card so that:
- If the API payload includes goal/scorer detail (check for a `goals`/`scorers` array on the per-match endpoint `/v4/matches/{id}`), render a small scorer list under the live score.
- If it's absent (the expected free-tier case), simply show the scoreline and status with no scorer list, and no error.
The agent should **not** block the build trying to make scorers work. Treat it as progressive enhancement gated on a runtime check of what the token actually returns.

---

## 6. Static fallback snapshot (`data/fallback.json`)

**This file is shipped pre-built — use it as-is.** It holds the full fixed knockout bracket skeleton: the 16 real Round-of-32 pairings (matches `m1`–`m16`), the complete tree wiring via `feedsInto` (R16 `m17`–`m24`, QF `m25`–`m28`, SF `m29`–`m30`, Final `m31`, Third-place `m32`), round labels, and slots. The R32 teams are populated with their real names + 3-letter codes; all later rounds have `null` teams that resolve as results arrive. Purpose:
- Guarantees the bracket renders on first paint and during any upstream outage.
- Gives the bracket its fixed structure so the UI doesn't have to infer the tree from a partial match list.

It already matches the normalized model in §7, so the renderer treats live data and fallback data identically. The normalize step (§7) merges live API results **onto** this skeleton: match by structural position, fill in resolved teams/scores/winners, and leave unresolved future slots as the skeleton's `null` placeholders. `crest` is `null` in the skeleton — real flag URLs come from the live API.

---

## 7. Normalized data model (internal)

Normalize the raw API response into a stable shape the UI consumes. Keep this decoupled from football-data's schema so the source could be swapped later.

```ts
type Round = "R32" | "R16" | "QF" | "SF" | "FINAL" | "THIRD_PLACE";

interface TeamRef {
  name: string;
  short: string;       // tla or shortName
  crest: string | null;
}

interface BracketMatch {
  id: string;
  round: Round;
  slot: number;              // position within the round (for ordering/wiring)
  home: TeamRef | null;      // null if not yet resolved
  away: TeamRef | null;
  homeScore: number | null;
  awayScore: number | null;
  status: "UPCOMING" | "LIVE" | "FINISHED";
  winner: "HOME" | "AWAY" | null;
  decidedBy: "REGULAR" | "AET" | "PENS" | null;
  kickoff: string | null;    // ISO; render in local time client-side
  feedsInto?: string;        // id of the next match this winner advances to
}

interface WorldCupData {
  updatedAt: string;
  anyLive: boolean;
  bracket: BracketMatch[];   // knockout only
  thirdPlace: BracketMatch | null;
  live: BracketMatch[];      // subset where status === "LIVE"
}
```

`/api/worldcup` returns `WorldCupData`. The normalize step maps `stage→round`, `status→status`, `score.winner→winner`, `score.duration→decidedBy`, and merges the live API match list onto the fixed structure from `fallback.json` (so unresolved future slots still appear).

---

## 8. File structure

```
/app
  /api/worldcup/route.ts     # cached upstream fetch + retry + serve-stale + normalize
  layout.tsx
  page.tsx                   # single page: header + LiveScores + Bracket
  globals.css
/components
  Header.tsx
  LiveScores.tsx
  LiveMatchCard.tsx
  Bracket.tsx                # scroll canvas + round selector
  BracketRound.tsx           # one column
  MatchNode.tsx              # one match card
/lib
  footballData.ts            # raw fetch + retry against football-data.org
  normalize.ts               # raw API -> WorldCupData (merged with fallback)
  types.ts                   # the interfaces in §7
  useWorldCup.ts             # client hook: polls /api/worldcup every 30–60s
/data
  fallback.json              # fixed bracket skeleton (§6)
.env.local                   # FOOTBALL_DATA_TOKEN=...
README.md                    # setup + deploy + the cron upgrade note
```

---

## 9. Environment & deployment

- **Env var (one):** `FOOTBALL_DATA_TOKEN` — the football-data.org API token. Set in `.env.local` for dev and in Vercel project settings for prod. It is read only inside the server-side route handler; never exposed to the client, so do **not** prefix it with `NEXT_PUBLIC_`.
- **Deploy:** push to GitHub, import into Vercel, add the env var, deploy. The human will attach a custom domain in Vercel.
- The human's stated job after the build: set the env var and assign a domain. Everything else must work out of the box.

---

## 10. Build checklist (do these in order)

1. Scaffold Next.js (App Router, TS, Tailwind). Read the `frontend-design` skill before styling.
2. Add `lib/types.ts` (§7).
3. Drop in the provided `data/fallback.json` (already wired with the real R32 pairings and full tree — see §6). Do not regenerate it.
4. Implement `lib/footballData.ts`: fetch `WC` matches with `X-Auth-Token`, `revalidate: 60`, retry ×2.
5. Implement `lib/normalize.ts`: map raw → `WorldCupData`, merging onto fallback so future slots render.
6. Implement `/app/api/worldcup/route.ts`: call footballData → normalize → cache warm copy → serve-stale/fallback on failure → always return 200 JSON.
7. Implement `lib/useWorldCup.ts`: client hook polling `/api/worldcup` every 30–60s with try/catch and last-good-state retention.
8. Build `Bracket` + `BracketRound` + `MatchNode` (columns, horizontal scroll-snap, round-selector chips, winner/live/upcoming states, pens/AET tags, champion highlight).
9. Build `LiveScores` + `LiveMatchCard` (live subset; scorer list only if present in payload; graceful empty state).
10. Assemble `page.tsx`: Header → LiveScores → Bracket. Mobile-first; verify at ~380px.
11. Write `README.md` (token setup, `npm run dev`, Vercel deploy, optional Vercel-Cron freshness upgrade).
12. Sanity pass: no token in client bundle; site renders with API unreachable (fallback); poll updates UI without full reload.

---

## 11. Out of scope (don't build)
- Auth, accounts, user state.
- A database or external cache (KV/Redis) — the data-cache revalidation covers v1.
- Group-stage tables as a full feature (optional collapsed strip only, time permitting).
- Historical / past-tournament data.
- Server-pushed realtime (WebSockets/SSE) — polling is sufficient and simpler.
