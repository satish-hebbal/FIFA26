import type { WorldCupData } from "@/lib/types";
import { nextUpcomingMatch } from "@/lib/bracket";
import LiveMatchCard from "./LiveMatchCard";

export default function LiveScores({ data }: { data: WorldCupData }) {
  const live = data.live;

  if (live.length === 0) {
    const next = nextUpcomingMatch(data);
    return (
      <section className="rounded-xl border border-white/10 bg-white/[0.04] px-3 py-2.5 text-sm text-white/70">
        {next ? (
          <span suppressHydrationWarning>
            No matches live right now — next:{" "}
            <span className="font-semibold text-white/90">
              {next.home?.short ?? "TBD"} v {next.away?.short ?? "TBD"}
            </span>
            ,{" "}
            {new Date(next.kickoff!).toLocaleString(undefined, {
              month: "short",
              day: "numeric",
              hour: "numeric",
              minute: "2-digit",
            })}
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
