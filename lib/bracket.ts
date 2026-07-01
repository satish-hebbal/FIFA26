import type { BracketMatch, Round, WorldCupData } from "./types";

export interface RoundMeta {
  key: Exclude<Round, "THIRD_PLACE">;
  label: string; // full label for column header
  chip: string; // short label for the round-selector chip
}

// Main tree columns, left → right. THIRD_PLACE is intentionally excluded
// (rendered as a standalone card, not part of the tree).
export const ROUNDS: RoundMeta[] = [
  { key: "R32", label: "Round of 32", chip: "R32" },
  { key: "R16", label: "Round of 16", chip: "R16" },
  { key: "QF", label: "Quarter-finals", chip: "QF" },
  { key: "SF", label: "Semi-finals", chip: "SF" },
  { key: "FINAL", label: "Final", chip: "Final" },
];

/**
 * Build a placeholder label ("Winner M1") for an unresolved slot, derived from
 * the bracket wiring (which feeder matches advance into this match).
 */
export function buildPlaceholders(
  bracket: BracketMatch[]
): Map<string, { home: string | null; away: string | null }> {
  const feeders = new Map<string, BracketMatch[]>();
  for (const m of bracket) {
    if (!m.feedsInto) continue;
    const arr = feeders.get(m.feedsInto) ?? [];
    arr.push(m);
    feeders.set(m.feedsInto, arr);
  }

  const result = new Map<string, { home: string | null; away: string | null }>();
  for (const [targetId, arr] of feeders) {
    const ordered = arr.slice().sort((a, b) => a.slot - b.slot);
    const labelFor = (m?: BracketMatch) =>
      m ? `Winner ${m.id.toUpperCase()}` : null;
    result.set(targetId, {
      home: labelFor(ordered[0]),
      away: labelFor(ordered[1]),
    });
  }
  return result;
}

/** Short tag for how a match was decided, e.g. "3-4 pens" or "AET". */
export function decidedTag(match: BracketMatch): string | null {
  if (match.decidedBy === "PENS") {
    if (match.penHome != null && match.penAway != null) {
      return `${match.penHome}-${match.penAway} pens`;
    }
    return "pens";
  }
  if (match.decidedBy === "AET") return "AET";
  return null;
}

/** Soonest upcoming match with a known kickoff (used for the header countdown). */
// Upcoming matches (those with a kickoff), soonest first. `limit` caps the list
// for the header carousel; omit it to get all of them.
export function upcomingMatches(
  data: WorldCupData,
  limit?: number
): BracketMatch[] {
  const all = [...data.bracket, ...(data.thirdPlace ? [data.thirdPlace] : [])];
  const upcoming = all
    .filter((m) => m.status === "UPCOMING" && m.kickoff)
    .sort(
      (a, b) => new Date(a.kickoff!).getTime() - new Date(b.kickoff!).getTime()
    );
  return limit ? upcoming.slice(0, limit) : upcoming;
}

export function nextUpcomingMatch(data: WorldCupData): BracketMatch | null {
  return upcomingMatches(data, 1)[0] ?? null;
}
