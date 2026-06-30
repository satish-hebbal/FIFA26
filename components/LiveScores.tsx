import type { TeamRef, WorldCupData } from "@/lib/types";
import { nextUpcomingMatch } from "@/lib/bracket";
import LiveMatchCard from "./LiveMatchCard";

function NextTeam({ team }: { team: TeamRef | null }) {
  return (
    <span className="inline-flex items-center gap-1">
      {team?.crest ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={team.crest}
          alt=""
          width={15}
          height={15}
          className="h-[15px] w-[15px] rounded-[2px] object-contain"
          loading="lazy"
        />
      ) : null}
      <span>{team?.short ?? "TBD"}</span>
    </span>
  );
}

export default function LiveScores({ data }: { data: WorldCupData }) {
  const live = data.live;

  if (live.length === 0) {
    const next = nextUpcomingMatch(data);
    return (
      <section className="rounded-xl border border-white/10 bg-white/[0.04] px-3 py-2.5 text-sm text-white/70">
        {next ? (
          <span className="flex flex-wrap items-center gap-1.5" suppressHydrationWarning>
            No matches live right now — next:
            <span className="inline-flex items-center gap-1.5 font-semibold text-white/90">
              <NextTeam team={next.home} />
              <span className="text-white/45">v</span>
              <NextTeam team={next.away} />
            </span>
            <span className="text-white/60">
              ·{" "}
              {new Date(next.kickoff!).toLocaleString(undefined, {
                month: "short",
                day: "numeric",
                hour: "numeric",
                minute: "2-digit",
              })}
            </span>
          </span>
        ) : (
          <span>No matches live right now.</span>
        )}
      </section>
    );
  }

  return (
    <section className="flex flex-col gap-2">
      <div className="flex items-center gap-2">
        <h2 className="text-sm font-bold uppercase tracking-[0.18em] text-white/80">
          Live now
        </h2>
        <span className="rounded-full bg-accent/20 px-2 py-0.5 text-[11px] font-bold text-accent">
          {live.length}
        </span>
      </div>
      <div className="grid gap-2 sm:grid-cols-2">
        {live.map((m) => (
          <LiveMatchCard key={m.id} match={m} />
        ))}
      </div>
    </section>
  );
}
