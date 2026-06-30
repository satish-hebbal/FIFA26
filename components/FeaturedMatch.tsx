"use client";

import { useEffect, useState } from "react";
import type { BracketMatch, TeamRef } from "@/lib/types";
import { ROUNDS } from "@/lib/bracket";

function roundLabel(round: BracketMatch["round"]): string {
  if (round === "THIRD_PLACE") return "Third-place playoff";
  return ROUNDS.find((r) => r.key === round)?.label ?? "";
}

function formatCountdown(iso: string, now: number): string {
  const diff = new Date(iso).getTime() - now;
  if (diff <= 0) return "Kicking off";
  const totalSec = Math.floor(diff / 1000);
  const days = Math.floor(totalSec / 86400);
  const hours = Math.floor((totalSec % 86400) / 3600);
  const mins = Math.floor((totalSec % 3600) / 60);
  const secs = totalSec % 60;
  if (days > 0) return `in ${days}d ${hours}h`;
  if (hours > 0) return `in ${hours}h ${mins}m`;
  if (mins > 0) return `in ${mins}m ${secs}s`;
  return `in ${secs}s`;
}

// Estimated match clock. The free API tier doesn't expose a live minute, so we
// approximate it from kickoff (accounting for the ~15-min half-time break) and
// use the real PAUSED flag for an accurate "HT". Returns a label like "67'".
function matchClock(
  kickoffIso: string | null,
  now: number,
  paused: boolean
): string | null {
  if (paused) return "HT";
  if (!kickoffIso) return null;
  const mins = Math.floor((now - new Date(kickoffIso).getTime()) / 60000);
  if (mins < 0) return null;
  if (mins <= 45) return `${Math.max(1, mins)}'`;
  if (mins < 60) return "45+'"; // first-half stoppage (HT is caught above)
  const second = mins - 15; // subtract the half-time interval
  if (second >= 90) return "90+'";
  return `${second}'`;
}

// Top-down pitch markings, drawn to fill the card (stretched to fit).
function PitchLines() {
  return (
    <svg
      className="pointer-events-none absolute inset-0 h-full w-full"
      viewBox="0 0 320 200"
      preserveAspectRatio="none"
      fill="none"
      stroke="rgba(255,255,255,0.45)"
      strokeWidth={1.4}
      aria-hidden="true"
    >
      {/* boundary */}
      <rect x={6} y={6} width={308} height={188} rx={2} />
      {/* halfway line + center circle + spot */}
      <line x1={160} y1={6} x2={160} y2={194} />
      <circle cx={160} cy={100} r={28} />
      <circle cx={160} cy={100} r={2.2} fill="rgba(255,255,255,0.6)" stroke="none" />
      {/* left boxes + spot + arc */}
      <rect x={6} y={52} width={44} height={96} />
      <rect x={6} y={78} width={17} height={44} />
      <circle cx={36} cy={100} r={2.2} fill="rgba(255,255,255,0.6)" stroke="none" />
      <path d="M50 84 A 20 20 0 0 1 50 116" />
      {/* right boxes + spot + arc */}
      <rect x={270} y={52} width={44} height={96} />
      <rect x={297} y={78} width={17} height={44} />
      <circle cx={284} cy={100} r={2.2} fill="rgba(255,255,255,0.6)" stroke="none" />
      <path d="M270 84 A 20 20 0 0 0 270 116" />
    </svg>
  );
}

function Crest({ team, big }: { team: TeamRef | null; big?: boolean }) {
  // Uniform box for every flag; object-cover fills it (cropping as needed) so
  // all flags are the same size and the radius clips the actual flag edges.
  const size = big ? "h-10 w-14 sm:h-11 sm:w-16" : "h-8 w-11";
  if (team?.crest) {
    // eslint-disable-next-line @next/next/no-img-element
    return (
      <img
        src={team.crest}
        alt=""
        className={`${size} rounded-lg object-cover drop-shadow-[0_2px_6px_rgba(0,0,0,0.45)]`}
        loading="lazy"
      />
    );
  }
  return (
    <span
      className={`${size} flex items-center justify-center rounded-lg bg-white/15 text-xs font-bold text-white/80`}
    >
      {team?.short?.slice(0, 3) ?? "?"}
    </span>
  );
}

function TeamSide({
  team,
  placeholder,
  align,
  won,
}: {
  team: TeamRef | null;
  placeholder: string | null;
  align: "left" | "right";
  won: boolean;
}) {
  const name = team?.name ?? placeholder ?? "To be decided";
  const code = team?.short ?? "TBD";
  return (
    <div
      className={[
        "flex min-w-0 flex-1 flex-col gap-1.5",
        align === "left" ? "items-start text-left" : "items-end text-right",
      ].join(" ")}
    >
      <Crest team={team} big />
      <span
        className={[
          "text-lg font-black uppercase tracking-tight",
          won ? "text-gold-400" : "text-white",
        ].join(" ")}
      >
        {code}
      </span>
      <span className="w-full truncate text-[11px] font-semibold text-white/65">
        {name}
      </span>
    </div>
  );
}

export default function FeaturedMatch({
  match,
  placeholders,
}: {
  match: BracketMatch;
  placeholders?: { home: string | null; away: string | null };
}) {
  const live = match.status === "LIVE";
  const finished = match.status === "FINISHED";
  const showScore = live || finished;
  const homeWon = finished && match.winner === "HOME";
  const awayWon = finished && match.winner === "AWAY";

  // now is null until mounted → SSR/first client render agree (no mismatch).
  // Ticks for both the upcoming countdown and the live minute estimate; faster
  // when counting down to kickoff (seconds), slower while live (minute).
  const [now, setNow] = useState<number | null>(null);
  useEffect(() => {
    if (finished) return;
    setNow(Date.now());
    const id = setInterval(() => setNow(Date.now()), live ? 15_000 : 1000);
    return () => clearInterval(id);
  }, [finished, live]);

  const clock = live && now !== null
    ? matchClock(match.kickoff, now, match.paused ?? false)
    : null;

  const pens =
    match.decidedBy === "PENS" &&
    match.penHome != null &&
    match.penAway != null;

  return (
    <section className="relative overflow-hidden rounded-2xl ring-1 ring-white/10">
      {/* pitch layers */}
      <div className="pitch-bg absolute inset-0" />
      <PitchLines />
      <div className="pitch-veil absolute inset-0" />

      {/* content */}
      <div className="relative z-10 flex flex-col">
        <div className="flex flex-col gap-4 p-4 pb-3 sm:p-5 sm:pb-4">
          {/* status row */}
          <div className="flex items-center justify-between">
            {live ? (
              <span
                className="flex items-center gap-2 rounded-full bg-black/30 px-2.5 py-1 text-[11px] font-bold uppercase tracking-wide text-accent backdrop-blur-sm"
                suppressHydrationWarning
              >
                <span className="relative flex h-4 w-4 items-center justify-center">
                  <span className="live-ripple absolute inset-0" />
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src="/ball.png"
                    alt=""
                    className="spin-ball relative h-4 w-4"
                  />
                </span>
                Live
                {clock && (
                  <span className="tabular-nums text-white/90">{clock}</span>
                )}
              </span>
            ) : (
              <span className="rounded-full bg-black/30 px-2.5 py-1 text-[11px] font-bold uppercase tracking-wide text-white/80 backdrop-blur-sm">
                {finished ? "Full time" : "Up next"}
              </span>
            )}
            <span className="text-[11px] font-bold uppercase tracking-[0.14em] text-white/65">
              {roundLabel(match.round)}
            </span>
          </div>

          {/* teams: home (left) vs away (right) */}
          <div className="flex items-center gap-3">
            <TeamSide
              team={match.home}
              placeholder={placeholders?.home ?? null}
              align="left"
              won={homeWon}
            />
            <span className="shrink-0 text-sm font-black uppercase tracking-widest text-white/40">
              VS
            </span>
            <TeamSide
              team={match.away}
              placeholder={placeholders?.away ?? null}
              align="right"
              won={awayWon}
            />
          </div>
        </div>

        {/* scoreboard — trapezoid plinth flush to the bottom of the pitch.
            Drawn as an SVG (above the pitch, doesn't resize it) so the top
            corners can be softly rounded. */}
        <div className="relative px-7 pb-4 pt-3.5">
          <svg
            className="absolute inset-0 -z-0 h-full w-full"
            viewBox="0 0 100 100"
            preserveAspectRatio="none"
            aria-hidden="true"
          >
            <path
              d="M8.5 0 L91.5 0 Q94 0 95 17 L100 100 L0 100 L5 17 Q6 0 8.5 0 Z"
              fill="rgba(0,0,0,0.5)"
            />
          </svg>
          <div className="relative">
          {showScore ? (
            <div className="flex flex-col items-center gap-1">
              <div className="flex items-center justify-center gap-3 sm:gap-4">
                <span
                  className={[
                    "min-w-0 flex-1 truncate text-right text-[13px] font-bold",
                    homeWon ? "text-gold-400" : "text-white/75",
                  ].join(" ")}
                >
                  {match.home?.name ?? match.home?.short ?? "—"}
                </span>
                <span className="text-3xl font-black tabular-nums text-white sm:text-4xl">
                  {match.homeScore ?? 0}
                </span>
                <span className="text-xl font-black text-white/40">–</span>
                <span className="text-3xl font-black tabular-nums text-white sm:text-4xl">
                  {match.awayScore ?? 0}
                </span>
                <span
                  className={[
                    "min-w-0 flex-1 truncate text-left text-[13px] font-bold",
                    awayWon ? "text-gold-400" : "text-white/75",
                  ].join(" ")}
                >
                  {match.away?.name ?? match.away?.short ?? "—"}
                </span>
              </div>
              {pens && (
                <span className="text-[11px] font-bold uppercase tracking-wide text-gold-400/90">
                  {match.penHome}–{match.penAway} on penalties
                </span>
              )}
              {!pens && match.decidedBy === "AET" && (
                <span className="text-[11px] font-bold uppercase tracking-wide text-white/55">
                  After extra time
                </span>
              )}
            </div>
          ) : (
            <div
              className="flex flex-col items-center gap-0.5 text-center"
              suppressHydrationWarning
            >
              <span className="text-sm font-bold text-white">
                {match.kickoff
                  ? new Date(match.kickoff).toLocaleString(undefined, {
                      weekday: "short",
                      month: "short",
                      day: "numeric",
                      hour: "numeric",
                      minute: "2-digit",
                    })
                  : "Date to be confirmed"}
              </span>
              {now !== null && match.kickoff && (
                <span className="text-[13px] font-extrabold uppercase tracking-wide text-gold-400">
                  {formatCountdown(match.kickoff, now)}
                </span>
              )}
            </div>
          )}
          </div>
        </div>
      </div>
    </section>
  );
}
