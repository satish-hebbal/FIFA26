import type { BracketMatch, TeamRef } from "@/lib/types";
import { decidedTag } from "@/lib/bracket";
import ClientDate from "./ClientDate";

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
        className="h-5 w-7 shrink-0 rounded-[5px] object-cover"
        loading="lazy"
      />
    );
  }
  return (
    <span className="flex h-5 w-7 shrink-0 items-center justify-center rounded-[5px] bg-board-700/15 text-[9px] font-bold text-board-700/70">
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
      {Array.from({ length: total }).map((_, i) =>
        i < scored ? (
          <span
            key={i}
            aria-hidden="true"
            className={[
              "h-[11px] w-[11px] rounded-full bg-contain bg-center bg-no-repeat",
              won ? "" : "opacity-55 grayscale",
            ].join(" ")}
            style={{ backgroundImage: "url(/ball.png)" }}
          />
        ) : (
          <span
            key={i}
            aria-hidden="true"
            className="h-[11px] w-[11px] rounded-full border border-plate-ink/25"
          />
        )
      )}
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

function shortPlaceholder(p: string | null): string {
  // "Winner M9" -> "M9"
  return p ? p.replace(/^Winner\s+/i, "") : "·";
}

function CompactRow({
  team,
  placeholder,
  score,
  won,
  dim,
}: {
  team: TeamRef | null;
  placeholder: string | null;
  score: number | null;
  won: boolean;
  dim: boolean;
}) {
  return (
    <div className={["flex items-center gap-1 px-1.5 py-1", dim ? "opacity-55" : ""].join(" ")}>
      {team?.crest ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={team.crest}
          alt=""
          width={12}
          height={12}
          className="h-3 w-4 shrink-0 rounded-[3px] object-cover"
          loading="lazy"
        />
      ) : (
        <span className="h-3 w-4 shrink-0 rounded-[3px] bg-board-700/15" />
      )}
      <span
        className={[
          "min-w-0 flex-1 truncate text-[10px] leading-tight",
          team ? "text-plate-ink" : "italic text-plate-ink/45",
          won ? "font-extrabold" : "font-semibold",
        ].join(" ")}
      >
        {team?.short ?? shortPlaceholder(placeholder)}
      </span>
      <span
        className={[
          "shrink-0 text-[10px] font-extrabold tabular-nums",
          won ? "text-plate-ink" : "text-plate-ink/70",
        ].join(" ")}
      >
        {score ?? ""}
      </span>
    </div>
  );
}

function CompactNode({
  match,
  placeholders,
  live,
  homeWon,
  awayWon,
  gold,
}: {
  match: BracketMatch;
  placeholders?: { home: string | null; away: string | null };
  live: boolean;
  homeWon: boolean;
  awayWon: boolean;
  gold: boolean;
}) {
  return (
    <div
      data-match-id={match.id}
      className={[
        "w-full overflow-hidden rounded-md ring-1",
        gold
          ? "bg-[linear-gradient(160deg,#fffdf5,#ffe7a8)]"
          : "bg-plate",
        live
          ? "ring-2 ring-accent live-card"
          : gold
          ? "ring-gold-400"
          : "ring-black/5",
      ].join(" ")}
    >
      <CompactRow
        team={match.home}
        placeholder={placeholders?.home ?? null}
        score={match.homeScore}
        won={homeWon}
        dim={awayWon}
      />
      <div
        data-divider
        className={["h-px", gold ? "bg-gold-600/25" : "bg-board-900/10"].join(" ")}
      />
      <CompactRow
        team={match.away}
        placeholder={placeholders?.away ?? null}
        score={match.awayScore}
        won={awayWon}
        dim={homeWon}
      />
    </div>
  );
}

export default function MatchNode({
  match,
  placeholders,
  compact = false,
}: {
  match: BracketMatch;
  placeholders?: { home: string | null; away: string | null };
  compact?: boolean;
}) {
  const live = match.status === "LIVE";
  const finished = match.status === "FINISHED";
  const homeWon = finished && match.winner === "HOME";
  const awayWon = finished && match.winner === "AWAY";
  // The Final gets a golden theme to set it apart.
  const gold = match.round === "FINAL";

  if (compact) {
    return (
      <CompactNode
        match={match}
        placeholders={placeholders}
        live={live}
        homeWon={homeWon}
        awayWon={awayWon}
        gold={gold}
      />
    );
  }

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
        "w-[200px] overflow-hidden rounded-xl shadow-md ring-1",
        gold
          ? "bg-[linear-gradient(160deg,#fffdf5,#ffe7a8)] shadow-[0_4px_18px_rgba(255,200,40,0.35)]"
          : "bg-plate",
        live
          ? "ring-2 ring-accent live-card"
          : gold
          ? "ring-gold-400"
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
      <div
        data-divider
        className={["h-px", gold ? "bg-gold-600/25" : "bg-board-900/10"].join(" ")}
      />
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
            <span className="flex items-center gap-1 rounded-full bg-accent/15 px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wide text-accent">
              <span className="live-dot h-1.5 w-1.5 rounded-full bg-accent" />
              Live
            </span>
          ) : kickoff ? (
            <ClientDate
              iso={match.kickoff!}
              className="text-[10px] font-medium text-plate-ink/55"
            >
              {(d) => (
                <>
                  {d.toLocaleDateString(undefined, {
                    month: "short",
                    day: "numeric",
                  })}{" "}
                  ·{" "}
                  {d.toLocaleTimeString(undefined, {
                    hour: "numeric",
                    minute: "2-digit",
                  })}
                </>
              )}
            </ClientDate>
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
