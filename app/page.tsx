import Dashboard from "@/components/Dashboard";
import { fetchWorldCupMatches } from "@/lib/footballData";
import { fallbackWorldCup, normalize } from "@/lib/normalize";
import type { WorldCupData } from "@/lib/types";

// Server-render the initial payload so the bracket paints instantly. The shared
// data cache (revalidate: 60) means this does not hammer the upstream API, and
// any failure degrades to the static skeleton — the page never errors out.
async function getInitialData(): Promise<WorldCupData> {
  try {
    const raw = await fetchWorldCupMatches();
    return normalize(raw);
  } catch {
    return fallbackWorldCup();
  }
}

export default async function Page() {
  const initial = await getInitialData();
  return <Dashboard initial={initial} />;
}
