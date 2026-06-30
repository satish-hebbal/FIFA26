import type { Metadata, Viewport } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "FIFA World Cup 2026 — Bracket & Live Scores",
  description:
    "Live FIFA World Cup 2026 knockout bracket and in-play scores. The 32-team tree fills in as matches finish.",
};

export const viewport: Viewport = {
  themeColor: "#0a1f6b",
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
