import type { BracketMatch, TeamRef } from "@/lib/types";
import type { RoundMeta } from "@/lib/bracket";
import MatchNode from "./MatchNode";

function Trophy({ className = "" }: { className?: string }) {
  return (
    <svg viewBox="0 0 48 48" className={className} aria-hidden="true">
      <path
        fill="currentColor"
        d="M14 6h20v3h6a2 2 0 0 1 2 2v3a8 8 0 0 1-8 8h-.6A10 10 0 0 1 26 28.9V33h4a4 4 0 0 1 4 4v3H14v-3a4 4 0 0 1 4-4h4v-4.1A10 10 0 0 1 14.6 22H14a8 8 0 0 1-8-8v-3a2 2 0 0 1 2-2h6V6Zm0 7H8v1a4 4 0 0 0 4 4h2v-5Zm20 0v5h2a4 4 0 0 0 4-4v-1h-6Z"
      />
    </svg>
  );
}

function championOf(match: BracketMatch | undefined): TeamRef | null {
  if (!match || match.status !== "FINISHED" || !match.winner) return null;
  return match.winner === "HOME" ? match.home : match.away;
}

export default function BracketRound({
  round,
  matches,
  placeholders,
  compact = false,
}: {
  round: RoundMeta;
  matches: BracketMatch[];
  placeholders: Map<string, { home: string | null; away: string | null }>;
  compact?: boolean;
}) {
  const isFinal = round.key === "FINAL";
  const champion = isFinal ? championOf(matches[0]) : null;

  return (
    <section
      data-round={round.key}
      className={[
        "relative z-10 flex flex-col",
        compact
          ? "min-w-0 flex-1 gap-1 px-0.5"
          : "w-[224px] shrink-0 snap-start gap-3 px-2 sm:w-[248px]",
      ].join(" ")}
    >
      <h2
        className={[
          "sticky top-0 z-10 mb-1 bg-board-900/30 text-center font-bold uppercase tracking-[0.12em] text-white/80 backdrop-blur-sm",
          compact
            ? "rounded px-1 py-1 text-[9px]"
            : "-mx-2 px-3 py-1.5 text-xs tracking-[0.18em]",
        ].join(" ")}
      >
        {compact ? round.chip : round.label}
      </h2>

      {isFinal && !compact && (
        <div className="mb-1 flex flex-col items-center gap-2 text-gold-400">
          <Trophy className="h-12 w-12 drop-shadow-[0_2px_8px_rgba(255,210,63,0.35)]" />
          {champion ? (
            <div className="flex flex-col items-center gap-1 rounded-xl border border-gold-400/40 bg-board-900/40 px-4 py-2 text-center">
              <span className="text-[10px] font-bold uppercase tracking-widest text-gold-400/80">
                Champion
              </span>
              <span className="text-base font-extrabold text-white">
                {champion.name}
              </span>
            </div>
          ) : (
            <span className="text-[10px] font-semibold uppercase tracking-widest text-white/45">
              Champion TBD
            </span>
          )}
        </div>
      )}

      {isFinal && compact && champion && (
        <div className="mb-1 flex items-center justify-center gap-1 text-gold-400">
          <Trophy className="h-4 w-4" />
          <span className="truncate text-[10px] font-extrabold text-white">
            {champion.short}
          </span>
        </div>
      )}

      <div
        className={[
          "flex flex-1 flex-col justify-around",
          compact ? "gap-1" : "gap-3",
        ].join(" ")}
      >
        {matches.map((m) => (
          <div key={m.id} className="flex justify-center">
            <MatchNode
              match={m}
              placeholders={placeholders.get(m.id)}
              compact={compact}
            />
          </div>
        ))}
      </div>
    </section>
  );
}
