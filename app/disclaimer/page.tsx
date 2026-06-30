import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Disclaimer — FIFA World Cup 2026 Bracket",
  description:
    "Fan-made, non-commercial project for educational purposes. Not affiliated with or endorsed by FIFA.",
};

export default function DisclaimerPage() {
  return (
    <main className="mx-auto flex w-full max-w-2xl flex-col gap-5 px-5 py-10 text-white/90">
      <Link href="/" className="text-sm text-white/50 hover:text-white/80">
        ← Back to bracket
      </Link>

      <h1 className="text-2xl font-bold text-white">Disclaimer</h1>

      <div className="board-surface flex flex-col gap-4 rounded-2xl p-6 text-sm leading-relaxed text-white/80">
        <p>
          This website is an independent, non-commercial fan project built
          for educational purposes — to practice and demonstrate front-end
          development, live data fetching, and UI design. It is not an
          official product.
        </p>
        <p>
          This project is not affiliated with, endorsed by, or sponsored by
          FIFA or any of its partners. Any visual references to FIFA, the
          World Cup, team names, or competition branding are used purely in a
          descriptive, transformative capacity — including renderings in
          languages other than the original — to identify the real-world
          tournament this site tracks, not to claim official status or
          ownership.
        </p>
        <p>
          All trademarks, logos, and brand names mentioned or depicted remain
          the property of their respective owners. Match data is sourced from
          public third-party APIs and may be delayed or inaccurate; this site
          should not be relied on as an authoritative source.
        </p>
        <p>
          If you are a rights holder and have a concern about how content is
          used here, please reach out and it will be addressed promptly.
        </p>
      </div>

      <p className="text-xs text-white/40">
        Built by{" "}
        <a
          href="https://satishhebbal.design"
          target="_blank"
          rel="noopener noreferrer"
          className="text-white/60 underline underline-offset-2 hover:text-white"
        >
          satishhebbal.design
        </a>
      </p>
    </main>
  );
}
