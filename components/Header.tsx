"use client";

import { useEffect, useState } from "react";
import type { BracketMatch } from "@/lib/types";

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

  return (
    <span
      className="flex max-w-full items-center gap-1.5 whitespace-nowrap rounded-full bg-white/10 px-2.5 py-1 text-[11px] font-semibold text-white/70"
      suppressHydrationWarning
    >
      <span className="text-gold-400/90">Next</span>
      <span className="flex items-center gap-1 text-white/85">
        <TeamTag team={next.home} />
        <span className="text-white/45">v</span>
        <TeamTag team={next.away} />
      </span>
      {now !== null && next.kickoff && (
        <span className="text-white/55">
          · {formatCountdown(next.kickoff, now)}
        </span>
      )}
    </span>
  );
}

function TeamTag({ team }: { team: BracketMatch["home"] }) {
  return (
    <span className="flex items-center gap-1">
      {team?.crest ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={team.crest}
          alt=""
          width={20}
          height={14}
          className="h-[14px] w-5 rounded-[3px] object-cover"
          loading="lazy"
        />
      ) : null}
      <span>{team?.short ?? "TBD"}</span>
    </span>
  );
}

export default function Header({
  nextMatch,
}: {
  nextMatch: BracketMatch | null;
}) {
  return (
    <header className="flex flex-wrap items-center justify-between gap-x-3 gap-y-2">
      <div className="flex shrink-0 items-center gap-2">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/cup.svg" alt="" width={20} height={20} className="h-5 w-5" />
        <h1 className="whitespace-nowrap text-base font-extrabold leading-tight tracking-tight text-white sm:text-lg">
          FIFA World Cup <span className="text-gold-400">2026</span>
        </h1>
      </div>

      <div className="flex min-w-0 items-center gap-2">
        {nextMatch ? (
          <NextMatchPill next={nextMatch} />
        ) : (
          <span className="whitespace-nowrap rounded-full bg-white/10 px-2.5 py-1 text-[11px] font-semibold text-white/60">
            Knockouts
          </span>
        )}
      </div>
    </header>
  );
}
