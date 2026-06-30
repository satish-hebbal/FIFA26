import type { RawMatchesResponse } from "./types";

const WC_MATCHES_URL =
  "https://api.football-data.org/v4/competitions/WC/matches";

// Revalidate window (seconds). With Next's data cache this means the upstream
// API is hit at most once per this interval, no matter how many visitors poll
// our route — structurally keeping us under the 10 req/min free-tier limit.
const REVALIDATE_SECONDS = 60;
const MAX_RETRIES = 2;

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Fetch the full WC match list from football-data.org with the token attached
 * server-side. Retries up to MAX_RETRIES times on network error or non-200.
 * Throws if all attempts fail — callers handle the fallback / serve-stale path.
 */
export async function fetchWorldCupMatches(): Promise<RawMatchesResponse> {
  const token = process.env.FOOTBALL_DATA_TOKEN;
  if (!token) {
    throw new Error("FOOTBALL_DATA_TOKEN is not set");
  }

  let lastError: unknown = null;

  for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
    if (attempt > 0) {
      // small linear backoff: 300ms, 600ms
      await sleep(300 * attempt);
    }
    try {
      const res = await fetch(WC_MATCHES_URL, {
        headers: { "X-Auth-Token": token },
        next: { revalidate: REVALIDATE_SECONDS },
      });

      if (!res.ok) {
        lastError = new Error(`football-data.org responded ${res.status}`);
        continue;
      }

      const data = (await res.json()) as RawMatchesResponse;
      if (!data || !Array.isArray(data.matches)) {
        lastError = new Error("Unexpected football-data.org payload shape");
        continue;
      }
      return data;
    } catch (err) {
      lastError = err;
    }
  }

  throw lastError instanceof Error
    ? lastError
    : new Error("Failed to fetch World Cup matches");
}
