import type { BracketMatch, TeamRef } from "@/lib/types";
import { decidedTag } from "@/lib/bracket";

function Flag({ team }: { team: TeamRef | null }) {
  if (team?.crest) {
    // Plain <img>: crests are small SVG/PNG badges from football-data.org.
    // eslint-disable-next-line @next/next/no-img-element
    return (
      <img
        src={team.crest}
        alt=""
        width={20}
        height={20}
        className="h-5 w-5 shrink-0 rounded-[3px] object-contain"
        loading="lazy"
      />
    );
  }
  return (
    <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-[3px] bg-board-700/15 text-[9px] font-bold text-board-700/70">
      {team?.short?.slice(0, 3) ?? "—"}
    </span>
  );
}

function TeamPlate({
  team,
  placeholder,
  score,
  emphasis,
  dim,
}: {
  team: TeamRef | null;
  placeholder: string | null;
  score: number | null;
  emphasis: boolean;
  dim: boolean;
}) {
  const name = team?.name ?? team?.short ?? placeholder ?? "—";
  return (
    <div
      className={[
        "flex items-stretch gap-0 overflow-hidden",
        dim ? "opacity-55" : "",
      ].join(" ")}
    >
      <div className="flex min-w-0 flex-1 items-center gap-2 px-2 py-1.5">
        <Flag team={team} />
        <span
          className={[
            "min-w-0 truncate text-[13px] leading-tight",
            team ? "text-plate-ink" : "italic text-plate-ink/45",
            emphasis ? "font-extrabold" : "font-semibold",
          ].join(" ")}
        >
          {name}
        </span>
      </div>
      {/* Gold score tab — always present for visual rhythm, even when empty */}
      <div
        className={[
          "flex w-8 shrink-0 items-center justify-center text-[13px] font-extrabold",
          emphasis
            ? "bg-gold-400 text-plate-ink"
            : "bg-gold-400/80 text-plate-ink/80",
        ].join(" ")}
      >
        {score ?? ""}
      </div>
    </div>
  );
}

function PenaltyDots({
  scored,
  total,
  won,
}: {
  scored: number;
  total: number;
  won: boolean;
}) {
  return (
    <span className="flex items-center gap-[3px]">
      {Array.from({ length: total }).map((_, i) => (
        <span
          key={i}
          className={[
            "h-[7px] w-[7px] rounded-full",
            i < scored
              ? won
                ? "bg-accent"
                : "bg-plate-ink/45"
              : "border border-plate-ink/25",
          ].join(" ")}
        />
      ))}
    </span>
  );
}

function PenaltyShootout({
  homeTla,
  awayTla,
  homePens,
  awayPens,
  homeWon,
}: {
  homeTla: string;
  awayTla: string;
  homePens: number;
  awayPens: number;
  homeWon: boolean;
}) {
  // Best-of-five baseline; extend for sudden death.
  const total = Math.max(5, homePens, awayPens);
  const rows = [
    { tla: homeTla, pens: homePens, won: homeWon },
    { tla: awayTla, pens: awayPens, won: !homeWon },
  ];
  return (
    <div className="bg-board-900/[0.05] px-2 py-1.5">
      <div className="mb-1 text-[8px] font-bold uppercase tracking-[0.15em] text-plate-ink/45">
        Penalty shootout
      </div>
      <div className="flex flex-col gap-1">
        {rows.map((r) => (
          <div key={r.tla} className="flex items-center gap-2">
            <span
              className={[
                "w-8 text-[10px] font-bold",
                r.won ? "text-plate-ink" : "text-plate-ink/55",
              ].join(" ")}
            >
              {r.tla}
            </span>
            <PenaltyDots scored={r.pens} total={total} won={r.won} />
            <span
              className={[
                "ml-auto text-[11px] font-extrabold tabular-nums",
                r.won ? "text-plate-ink" : "text-plate-ink/55",
              ].join(" ")}
            >
              {r.pens}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

export default function MatchNode({
  match,
  placeholders,
}: {
  match: BracketMatch;
  placeholders?: { home: string | null; away: string | null };
}) {
  const live = match.status === "LIVE";
  const finished = match.status === "FINISHED";
  const homeWon = finished && match.winner === "HOME";
  const awayWon = finished && match.winner === "AWAY";
  const pens =
    match.decidedBy === "PENS" &&
    match.penHome != null &&
    match.penAway != null;
  // For pens we show the dot visualization instead of a text tag.
  const tag = pens ? null : decidedTag(match);

  const kickoff =
    match.status === "UPCOMING" && match.kickoff
      ? new Date(match.kickoff)
      : null;

  return (
    <div
      data-match-id={match.id}
      className={[
        "w-[200px] overflow-hidden rounded-xl bg-plate shadow-md ring-1",
        live
          ? "ring-2 ring-accent live-dot"
          : "ring-black/5",
      ].join(" ")}
    >
      <TeamPlate
        team={match.home}
        placeholder={placeholders?.home ?? null}
        score={match.homeScore}
        emphasis={homeWon}
        dim={awayWon}
      />
      <div data-divider className="h-px bg-board-900/10" />
      <TeamPlate
        team={match.away}
        placeholder={placeholders?.away ?? null}
        score={match.awayScore}
        emphasis={awayWon}
        dim={homeWon}
      />

      {pens && (
        <PenaltyShootout
          homeTla={match.home?.short ?? "—"}
          awayTla={match.away?.short ?? "—"}
          homePens={match.penHome!}
          awayPens={match.penAway!}
          homeWon={homeWon}
        />
      )}

      {!pens && (live || tag || kickoff) && (
        <div className="flex items-center justify-between bg-board-900/[0.04] px-2 py-1">
          {live ? (
            <span className="flex items-center gap-1 text-[10px] font-bold uppercase tracking-wide text-accent">
              <span className="h-1.5 w-1.5 rounded-full bg-accent" />
              {match.status === "LIVE" ? "Live" : ""}
            </span>
          ) : kickoff ? (
            <span
              className="text-[10px] font-medium text-plate-ink/55"
              suppressHydrationWarning
            >
              {kickoff.toLocaleDateString(undefined, {
                month: "short",
                day: "numeric",
              })}{" "}
              ·{" "}
              {kickoff.toLocaleTimeString(undefined, {
                hour: "numeric",
                minute: "2-digit",
              })}
            </span>
          ) : (
            <span />
          )}
          {tag && (
            <span className="rounded bg-board-900/10 px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wide text-plate-ink/60">
              {tag}
            </span>
          )}
        </div>
      )}
    </div>
  );
}
