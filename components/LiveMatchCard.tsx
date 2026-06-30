import type { BracketMatch, TeamRef } from "@/lib/types";

function TeamRow({
  team,
  score,
  won,
}: {
  team: TeamRef | null;
  score: number | null;
  won: boolean;
}) {
  return (
    <div className="flex items-center gap-2">
      {team?.crest ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={team.crest}
          alt=""
          width={22}
          height={22}
          className="h-[22px] w-auto rounded-[5px] object-contain"
          loading="lazy"
        />
      ) : (
        <span className="flex h-[22px] w-[22px] items-center justify-center rounded-[5px] bg-white/10 text-[9px] font-bold text-white/70">
          {team?.short?.slice(0, 3) ?? "—"}
        </span>
      )}
      <span
        className={[
          "min-w-0 flex-1 truncate text-sm",
          won ? "font-extrabold text-white" : "font-semibold text-white/85",
        ].join(" ")}
      >
        {team?.name ?? team?.short ?? "—"}
      </span>
      <span className="text-base font-extrabold tabular-nums text-white">
        {score ?? "—"}
      </span>
    </div>
  );
}

export default function LiveMatchCard({ match }: { match: BracketMatch }) {
  // PAUSED maps to LIVE in our model; we surface a generic "LIVE" pill.
  const homeScorers = match.scorers?.filter((s) => s.team === "HOME") ?? [];
  const awayScorers = match.scorers?.filter((s) => s.team === "AWAY") ?? [];
  const hasScorers = (match.scorers?.length ?? 0) > 0;

  return (
    <div className="rounded-xl border border-accent/30 bg-board-900/40 p-3 ring-1 ring-accent/20">
      <div className="mb-2 flex items-center justify-between">
        <span className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wide text-accent">
          <span className="live-dot h-2 w-2 rounded-full bg-accent" />
          Live
        </span>
        {match.decidedBy && match.decidedBy !== "REGULAR" && (
          <span className="text-[10px] font-bold uppercase tracking-wide text-white/50">
            {match.decidedBy === "PENS" ? "Penalties" : "Extra time"}
          </span>
        )}
      </div>

      <div className="flex flex-col gap-1.5">
        <TeamRow
          team={match.home}
          score={match.homeScore}
          won={match.winner === "HOME"}
        />
        <TeamRow
          team={match.away}
          score={match.awayScore}
          won={match.winner === "AWAY"}
        />
      </div>

      {/* Scorers only if the payload provided them (free tier: omitted, no error) */}
      {hasScorers && (
        <div className="mt-2 grid grid-cols-2 gap-x-3 border-t border-white/10 pt-2 text-[11px] text-white/65">
          <ul className="space-y-0.5">
            {homeScorers.map((s, i) => (
              <li key={i} className="truncate">
                ⚽ {s.player}
                {s.minute != null ? ` ${s.minute}'` : ""}
              </li>
            ))}
          </ul>
          <ul className="space-y-0.5 text-right">
            {awayScorers.map((s, i) => (
              <li key={i} className="truncate">
                {s.minute != null ? `${s.minute}' ` : ""}
                {s.player} ⚽
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
