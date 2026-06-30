import type { WorldCupData } from "@/lib/types";

export default function Header({
  data,
  lastUpdated,
}: {
  data: WorldCupData | null;
  lastUpdated: Date | null;
}) {
  const anyLive = data?.anyLive ?? false;

  return (
    <header className="flex items-center justify-between gap-3">
      <div className="flex items-center gap-2">
        <span className="text-lg">🏆</span>
        <h1 className="text-base font-extrabold leading-tight tracking-tight text-white sm:text-lg">
          FIFA World Cup <span className="text-gold-400">2026</span>
        </h1>
      </div>

      <div className="flex items-center gap-2">
        {anyLive ? (
          <span className="flex items-center gap-1.5 rounded-full bg-accent/15 px-2.5 py-1 text-[11px] font-bold uppercase tracking-wide text-accent">
            <span className="live-dot h-2 w-2 rounded-full bg-accent" />
            Live
          </span>
        ) : (
          <span className="rounded-full bg-white/10 px-2.5 py-1 text-[11px] font-semibold text-white/60">
            Knockouts
          </span>
        )}
      </div>
    </header>
  );
}
