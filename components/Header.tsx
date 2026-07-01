"use client";

import { useCallback, useEffect, useRef, useState } from "react";
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

function Arrow({ dir }: { dir: "left" | "right" }) {
  return (
    <svg
      viewBox="0 0 24 24"
      className="h-3 w-3"
      fill="none"
      stroke="currentColor"
      strokeWidth={2.5}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d={dir === "left" ? "M15 6 9 12l6 6" : "M9 6l6 6-6 6"} />
    </svg>
  );
}

// A single match's "Next  ENG v COD ...... in 8h" line. The caller supplies the
// slide-animation class; this fills the slot window so incoming/outgoing copies
// overlap cleanly during the transition.
function MatchLine({
  match,
  now,
  className,
  onAnimationEnd,
}: {
  match: BracketMatch;
  now: number | null;
  className?: string;
  onAnimationEnd?: () => void;
}) {
  return (
    <span
      onAnimationEnd={onAnimationEnd}
      className={[
        "absolute inset-0 flex items-center justify-between gap-2 whitespace-nowrap",
        className ?? "",
      ].join(" ")}
    >
      <span className="flex min-w-0 items-center gap-1.5">
        <span className="text-gold-400/90">Next</span>
        <span className="flex items-center gap-1 text-white/85">
          <TeamTag team={match.home} />
          <span className="text-white/45">v</span>
          <TeamTag team={match.away} />
        </span>
      </span>
      {now !== null && match.kickoff && (
        <span className="shrink-0 text-white/55">
          {formatCountdown(match.kickoff, now)}
        </span>
      )}
    </span>
  );
}

function NextMatchPill({ matches }: { matches: BracketMatch[] }) {
  // now is null until mounted, so SSR and first client render agree (no
  // hydration mismatch); then it ticks every 30s.
  const [now, setNow] = useState<number | null>(null);
  const [idx, setIdx] = useState(0);
  // Track the outgoing slot + step direction so we can play the right slide.
  const [anim, setAnim] = useState<{ prev: number; dir: 1 | -1 } | null>(null);
  const idxRef = useRef(0);
  const count = matches.length;
  const hasMany = count > 1;

  useEffect(() => {
    setNow(Date.now());
    const id = setInterval(() => setNow(Date.now()), 30_000);
    return () => clearInterval(id);
  }, []);

  const advance = useCallback(
    (dir: 1 | -1) => {
      const from = idxRef.current;
      const to = (from + dir + count) % count;
      idxRef.current = to;
      setAnim({ prev: from, dir });
      setIdx(to);
    },
    [count]
  );

  // Auto-advance forward every 4s when there's more than one upcoming match.
  useEffect(() => {
    if (!hasMany) return;
    const id = setInterval(() => advance(1), 4_000);
    return () => clearInterval(id);
  }, [hasMany, advance]);

  // Keep indices valid if the list shrinks (e.g. a match kicks off).
  const safeIdx = idx % count;

  return (
    <span
      className="glossy-border relative flex w-full items-center gap-1.5 rounded-full bg-white/10 px-2 py-1.5 text-[11px] font-semibold text-white/70"
      suppressHydrationWarning
    >
      {hasMany && (
        <button
          type="button"
          onClick={() => advance(-1)}
          aria-label="Previous upcoming match"
          className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-white/10 text-white/55 transition-colors hover:bg-white/20 hover:text-white/90"
        >
          <Arrow dir="left" />
        </button>
      )}

      {/* Slot window: fixed height, clips the vertical slide. */}
      <span className="relative h-5 min-w-0 flex-1 overflow-hidden">
        <MatchLine
          key={safeIdx}
          match={matches[safeIdx]}
          now={now}
          className={anim ? (anim.dir === 1 ? "slot-enter-up" : "slot-enter-down") : ""}
          onAnimationEnd={() => setAnim(null)}
        />
        {anim && (
          <MatchLine
            key={`out-${anim.prev}`}
            match={matches[anim.prev % count]}
            now={now}
            className={anim.dir === 1 ? "slot-leave-up" : "slot-leave-down"}
          />
        )}
      </span>

      {hasMany && (
        <span className="flex shrink-0 items-center gap-1 px-0.5" aria-hidden="true">
          {matches.map((_, i) => (
            <span
              key={i}
              className={[
                "h-1 w-1 rounded-full transition-colors",
                i === safeIdx ? "bg-gold-400" : "bg-white/25",
              ].join(" ")}
            />
          ))}
        </span>
      )}

      {hasMany && (
        <button
          type="button"
          onClick={() => advance(1)}
          aria-label="Next upcoming match"
          className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-white/10 text-white/55 transition-colors hover:bg-white/20 hover:text-white/90"
        >
          <Arrow dir="right" />
        </button>
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
  nextMatches,
}: {
  nextMatches: BracketMatch[];
}) {
  return (
    <header className="flex flex-wrap items-center justify-between gap-x-3 gap-y-2">
      <div className="flex shrink-0 items-center gap-2">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src="/cup.svg"
          alt=""
          width={20}
          height={20}
          className="cup-mark h-5 w-5"
        />
        <h1 className="whitespace-nowrap text-base font-extrabold leading-tight tracking-tight text-white sm:text-lg">
          FIFA World Cup <span className="text-gold-400">2026</span>
        </h1>
      </div>

      <div className="w-full">
        {nextMatches.length > 0 ? (
          <NextMatchPill matches={nextMatches} />
        ) : (
          <span className="inline-flex whitespace-nowrap rounded-full bg-white/10 px-2.5 py-1 text-[11px] font-semibold text-white/60">
            Knockouts
          </span>
        )}
      </div>
    </header>
  );
}
