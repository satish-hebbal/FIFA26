"use client";

import { useEffect, useState } from "react";
import type { BracketMatch, WorldCupData } from "@/lib/types";

function formatCountdown(kickoffIso: string, now: number): string {
  const diff = new Date(kickoffIso).getTime() - now;
  if (diff <= 0) return "kicking off";
  const mins = Math.floor(diff / 60000);
  if (mins < 60) return `in ${mins}m`;
  const hours = Math.floor(mins / 60);
  const rem = mins % 60;
  if (hours < 24) return `in ${hours}h ${rem}m`;
  const days = Math.floor(hours / 24);
  return `in ${days}d ${hours % 24}h`;
}

function NextMatchPill({ next }: { next: BracketMatch }) {
  // now is null until mounted, so SSR and first client render agree (no
  // hydration mismatch); then it ticks every 30s.
  const [now, setNow] = useState<number | null>(null);
  useEffect(() => {
    setNow(Date.now());
    const id = setInterval(() => setNow(Date.now()), 30_000);
    return () => clearInterval(id);
  }, []);

  const matchup = `${next.home?.short ?? "TBD"} v ${next.away?.short ?? "TBD"}`;

  return (
    <span
      className="flex items-center gap-1.5 rounded-full bg-white/10 px-2.5 py-1 text-[11px] font-semibold text-white/70"
      suppressHydrationWarning
    >
      <span className="text-gold-400/90">Next</span>
      <span className="text-white/85">{matchup}</span>
      {now !== null && next.kickoff && (
        <span className="text-white/55">
          · {formatCountdown(next.kickoff, now)}
        </span>
      )}
    </span>
  );
}

export default function Header({
  data,
  nextMatch,
}: {
  data: WorldCupData | null;
  nextMatch: BracketMatch | null;
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
        ) : nextMatch ? (
          <NextMatchPill next={nextMatch} />
        ) : (
          <span className="rounded-full bg-white/10 px-2.5 py-1 text-[11px] font-semibold text-white/60">
            Knockouts
          </span>
        )}
      </div>
    </header>
  );
}
