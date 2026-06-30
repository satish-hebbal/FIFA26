"use client";

import type { WorldCupData } from "@/lib/types";
import { useWorldCup } from "@/lib/useWorldCup";
import Header from "./Header";
import LiveScores from "./LiveScores";
import Bracket from "./Bracket";

export default function Dashboard({ initial }: { initial: WorldCupData }) {
  const { data, lastUpdated, refreshing } = useWorldCup(initial);
  const current = data ?? initial;

  return (
    <main className="mx-auto flex w-full max-w-5xl flex-col gap-4 px-3 py-4 sm:px-5 sm:py-6">
      <Header data={current} lastUpdated={lastUpdated} />
      <LiveScores data={current} />
      <Bracket data={current} />
      <footer className="flex items-center justify-between pt-1 text-[11px] text-white/40">
        <span>
          {current.anyLive
            ? "Updating live during matches"
            : "Final · Jul 19, 2026 · MetLife Stadium"}
        </span>
        <span className="flex items-center gap-1.5">
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
      </footer>
    </main>
  );
}
