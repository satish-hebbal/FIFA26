import { NextResponse } from "next/server";
import { fetchWorldCupMatches } from "@/lib/footballData";
import { fallbackWorldCup, normalize } from "@/lib/normalize";
import type { WorldCupData } from "@/lib/types";

// This route owns the only path to football-data.org. The browser polls it;
// it serves a cached/normalized copy. Resilience order (PROJECT_SPEC §3.4):
//   1. fetch w/ retry (in footballData.ts) and Next data-cache revalidate
//   2. on failure, serve the last good in-memory payload (serve-stale)
//   3. if there's no good payload yet, serve the static fallback skeleton
// It ALWAYS returns valid normalized JSON with HTTP 200.

// Warm in-memory copy of the most recent successful payload. Module-level so it
// survives across requests within a single serverless instance.
let lastGood: WorldCupData | null = null;

export const dynamic = "force-dynamic"; // our handler decides freshness, not the route cache

export async function GET() {
  try {
    const raw = await fetchWorldCupMatches();
    const data = normalize(raw);
    lastGood = data;
    return NextResponse.json(data, { status: 200 });
  } catch (err) {
    // Upstream failed after retries. Serve stale, else the static skeleton.
    const payload = lastGood ?? fallbackWorldCup();
    console.error(
      "[/api/worldcup] upstream failed, serving",
      lastGood ? "last-good cache" : "static fallback",
      "-",
      err instanceof Error ? err.message : err
    );
    return NextResponse.json(payload, { status: 200 });
  }
}
