import fallbackData from "@/data/fallback.json";
import type {
  BracketMatch,
  RawMatch,
  RawMatchesResponse,
  RawStage,
  RawTeam,
  Round,
  TeamRef,
  WorldCupData,
} from "./types";

// The committed skeleton, typed. Treated as read-only; we deep-clone per call.
const FALLBACK = fallbackData as unknown as WorldCupData & {
  bracket: BracketMatch[];
  thirdPlace: BracketMatch | null;
  _meta?: { feedsLosersInto?: Record<string, string> };
};

const STAGE_TO_ROUND: Record<RawStage, Round | null> = {
  GROUP_STAGE: null,
  LAST_32: "R32",
  LAST_16: "R16",
  QUARTER_FINALS: "QF",
  SEMI_FINALS: "SF",
  THIRD_PLACE: "THIRD_PLACE",
  FINAL: "FINAL",
};

// Process order so winners from one round become hints for the next.
const ROUND_ORDER: Exclude<Round, "THIRD_PLACE">[] = [
  "R32",
  "R16",
  "QF",
  "SF",
  "FINAL",
];

function mapStatus(raw: RawMatch["status"]): BracketMatch["status"] {
  if (raw === "IN_PLAY" || raw === "PAUSED") return "LIVE";
  if (raw === "FINISHED" || raw === "AWARDED") return "FINISHED";
  return "UPCOMING";
}

function mapDecidedBy(
  duration: RawMatch["score"]["duration"]
): BracketMatch["decidedBy"] {
  switch (duration) {
    case "EXTRA_TIME":
      return "AET";
    case "PENALTY_SHOOTOUT":
      return "PENS";
    case "REGULAR":
      return "REGULAR";
    default:
      return null;
  }
}

function toTeamRef(raw: RawTeam | null | undefined): TeamRef | null {
  if (!raw || !raw.name) return null;
  return {
    name: raw.name,
    short: raw.tla || raw.shortName || raw.name,
    crest: raw.crest ?? null,
  };
}

function teamShort(t: TeamRef | null): string | null {
  return t ? (t.short || "").toUpperCase().trim() || null : null;
}

function rawShort(t: RawTeam | null | undefined): string | null {
  if (!t) return null;
  return (t.tla || t.shortName || t.name || "").toUpperCase().trim() || null;
}

function pairKey(a: string | null, b: string | null): string {
  return [a, b].map((s) => s ?? "").sort().join("|");
}

function deepCloneMatch(m: BracketMatch): BracketMatch {
  return {
    ...m,
    home: m.home ? { ...m.home } : null,
    away: m.away ? { ...m.away } : null,
  };
}

/**
 * Apply a raw API match onto a skeleton match. API teams are authoritative and
 * overwrite any propagated hints; a side the API leaves unresolved keeps its
 * propagated hint. Guards against the same team landing in both slots if the
 * API's home/away orientation differs from the propagated one.
 */
function applyRaw(target: BracketMatch, raw: RawMatch): void {
  const h = toTeamRef(raw.homeTeam);
  const a = toTeamRef(raw.awayTeam);

  if (h) {
    if (teamShort(target.away) === teamShort(h)) target.away = null;
    target.home = h;
  }
  if (a) {
    if (teamShort(target.home) === teamShort(a)) target.home = null;
    target.away = a;
  }

  target.status = mapStatus(raw.status);
  target.kickoff = raw.utcDate ?? target.kickoff;

  // Headline score. football-data folds the shootout into fullTime (e.g. a
  // 1-1 that ends 3-4 on pens reports fullTime 4-5). For shootouts we instead
  // show the level score at the end of play and surface the pens separately.
  const sc = raw.score;
  if (sc?.duration === "PENALTY_SHOOTOUT") {
    const reg = sc.regularTime;
    const et = sc.extraTime;
    target.homeScore = (reg?.home ?? 0) + (et?.home ?? 0);
    target.awayScore = (reg?.away ?? 0) + (et?.away ?? 0);
    target.penHome = sc.penalties?.home ?? null;
    target.penAway = sc.penalties?.away ?? null;
  } else {
    target.homeScore = sc?.fullTime?.home ?? null;
    target.awayScore = sc?.fullTime?.away ?? null;
    target.penHome = null;
    target.penAway = null;
  }

  if (target.status === "FINISHED") {
    if (raw.score?.winner === "HOME_TEAM") target.winner = "HOME";
    else if (raw.score?.winner === "AWAY_TEAM") target.winner = "AWAY";
    else target.winner = null;
    target.decidedBy = mapDecidedBy(raw.score?.duration);
  } else {
    target.winner = null;
    target.decidedBy = null;
  }
}

function winningTeam(m: BracketMatch): TeamRef | null {
  if (m.winner === "HOME") return m.home;
  if (m.winner === "AWAY") return m.away;
  return null;
}

function losingTeam(m: BracketMatch): TeamRef | null {
  if (m.winner === "HOME") return m.away;
  if (m.winner === "AWAY") return m.home;
  return null;
}

/**
 * Match the API matches of one round to the round's skeleton slots, then apply
 * scores/results. Matching is by team identity (robust against API ordering):
 *   1. both teams known → exact pair match
 *   2. one team known   → single-team match
 *   3. leftovers        → positional (by kickoff) — only hits all-unknown slots
 */
function matchRound(skeletons: BracketMatch[], raws: RawMatch[]): void {
  const pool = raws.slice();
  const matched = new Set<string>();

  const take = (pred: (r: RawMatch) => boolean): RawMatch | null => {
    const i = pool.findIndex(pred);
    if (i >= 0) return pool.splice(i, 1)[0];
    return null;
  };

  // Pass 1: both teams known → pair match
  for (const sk of skeletons) {
    if (sk.home && sk.away) {
      const key = pairKey(teamShort(sk.home), teamShort(sk.away));
      const r = take(
        (x) => pairKey(rawShort(x.homeTeam), rawShort(x.awayTeam)) === key
      );
      if (r) {
        applyRaw(sk, r);
        matched.add(sk.id);
      }
    }
  }

  // Pass 2: one team known → single-team match
  for (const sk of skeletons) {
    if (matched.has(sk.id)) continue;
    const known = teamShort(sk.home) ?? teamShort(sk.away);
    if (known) {
      const r = take(
        (x) => rawShort(x.homeTeam) === known || rawShort(x.awayTeam) === known
      );
      if (r) {
        applyRaw(sk, r);
        matched.add(sk.id);
      }
    }
  }

  // Pass 3: positional fallback for the remainder (all-unknown slots)
  const remSk = skeletons
    .filter((s) => !matched.has(s.id))
    .sort((a, b) => a.slot - b.slot);
  const remRaw = pool
    .slice()
    .sort(
      (a, b) =>
        new Date(a.utcDate).getTime() - new Date(b.utcDate).getTime() ||
        a.id - b.id
    );
  remSk.forEach((sk, i) => {
    if (remRaw[i]) applyRaw(sk, remRaw[i]);
  });
}

/**
 * Normalize the raw API response into our model, merged onto the fixed bracket.
 * Rounds are processed in order; each round's winners are propagated into the
 * next round's empty slots (so the tree fills up and later rounds can be matched
 * by team identity even before the API publishes their fixtures).
 */
export function normalize(raw: RawMatchesResponse): WorldCupData {
  const bracket = FALLBACK.bracket.map(deepCloneMatch);
  const thirdPlace = FALLBACK.thirdPlace
    ? deepCloneMatch(FALLBACK.thirdPlace)
    : null;

  const byId = new Map<string, BracketMatch>();
  for (const m of bracket) byId.set(m.id, m);

  // Reverse wiring: target match → its feeder matches (lower slot = home side).
  const feedersByTarget = new Map<string, BracketMatch[]>();
  for (const m of bracket) {
    if (!m.feedsInto) continue;
    const arr = feedersByTarget.get(m.feedsInto) ?? [];
    arr.push(m);
    feedersByTarget.set(m.feedsInto, arr);
  }

  const propagateAll = () => {
    for (const [targetId, feeders] of feedersByTarget) {
      const target = byId.get(targetId);
      if (!target) continue;
      const [low, high] = feeders.slice().sort((a, b) => a.slot - b.slot);
      if (low && target.home === null) target.home = winningTeam(low);
      if (high && target.away === null) target.away = winningTeam(high);
    }
  };

  // Bucket raw knockout matches by mapped round.
  const rawByRound = new Map<Round, RawMatch[]>();
  let thirdPlaceRaw: RawMatch | null = null;
  for (const m of raw.matches) {
    const round = STAGE_TO_ROUND[m.stage];
    if (!round) continue;
    if (round === "THIRD_PLACE") {
      thirdPlaceRaw = m;
      continue;
    }
    const list = rawByRound.get(round) ?? [];
    list.push(m);
    rawByRound.set(round, list);
  }

  // Process each round: propagate hints from prior rounds, then match the API.
  for (const round of ROUND_ORDER) {
    propagateAll();
    const skeletons = bracket
      .filter((m) => m.round === round)
      .sort((a, b) => a.slot - b.slot);
    matchRound(skeletons, rawByRound.get(round) ?? []);
  }
  propagateAll(); // push the final round's resolved teams through

  // Third place: hint from the two semi-final losers, then apply the API match.
  if (thirdPlace) {
    const feedsLosersInto = FALLBACK._meta?.feedsLosersInto ?? {};
    const semiFeeders = Object.entries(feedsLosersInto)
      .filter(([, dest]) => dest === thirdPlace.id)
      .map(([src]) => byId.get(src))
      .filter((m): m is BracketMatch => Boolean(m))
      .sort((a, b) => a.slot - b.slot);
    if (semiFeeders[0] && thirdPlace.home === null)
      thirdPlace.home = losingTeam(semiFeeders[0]);
    if (semiFeeders[1] && thirdPlace.away === null)
      thirdPlace.away = losingTeam(semiFeeders[1]);
    if (thirdPlaceRaw) applyRaw(thirdPlace, thirdPlaceRaw);
  }

  const live = bracket.filter((m) => m.status === "LIVE");
  if (thirdPlace?.status === "LIVE") live.push(thirdPlace);

  return {
    updatedAt: new Date().toISOString(),
    anyLive: live.length > 0,
    bracket,
    thirdPlace,
    live,
  };
}

/** The static skeleton as a valid WorldCupData (cold-start / total-outage path). */
export function fallbackWorldCup(): WorldCupData {
  const bracket = FALLBACK.bracket.map(deepCloneMatch);
  const thirdPlace = FALLBACK.thirdPlace
    ? deepCloneMatch(FALLBACK.thirdPlace)
    : null;
  return {
    updatedAt: new Date().toISOString(),
    anyLive: false,
    bracket,
    thirdPlace,
    live: [],
  };
}
