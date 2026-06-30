"use client";

import { useEffect, useState } from "react";

// Cross-fades between the English and Kannada wordmarks on a loop.
const LOGOS = ["/satish-logo-english.svg", "/Satish-logo-kannada.svg"];

export default function LogoLoop() {
  const [active, setActive] = useState(0);

  useEffect(() => {
    const id = setInterval(
      () => setActive((p) => (p + 1) % LOGOS.length),
      2600
    );
    return () => clearInterval(id);
  }, []);

  return (
    <span
      className="logo-mark relative inline-block h-5 w-[72px] align-middle"
      aria-label="Satish Hebbal"
    >
      {LOGOS.map((src, idx) => (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          key={src}
          src={src}
          alt=""
          aria-hidden="true"
          className="absolute inset-0 h-full w-full object-contain object-left transition-opacity duration-700 ease-in-out"
          style={{ opacity: active === idx ? 0.6 : 0 }}
        />
      ))}
    </span>
  );
}
