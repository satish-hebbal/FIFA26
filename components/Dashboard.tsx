"use client";

import type { WorldCupData } from "@/lib/types";
import { useWorldCup } from "@/lib/useWorldCup";
import { upcomingMatches } from "@/lib/bracket";
import Header from "./Header";
import LiveScores from "./LiveScores";
import Bracket from "./Bracket";
import LogoLoop from "./LogoLoop";

export default function Dashboard({ initial }: { initial: WorldCupData }) {
  const { data, lastUpdated, refreshing } = useWorldCup(initial);
  const current = data ?? initial;
  // Up to 5 soonest fixtures for the header carousel.
  const nextMatches = upcomingMatches(current, 5);

  return (
    <main className="mx-auto flex w-full max-w-5xl flex-col gap-4 px-3 py-4 sm:px-5 sm:py-6">
      <Header nextMatches={nextMatches} />
      <LiveScores data={current} />
      <Bracket data={current} />
      <footer className="flex flex-col gap-3 pt-1 text-[11px] text-white/40">
        {/* row 1: status (left) + last-updated (right) */}
        <div className="flex items-center justify-between gap-3">
          <span>
            {current.anyLive
              ? "Updating live during matches"
              : "Final · Jul 19, 2026 · MetLife Stadium"}
          </span>
          <span className="flex items-center gap-1.5" suppressHydrationWarning>
            {refreshing && (
              <span className="soft-pulse h-1.5 w-1.5 rounded-full bg-white/50" />
            )}
            {lastUpdated
              ? `Updated ${lastUpdated.toLocaleTimeString(undefined, {
                  hour: "numeric",
                  minute: "2-digit",
                })}`
              : "—"}
          </span>
        </div>

        {/* row 2: logo, centered */}
        <div className="flex justify-center">
          <LogoLoop />
        </div>

        {/* row 3: made-by credit, centered */}
        <div className="flex justify-center">
          <span className="flex items-center gap-1">
            Made by
            <a
              href="https://satishhebbal.design"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-0.5 font-medium text-white/55 underline-offset-2 hover:text-white/80 hover:underline"
            >
              satishhebbal.design
              <svg
                viewBox="0 0 24 24"
                className="h-2.5 w-2.5"
                fill="none"
                stroke="currentColor"
                strokeWidth={2.5}
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden="true"
              >
                <path d="M7 17 17 7" />
                <path d="M8 7h9v9" />
              </svg>
            </a>
          </span>
        </div>
      </footer>
    </main>
  );
}
