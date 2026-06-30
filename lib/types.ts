// Normalized internal data model (PROJECT_SPEC §7).
// Kept decoupled from football-data.org's schema so the source could be swapped.

export type Round = "R32" | "R16" | "QF" | "SF" | "FINAL" | "THIRD_PLACE";

export interface TeamRef {
  name: string;
  short: string; // tla or shortName
  crest: string | null;
}

export interface BracketMatch {
  id: string;
  round: Round;
  slot: number; // position within the round (for ordering/wiring)
  home: TeamRef | null; // null if not yet resolved
  away: TeamRef | null;
  homeScore: number | null; // headline score (for pens, the level score before the shootout)
  awayScore: number | null;
  penHome?: number | null; // shootout score, when decidedBy === "PENS"
  penAway?: number | null;
  status: "UPCOMING" | "LIVE" | "FINISHED";
  paused?: boolean; // raw PAUSED (i.e. half-time) — only meaningful when LIVE
  winner: "HOME" | "AWAY" | null;
  decidedBy: "REGULAR" | "AET" | "PENS" | null;
  kickoff: string | null; // ISO; render in local time client-side
  feedsInto?: string; // id of the next match this winner advances to
  // Progressive enhancement (PROJECT_SPEC §5.4): goal scorers, populated only
  // if the token's tier exposes them. Absent on the free tier — render nothing.
  scorers?: GoalScorer[];
}

export interface GoalScorer {
  player: string;
  team: "HOME" | "AWAY";
  minute?: number | null;
}

export interface WorldCupData {
  updatedAt: string;
  anyLive: boolean;
  bracket: BracketMatch[]; // knockout only
  thirdPlace: BracketMatch | null;
  live: BracketMatch[]; // subset where status === "LIVE"
}

// ---- Raw football-data.org v4 shapes (only the fields we read) ----

export interface RawTeam {
  id: number | null;
  name: string | null;
  shortName: string | null;
  tla: string | null;
  crest: string | null;
}

interface ScoreLine {
  home: number | null;
  away: number | null;
}

export interface RawScore {
  winner: "HOME_TEAM" | "AWAY_TEAM" | "DRAW" | null;
  duration: "REGULAR" | "EXTRA_TIME" | "PENALTY_SHOOTOUT" | null;
  fullTime: ScoreLine;
  halfTime: ScoreLine;
  regularTime?: ScoreLine; // present when a match went to ET/pens
  extraTime?: ScoreLine;
  penalties?: ScoreLine; // shootout result
}

export type RawStage =
  | "GROUP_STAGE"
  | "LAST_32"
  | "LAST_16"
  | "QUARTER_FINALS"
  | "SEMI_FINALS"
  | "THIRD_PLACE"
  | "FINAL";

export type RawStatus =
  | "SCHEDULED"
  | "TIMED"
  | "IN_PLAY"
  | "PAUSED"
  | "FINISHED"
  | "SUSPENDED"
  | "POSTPONED"
  | "CANCELLED"
  | "AWARDED";

export interface RawMatch {
  id: number;
  utcDate: string;
  status: RawStatus;
  stage: RawStage;
  group: string | null;
  lastUpdated: string;
  homeTeam: RawTeam;
  awayTeam: RawTeam;
  score: RawScore;
}

export interface RawMatchesResponse {
  matches: RawMatch[];
}
