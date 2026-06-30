"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import type { WorldCupData } from "@/lib/types";
import { ROUNDS, buildPlaceholders } from "@/lib/bracket";
import BracketRound from "./BracketRound";
import MatchNode from "./MatchNode";

export default function Bracket({ data }: { data: WorldCupData }) {
  const canvasRef = useRef<HTMLDivElement>(null);
  const [activeRound, setActiveRound] = useState<string>(ROUNDS[0].key);

  const placeholders = useMemo(
    () => buildPlaceholders(data.bracket),
    [data.bracket]
  );

  const byRound = useMemo(() => {
    const map = new Map<string, typeof data.bracket>();
    for (const r of ROUNDS) {
      map.set(
        r.key,
        data.bracket
          .filter((m) => m.round === r.key)
          .sort((a, b) => a.slot - b.slot)
      );
    }
    return map;
  }, [data.bracket]);

  // Sync the active chip with whichever column is centered in the canvas.
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const sections = Array.from(
      canvas.querySelectorAll<HTMLElement>("[data-round]")
    );
    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter((e) => e.isIntersecting)
          .sort((a, b) => b.intersectionRatio - a.intersectionRatio)[0];
        if (visible) {
          const key = visible.target.getAttribute("data-round");
          if (key) setActiveRound(key);
        }
      },
      { root: canvas, threshold: [0.4, 0.6, 0.8] }
    );
    sections.forEach((s) => observer.observe(s));
    return () => observer.disconnect();
  }, [byRound]);

  const scrollToRound = (key: string) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const target = canvas.querySelector<HTMLElement>(`[data-round="${key}"]`);
    if (target) {
      canvas.scrollTo({ left: target.offsetLeft - 8, behavior: "smooth" });
      setActiveRound(key);
    }
  };

  return (
    <section className="board-surface rounded-2xl p-3 sm:p-4">
      {/* Round selector chips */}
      <div className="mb-3 flex gap-1.5 overflow-x-auto no-scrollbar">
        {ROUNDS.map((r) => {
          const active = r.key === activeRound;
          return (
            <button
              key={r.key}
              onClick={() => scrollToRound(r.key)}
              className={[
                "shrink-0 rounded-full px-3 py-1.5 text-xs font-bold transition-colors",
                active
                  ? "bg-gold-400 text-plate-ink"
                  : "bg-white/10 text-white/70 hover:bg-white/15",
              ].join(" ")}
            >
              {r.chip}
            </button>
          );
        })}
      </div>

      {/* Horizontally pan/scroll-snapping canvas of round columns */}
      <div
        ref={canvasRef}
        className="no-scrollbar flex snap-x snap-mandatory overflow-x-auto scroll-smooth pb-2"
        style={{ scrollPaddingLeft: 8 }}
      >
        {ROUNDS.map((r) => (
          <BracketRound
            key={r.key}
            round={r}
            matches={byRound.get(r.key) ?? []}
            placeholders={placeholders}
          />
        ))}
      </div>

      {/* Third-place playoff — standalone, not wired into the tree */}
      {data.thirdPlace && (
        <div className="mt-4 flex flex-col items-center gap-2 border-t border-white/10 pt-4">
          <span className="text-[10px] font-bold uppercase tracking-[0.18em] text-white/55">
            3rd Place Playoff
          </span>
          <MatchNode match={data.thirdPlace} />
        </div>
      )}
    </section>
  );
}
