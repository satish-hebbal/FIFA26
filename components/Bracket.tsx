"use client";

import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import type { WorldCupData } from "@/lib/types";
import { ROUNDS, buildPlaceholders } from "@/lib/bracket";
import BracketRound from "./BracketRound";
import MatchNode from "./MatchNode";

interface Seg {
  x1: number;
  y1: number;
  x2: number;
  y2: number;
}

export default function Bracket({ data }: { data: WorldCupData }) {
  const canvasRef = useRef<HTMLDivElement>(null);
  const [activeRound, setActiveRound] = useState<string>(ROUNDS[0].key);
  const [segs, setSegs] = useState<Seg[]>([]);
  const [svgSize, setSvgSize] = useState({ w: 0, h: 0 });

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

  // Feeder groups: target match id → its feeder matches (sorted by slot).
  const feederGroups = useMemo(() => {
    const groups = new Map<string, typeof data.bracket>();
    for (const m of data.bracket) {
      if (!m.feedsInto) continue;
      const arr = groups.get(m.feedsInto) ?? [];
      arr.push(m);
      groups.set(m.feedsInto, arr);
    }
    for (const arr of groups.values()) arr.sort((a, b) => a.slot - b.slot);
    return groups;
  }, [data.bracket]);

  // Measure each card's right/left edge and its divider-line Y, then build the
  // orthogonal connector segments. Anchored to the divider between the two team
  // rows (not the box center), per design.
  const computeConnectors = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const cRect = canvas.getBoundingClientRect();
    const ox = canvas.scrollLeft - cRect.left;
    const oy = canvas.scrollTop - cRect.top;

    const anchor = new Map<string, { left: number; right: number; y: number }>();
    canvas.querySelectorAll<HTMLElement>("[data-match-id]").forEach((node) => {
      const id = node.getAttribute("data-match-id");
      if (!id) return;
      const r = node.getBoundingClientRect();
      const divider = node.querySelector<HTMLElement>("[data-divider]");
      const dr = divider ? divider.getBoundingClientRect() : r;
      anchor.set(id, {
        left: r.left + ox,
        right: r.right + ox,
        y: (dr.top + dr.bottom) / 2 + oy,
      });
    });

    const next: Seg[] = [];
    for (const [targetId, feeders] of feederGroups) {
      const t = anchor.get(targetId);
      if (!t) continue;
      const sources = feeders
        .map((f) => anchor.get(f.id))
        .filter((a): a is NonNullable<typeof a> => Boolean(a));
      if (sources.length === 0) continue;

      // Midpoint X in the gap between the source column and the target column.
      const midX = (sources[0].right + t.left) / 2;

      // Horizontal stub out of each source, at its divider line.
      for (const s of sources) {
        next.push({ x1: s.right, y1: s.y, x2: midX, y2: s.y });
      }
      // Vertical bus joining the sources (and reaching the target's divider Y).
      const ys = sources.map((s) => s.y).concat(t.y);
      next.push({
        x1: midX,
        y1: Math.min(...ys),
        x2: midX,
        y2: Math.max(...ys),
      });
      // Horizontal into the target, at its divider line.
      next.push({ x1: midX, y1: t.y, x2: t.left, y2: t.y });
    }

    setSegs(next);
    setSvgSize({ w: canvas.scrollWidth, h: canvas.scrollHeight });
  }, [feederGroups]);

  // Recompute on layout-affecting changes: data updates, resize, font/layout settle.
  useLayoutEffect(() => {
    computeConnectors();
    const raf = requestAnimationFrame(computeConnectors);
    return () => cancelAnimationFrame(raf);
  }, [computeConnectors, data]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const onResize = () => computeConnectors();
    const ro = new ResizeObserver(onResize);
    ro.observe(canvas);
    window.addEventListener("resize", onResize);
    return () => {
      ro.disconnect();
      window.removeEventListener("resize", onResize);
    };
  }, [computeConnectors]);

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
        className="no-scrollbar relative flex snap-x snap-mandatory overflow-x-auto scroll-smooth pb-2"
        style={{ scrollPaddingLeft: 8 }}
      >
        {/* Connector overlay — sits behind the cards (z-0). */}
        {svgSize.w > 0 && (
          <svg
            className="pointer-events-none absolute left-0 top-0 z-0"
            width={svgSize.w}
            height={svgSize.h}
            aria-hidden="true"
          >
            {segs.map((s, i) => (
              <line
                key={i}
                x1={s.x1}
                y1={s.y1}
                x2={s.x2}
                y2={s.y2}
                stroke="rgba(255,255,255,0.4)"
                strokeWidth={2}
                strokeLinecap="round"
              />
            ))}
          </svg>
        )}

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
