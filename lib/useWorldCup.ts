"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { WorldCupData } from "./types";

const POLL_INTERVAL_MS = 45_000; // 30–60s window per spec

interface UseWorldCup {
  data: WorldCupData | null;
  /** true only before the very first successful load */
  loading: boolean;
  /** true while a background refresh is in flight (after first load) */
  refreshing: boolean;
  lastUpdated: Date | null;
}

/**
 * Polls /api/worldcup every ~45s. Retains last-good state on failure and never
 * blanks out — the route already guarantees a valid 200 payload, and this hook
 * wraps the fetch in try/catch as a second line of defense.
 *
 * `initial` lets the page hydrate with server-fetched data for instant paint.
 */
export function useWorldCup(initial: WorldCupData | null = null): UseWorldCup {
  const [data, setData] = useState<WorldCupData | null>(initial);
  const [loading, setLoading] = useState(initial === null);
  const [refreshing, setRefreshing] = useState(false);
  // Start null so server and first client render agree (no SSR timestamp).
  // Set on mount / after each successful poll, client-side only.
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const mounted = useRef(true);

  const load = useCallback(async () => {
    setRefreshing(true);
    try {
      const res = await fetch("/api/worldcup", { cache: "no-store" });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const json = (await res.json()) as WorldCupData;
      if (!mounted.current) return;
      setData(json);
      setLastUpdated(new Date());
    } catch (err) {
      // Keep the last good state on screen; log and move on.
      console.error("[useWorldCup] poll failed:", err);
    } finally {
      if (mounted.current) {
        setLoading(false);
        setRefreshing(false);
      }
    }
  }, []);

  useEffect(() => {
    mounted.current = true;
    // If we hydrated from server data, mark it as freshly loaded (client-side);
    // otherwise fetch immediately.
    if (initial === null) void load();
    else setLastUpdated(new Date());

    const id = setInterval(() => void load(), POLL_INTERVAL_MS);
    const onVisible = () => {
      if (document.visibilityState === "visible") void load();
    };
    document.addEventListener("visibilitychange", onVisible);

    return () => {
      mounted.current = false;
      clearInterval(id);
      document.removeEventListener("visibilitychange", onVisible);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [load]);

  return { data, loading, refreshing, lastUpdated };
}
