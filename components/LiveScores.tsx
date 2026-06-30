import type { WorldCupData } from "@/lib/types";
import { buildPlaceholders, nextUpcomingMatch } from "@/lib/bracket";
import FeaturedMatch from "./FeaturedMatch";
import LiveMatchCard from "./LiveMatchCard";

export default function LiveScores({ data }: { data: WorldCupData }) {
  const live = data.live;
  // Feature the first live match if any, otherwise the soonest upcoming one.
  const featured = live[0] ?? nextUpcomingMatch(data);
  const rest = live.slice(1);

  if (!featured) {
    return (
      <section className="rounded-xl border border-white/10 bg-white/[0.04] px-3 py-2.5 text-sm text-white/70">
        No matches live right now.
      </section>
    );
  }

  const placeholders = buildPlaceholders(data.bracket).get(featured.id);

  return (
    <section className="flex flex-col gap-3">
      <FeaturedMatch match={featured} placeholders={placeholders} />
      {rest.length > 0 && (
        <div className="flex flex-col gap-2">
          <div className="flex items-center gap-2">
            <h2 className="text-sm font-bold uppercase tracking-[0.18em] text-white/80">
              Also live
            </h2>
            <span className="rounded-full bg-accent/20 px-2 py-0.5 text-[11px] font-bold text-accent">
              {rest.length}
            </span>
          </div>
          <div className="grid gap-2 sm:grid-cols-2">
            {rest.map((m) => (
              <LiveMatchCard key={m.id} match={m} />
            ))}
          </div>
        </div>
      )}
    </section>
  );
}
