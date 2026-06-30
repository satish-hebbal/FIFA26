"use client";

import Link from "next/link";
import type { WorldCupData } from "@/lib/types";
import { useWorldCup } from "@/lib/useWorldCup";
import { nextUpcomingMatch } from "@/lib/bracket";
import Header from "./Header";
import LiveScores from "./LiveScores";
import Bracket from "./Bracket";
import LogoLoop from "./LogoLoop";

export default function Dashboard({ initial }: { initial: WorldCupData }) {
  const { data, lastUpdated, refreshing } = useWorldCup(initial);
  const current = data ?? initial;
  const nextMatch = nextUpcomingMatch(current);

  return (
    <main className="mx-auto flex w-full max-w-5xl flex-col gap-4 px-3 py-4 sm:px-5 sm:py-6">
      <Header nextMatch={nextMatch} />
      <LiveScores data={current} />
      <Bracket data={current} />
      <footer className="flex flex-col gap-2 pt-1 text-[11px] text-white/40 sm:flex-row sm:items-center sm:justify-between">
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
        <span className="flex items-center gap-3">
          <LogoLoop />
          <a
            href="https://satishhebbal.design"
            target="_blank"
            rel="noopener noreferrer"
            className="underline-offset-2 hover:text-white/70 hover:underline"
          >
            satishhebbal.design
          </a>
          <Link
            href="/disclaimer"
            className="underline-offset-2 hover:text-white/70 hover:underline"
          >
            Disclaimer
          </Link>
        </span>
      </footer>
    </main>
  );
}
