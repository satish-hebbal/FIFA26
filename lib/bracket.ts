import type { BracketMatch, Round } from "./types";

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

export function decidedTag(decidedBy: BracketMatch["decidedBy"]): string | null {
  if (decidedBy === "PENS") return "pens";
  if (decidedBy === "AET") return "AET";
  return null;
}
