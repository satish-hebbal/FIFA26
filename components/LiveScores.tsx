import type { WorldCupData, BracketMatch } from "@/lib/types";
import LiveMatchCard from "./LiveMatchCard";

function nextUpcoming(data: WorldCupData): BracketMatch | null {
  const all = [...data.bracket, ...(data.thirdPlace ? [data.thirdPlace] : [])];
  const upcoming = all
    .filter((m) => m.status === "UPCOMING" && m.kickoff && m.home && m.away)
    .sort(
      (a, b) =>
        new Date(a.kickoff!).getTime() - new Date(b.kickoff!).getTime()
    );
  return upcoming[0] ?? null;
}

export default function LiveScores({ data }: { data: WorldCupData }) {
  const live = data.live;

  if (live.length === 0) {
    const next = nextUpcoming(data);
    return (
      <section className="rounded-xl border border-white/10 bg-white/[0.04] px-3 py-2.5 text-sm text-white/70">
        {next ? (
          <span>
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
