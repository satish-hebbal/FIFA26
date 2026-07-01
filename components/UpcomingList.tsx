import type { BracketMatch, TeamRef } from "@/lib/types";
import { ROUNDS } from "@/lib/bracket";
import ClientDate from "./ClientDate";

function roundChip(round: BracketMatch["round"]): string {
  if (round === "THIRD_PLACE") return "3RD";
  return ROUNDS.find((r) => r.key === round)?.chip ?? "";
}

function Side({ team, placeholder }: { team: TeamRef | null; placeholder: string | null }) {
  return (
    // Full-width row when the teams stack (lg); sizes to its content when they
    // sit inline on the single-line layout (xl).
    <span className="flex min-w-0 flex-1 items-center gap-1.5 xl:flex-initial">
      {team?.crest ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={team.crest}
          alt=""
          width={20}
          height={14}
          className="h-[14px] w-5 shrink-0 rounded-[3px] object-cover"
          loading="lazy"
        />
      ) : (
        <span className="h-[14px] w-5 shrink-0 rounded-[3px] bg-white/10" />
      )}
      <span
        className={[
          "min-w-0 truncate text-[12px]",
          team ? "font-semibold text-white/90" : "italic text-white/45",
        ].join(" ")}
      >
        {team?.short ?? team?.name ?? placeholder ?? "TBD"}
      </span>
    </span>
  );
}

// Desktop-only companion panel: a compact list of the next fixtures, filling the
// sticky sidebar beneath the featured card. Skips the match already featured
// (the soonest one) so the two panels don't duplicate. Rendered only at lg via
// its wrapper — never shown on mobile.
export default function UpcomingList({
  matches,
  placeholders,
}: {
  matches: BracketMatch[];
  placeholders: Map<string, { home: string | null; away: string | null }>;
}) {
  if (matches.length === 0) return null;

  return (
    <section className="sidebar-panel rounded-2xl border border-white/10 bg-white/[0.03] p-3">
      <h2 className="mb-2 px-1 text-[11px] font-bold uppercase tracking-[0.18em] text-white/55">
        Upcoming fixtures
      </h2>
      <ul className="flex flex-col">
        {matches.map((m) => {
          const ph = placeholders.get(m.id);
          return (
            <li
              key={m.id}
              className="flex items-center gap-2 rounded-lg px-2 py-2 transition-colors hover:bg-white/[0.04]"
            >
              <span className="w-9 shrink-0 text-center text-[9px] font-bold uppercase tracking-wide text-gold-400/80">
                {roundChip(m.round)}
              </span>
              {/* Teams stack on smaller desktop (lg); on xl there's room to lay
                  them out inline (HOME v AWAY) on a single line. */}
              <div className="flex min-w-0 flex-1 flex-col gap-1 xl:flex-row xl:items-center xl:gap-2">
                <Side team={m.home} placeholder={ph?.home ?? null} />
                <span className="hidden shrink-0 text-[11px] font-semibold text-white/35 xl:inline">
                  v
                </span>
                <Side team={m.away} placeholder={ph?.away ?? null} />
              </div>
              {m.kickoff && (
                <ClientDate
                  iso={m.kickoff}
                  className="flex shrink-0 flex-col items-end text-[10px] font-medium leading-tight text-white/50 xl:flex-row xl:items-baseline xl:gap-1"
                >
                  {(d) => (
                    <>
                      <span>
                        {d.toLocaleDateString(undefined, {
                          month: "short",
                          day: "numeric",
                        })}
                      </span>
                      <span className="hidden text-white/30 xl:inline">·</span>
                      <span>
                        {d.toLocaleTimeString(undefined, {
                          hour: "numeric",
                          minute: "2-digit",
                        })}
                      </span>
                    </>
                  )}
                </ClientDate>
              )}
            </li>
          );
        })}
      </ul>
    </section>
  );
}
