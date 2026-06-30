"use client";

import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import type { BracketMatch, WorldCupData } from "@/lib/types";
import type { RoundMeta } from "@/lib/bracket";
import { ROUNDS, buildPlaceholders } from "@/lib/bracket";
import BracketRound from "./BracketRound";
import MatchNode from "./MatchNode";

interface Seg {
  x1: number;
  y1: number;
  x2: number;
  y2: number;
}

function FitIcon() {
  // inward arrows (compress)
  return (
    <svg viewBox="0 0 24 24" className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth={2.2} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M9 4v3a2 2 0 0 1-2 2H4M15 4v3a2 2 0 0 0 2 2h3M9 20v-3a2 2 0 0 0-2-2H4M15 20v-3a2 2 0 0 1 2-2h3" />
    </svg>
  );
}

function ExpandIcon() {
  // outward arrows (expand)
  return (
    <svg viewBox="0 0 24 24" className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth={2.2} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M4 9V6a2 2 0 0 1 2-2h3M20 9V6a2 2 0 0 0-2-2h-3M4 15v3a2 2 0 0 0 2 2h3M20 15v3a2 2 0 0 1-2 2h-3" />
    </svg>
  );
}

export default function Bracket({ data }: { data: WorldCupData }) {
  const canvasRef = useRef<HTMLDivElement>(null);
  const sectionRef = useRef<HTMLElement>(null);
  const [activeRound, setActiveRound] = useState<string>(ROUNDS[0].key);
  const [segs, setSegs] = useState<Seg[]>([]);
  const [svgSize, setSvgSize] = useState({ w: 0, h: 0 });
  // "fit" = condense all rounds into one frame (compact nodes, no h-scroll).
  const [fit, setFit] = useState(false);
  // "split" (fit only) = converging layout: half the draw flows in from the
  // left, half from the right, meeting at the Final in the center.
  const [split, setSplit] = useState(false);
  // Glossy shine sweep that plays across the board on a zoom toggle.
  const [shine, setShine] = useState(false);
  const shineTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  const toggleFit = () => {
    setFit((f) => !f);
    // Restart the sweep cleanly even on rapid re-toggles.
    setShine(false);
    requestAnimationFrame(() => {
      setShine(true);
      clearTimeout(shineTimer.current);
      shineTimer.current = setTimeout(() => setShine(false), 780);
    });
  };

  useEffect(() => () => clearTimeout(shineTimer.current), []);

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

  // Which final-half each match belongs to (for the converging split view):
  // "L" feeds the first semi-final, "R" the second.
  const sideOf = useMemo(() => {
    const map = new Map<string, "L" | "R">();
    const final = data.bracket.find((m) => m.round === "FINAL");
    if (!final) return map;
    const feedersOf = (id: string) =>
      data.bracket
        .filter((m) => m.feedsInto === id)
        .sort((a, b) => a.slot - b.slot);
    const assign = (id: string, side: "L" | "R") => {
      map.set(id, side);
      for (const f of feedersOf(id)) assign(f.id, side);
    };
    const sfs = feedersOf(final.id);
    if (sfs[0]) assign(sfs[0].id, "L");
    if (sfs[1]) assign(sfs[1].id, "R");
    return map;
  }, [data.bracket]);

  // Columns for the split view: left rounds inward (R32→SF), FINAL center,
  // then right rounds outward (SF→R32), mirrored.
  const splitColumns = useMemo(() => {
    const sideMatches = (key: string, side: "L" | "R") =>
      (byRound.get(key) ?? []).filter((m) => sideOf.get(m.id) === side);
    const meta = (key: string) => ROUNDS.find((r) => r.key === key)!;
    const cols: { id: string; round: RoundMeta; matches: BracketMatch[] }[] = [];
    for (const k of ["R32", "R16", "QF", "SF"])
      cols.push({ id: `${k}-L`, round: meta(k), matches: sideMatches(k, "L") });
    cols.push({
      id: "FINAL",
      round: meta("FINAL"),
      matches: byRound.get("FINAL") ?? [],
    });
    for (const k of ["SF", "QF", "R16", "R32"])
      cols.push({ id: `${k}-R`, round: meta(k), matches: sideMatches(k, "R") });
    return cols;
  }, [byRound, sideOf]);

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
    const centerX = (a: { left: number; right: number }) =>
      (a.left + a.right) / 2;
    for (const [targetId, feeders] of feederGroups) {
      const t = anchor.get(targetId);
      if (!t) continue;
      const sources = feeders
        .map((f) => anchor.get(f.id))
        .filter((a): a is NonNullable<typeof a> => Boolean(a));
      if (sources.length === 0) continue;

      const tc = centerX(t);
      // Feeders left of the target connect to its left edge; feeders right of
      // it (mirrored split half) connect to its right edge. Each side gets its
      // own H-stub / vertical-bus / H-into-target run.
      const left = sources.filter((s) => centerX(s) <= tc);
      const right = sources.filter((s) => centerX(s) > tc);

      if (left.length) {
        const midX = (Math.max(...left.map((s) => s.right)) + t.left) / 2;
        for (const s of left) next.push({ x1: s.right, y1: s.y, x2: midX, y2: s.y });
        const ys = left.map((s) => s.y).concat(t.y);
        next.push({ x1: midX, y1: Math.min(...ys), x2: midX, y2: Math.max(...ys) });
        next.push({ x1: midX, y1: t.y, x2: t.left, y2: t.y });
      }
      if (right.length) {
        const midX = (Math.min(...right.map((s) => s.left)) + t.right) / 2;
        for (const s of right) next.push({ x1: s.left, y1: s.y, x2: midX, y2: s.y });
        const ys = right.map((s) => s.y).concat(t.y);
        next.push({ x1: midX, y1: Math.min(...ys), x2: midX, y2: Math.max(...ys) });
        next.push({ x1: midX, y1: t.y, x2: t.right, y2: t.y });
      }
    }

    setSegs(next);
    setSvgSize({ w: canvas.scrollWidth, h: canvas.scrollHeight });
  }, [feederGroups]);

  // Recompute on layout-affecting changes: data updates, resize, font/layout settle.
  useLayoutEffect(() => {
    computeConnectors();
    const raf = requestAnimationFrame(computeConnectors);
    return () => cancelAnimationFrame(raf);
  }, [computeConnectors, data, fit, split]);

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

  // Ignore scroll-driven active-chip updates until this time (set while a
  // tap-triggered smooth scroll is animating, so intermediate columns the view
  // passes through don't flicker the chips).
  const lockUntil = useRef(0);

  // Active chip = the round column whose center is closest to the viewport
  // center. Stable (no threshold thrash) and only runs when not locked.
  const updateActiveFromScroll = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas || fit) return;
    if (Date.now() < lockUntil.current) return;
    const viewCenter = canvas.scrollLeft + canvas.clientWidth / 2;
    let bestKey: string = ROUNDS[0].key;
    let bestDist = Infinity;
    canvas.querySelectorAll<HTMLElement>("[data-round]").forEach((node) => {
      const center = node.offsetLeft + node.offsetWidth / 2;
      const dist = Math.abs(center - viewCenter);
      if (dist < bestDist) {
        bestDist = dist;
        bestKey = node.getAttribute("data-round") ?? bestKey;
      }
    });
    setActiveRound((prev) => (prev === bestKey ? prev : bestKey));
  }, [fit]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    let raf = 0;
    const onScroll = () => {
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(updateActiveFromScroll);
    };
    canvas.addEventListener("scroll", onScroll, { passive: true });
    updateActiveFromScroll();
    return () => {
      canvas.removeEventListener("scroll", onScroll);
      cancelAnimationFrame(raf);
    };
  }, [updateActiveFromScroll]);

  // On fit/expand toggle, reset scroll positions so the bracket is fully in
  // view: zero the canvas's horizontal offset (otherwise a later-round scroll
  // position cuts off the left rounds) and bring the board back into the
  // viewport (otherwise a deep vertical scroll from the tall expanded view
  // leaves you staring at empty space below the shorter compact bracket).
  useEffect(() => {
    const canvas = canvasRef.current;
    if (canvas) canvas.scrollLeft = 0;
    setActiveRound(ROUNDS[0].key);
    const raf = requestAnimationFrame(() => {
      const el = sectionRef.current;
      if (!el) return;
      const rect = el.getBoundingClientRect();
      // Leave the same gap above as the side gutters (the section's left offset).
      const gap = rect.left;
      const top = Math.max(0, window.scrollY + rect.top - gap);
      window.scrollTo({ top, behavior: "smooth" });
    });
    return () => cancelAnimationFrame(raf);
  }, [fit]);

  const scrollToRound = (key: string) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const target = canvas.querySelector<HTMLElement>(`[data-round="${key}"]`);
    if (!target) return;
    // Lock out scroll updates for the duration of the smooth scroll, and set
    // the active chip immediately so the tap feels instant.
    lockUntil.current = Date.now() + 700;
    setActiveRound(key);
    canvas.scrollTo({ left: target.offsetLeft, behavior: "smooth" });
  };

  return (
    <section
      ref={sectionRef}
      className="board-surface relative overflow-hidden rounded-2xl p-3 sm:p-4"
    >
      {shine && <div className="shine-sweep z-20" />}
      {/* Round selector chips + fit/expand toggle */}
      <div className="mb-3 flex items-center gap-2">
        {!fit ? (
          <div className="flex flex-1 gap-1.5 overflow-x-auto no-scrollbar">
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
        ) : (
          <span className="flex-1 text-xs font-bold uppercase tracking-[0.18em] text-white/55">
            Full bracket
          </span>
        )}

        {/* Layout direction toggle — split/converging vs. linear. Fit only. */}
        {fit && (
          <button
            onClick={() => setSplit((s) => !s)}
            aria-label={split ? "Linear layout" : "Converging layout"}
            title={split ? "Linear (left to right)" : "Converging (split)"}
            className="flex shrink-0 items-center justify-center rounded-full bg-white/10 px-3 py-2 text-white/80 transition-colors hover:bg-white/15"
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={split ? "/left-view.svg" : "/left-right-view.svg"}
              alt=""
              className="h-3.5 w-auto"
            />
          </button>
        )}

        <button
          onClick={toggleFit}
          aria-label={fit ? "Expand bracket" : "Fit whole bracket"}
          title={fit ? "Expand" : "Fit to screen"}
          className="flex shrink-0 items-center gap-1.5 rounded-full bg-white/10 px-3 py-1.5 text-xs font-bold text-white/80 transition-colors hover:bg-white/15"
        >
          {fit ? <ExpandIcon /> : <FitIcon />}
          <span className="hidden sm:inline">{fit ? "Expand" : "Fit"}</span>
        </button>
      </div>

      {/* Round columns: horizontally scroll-snapping (normal) or fit-to-frame (compact) */}
      <div
        ref={canvasRef}
        className={[
          "no-scrollbar relative flex pb-2",
          fit
            ? "gap-0.5 overflow-hidden"
            : "snap-x snap-mandatory overflow-x-auto scroll-smooth",
        ].join(" ")}
        style={fit ? undefined : { scrollPaddingLeft: 8 }}
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

        {fit && split
          ? splitColumns.map((col) => (
              <BracketRound
                key={col.id}
                round={col.round}
                matches={col.matches}
                placeholders={placeholders}
                compact
              />
            ))
          : ROUNDS.map((r) => (
              <BracketRound
                key={r.key}
                round={r}
                matches={byRound.get(r.key) ?? []}
                placeholders={placeholders}
                compact={fit}
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
