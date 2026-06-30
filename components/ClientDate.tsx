"use client";

import { useEffect, useState, type ReactNode } from "react";

/**
 * Renders a locale/timezone-dependent date string only after mount, so the
 * server HTML and the first client render are identical (a space placeholder)
 * and there is never a hydration mismatch. suppressHydrationWarning is kept as
 * a belt-and-suspenders guard.
 */
export default function ClientDate({
  iso,
  children,
  className,
}: {
  iso: string;
  children: (date: Date) => ReactNode;
  className?: string;
}) {
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  return (
    <span className={className} suppressHydrationWarning>
      {mounted ? children(new Date(iso)) : " "}
    </span>
  );
}
