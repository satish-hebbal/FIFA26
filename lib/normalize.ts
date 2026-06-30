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

/** Stable key for matching an R32 pairing regardless of home/away orientation. */
function teamPairKey(a: string | null, b: string | null): string {
  return [a, b]
    .map((s) => (s ?? "").toUpperCase().trim())
    .sort()
    .join("|");
}

function deepCloneMatch(m: BracketMatch): BracketMatch {
  return {
    ...m,
    home: m.home ? { ...m.home } : null,
    away: m.away ? { ...m.away } : null,
  };
}

/** Apply a raw API match's live state onto a skeleton match, in place. */
function applyRaw(target: BracketMatch, raw: RawMatch): void {
  const apiHome = toTeamRef(raw.homeTeam);
  const apiAway = toTeamRef(raw.awayTeam);
  if (apiHome) target.home = apiHome;
  if (apiAway) target.away = apiAway;

  target.status = mapStatus(raw.status);
  target.kickoff = raw.utcDate ?? target.kickoff;

  const ft = raw.score?.fullTime;
  target.homeScore = ft?.home ?? null;
  target.awayScore = ft?.away ?? null;

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
 * Merge live API results onto the fixed bracket skeleton.
 *
 * - R32 matches are matched by team pair (skeleton ships real pairings).
 * - Deeper rounds are matched positionally (by slot order within the round),
 *   since their teams are unknown until results arrive.
 * - After merging, winners are propagated into the next round's empty slots so
 *   the tree visibly "fills up" even before the API publishes those fixtures.
 */
export function normalize(raw: RawMatchesResponse): WorldCupData {
  const bracket = FALLBACK.bracket.map(deepCloneMatch);
  const thirdPlace = FALLBACK.thirdPlace
    ? deepCloneMatch(FALLBACK.thirdPlace)
    : null;

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

  // --- R32: match by team pair ---
  const r32Raw = rawByRound.get("R32") ?? [];
  const r32ByPair = new Map<string, RawMatch>();
  for (const m of r32Raw) {
    const key = teamPairKey(
      m.homeTeam?.tla || m.homeTeam?.name || null,
      m.awayTeam?.tla || m.awayTeam?.name || null
    );
    r32ByPair.set(key, m);
  }
  for (const sk of bracket) {
    if (sk.round !== "R32") continue;
    const key = teamPairKey(sk.home?.short ?? null, sk.away?.short ?? null);
    const match = r32ByPair.get(key);
    if (match) applyRaw(sk, match);
  }

  // --- R16 / QF / SF / FINAL: positional match by slot order ---
  const positionalRounds: Round[] = ["R16", "QF", "SF", "FINAL"];
  for (const round of positionalRounds) {
    const skeletons = bracket
      .filter((m) => m.round === round)
      .sort((a, b) => a.slot - b.slot);
    const raws = (rawByRound.get(round) ?? [])
      .slice()
      .sort(
        (a, b) =>
          new Date(a.utcDate).getTime() - new Date(b.utcDate).getTime() ||
          a.id - b.id
      );
    skeletons.forEach((sk, i) => {
      const r = raws[i];
      if (r) applyRaw(sk, r);
    });
  }

  // --- Third place ---
  if (thirdPlace && thirdPlaceRaw) applyRaw(thirdPlace, thirdPlaceRaw);

  // --- Propagate winners into next-round empty slots ---
  const byId = new Map<string, BracketMatch>();
  for (const m of bracket) byId.set(m.id, m);

  // Determine which feeder is "home" vs "away" of its target: lower slot → home.
  const feedersByTarget = new Map<string, BracketMatch[]>();
  for (const m of bracket) {
    if (!m.feedsInto) continue;
    const arr = feedersByTarget.get(m.feedsInto) ?? [];
    arr.push(m);
    feedersByTarget.set(m.feedsInto, arr);
  }

  for (const [targetId, feeders] of feedersByTarget) {
    const target = byId.get(targetId);
    if (!target) continue;
    const ordered = feeders.slice().sort((a, b) => a.slot - b.slot);
    const [low, high] = ordered;
    // Only fill slots the API hasn't already resolved.
    if (low && target.home === null) target.home = winningTeam(low);
    if (high && target.away === null) target.away = winningTeam(high);
  }

  // Third-place: losers of the two semi-finals (per skeleton _meta wiring).
  if (thirdPlace) {
    const feedsLosersInto =
      (FALLBACK as unknown as {
        _meta?: { feedsLosersInto?: Record<string, string> };
      })._meta?.feedsLosersInto ?? {};
    const semiFeeders = Object.entries(feedsLosersInto)
      .filter(([, dest]) => dest === thirdPlace.id)
      .map(([src]) => byId.get(src))
      .filter((m): m is BracketMatch => Boolean(m))
      .sort((a, b) => a.slot - b.slot);
    if (semiFeeders[0] && thirdPlace.home === null)
      thirdPlace.home = losingTeam(semiFeeders[0]);
    if (semiFeeders[1] && thirdPlace.away === null)
      thirdPlace.away = losingTeam(semiFeeders[1]);
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
