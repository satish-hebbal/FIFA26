/** @type {import('next').NextConfig} */
const nextConfig = {
  // Allow dev access over the LAN (e.g. testing on a phone via 192.168.x.x).
  allowedDevOrigins: ["192.168.29.38"],
  images: {
    // football-data.org serves team crests from crests.football-data.org.
    // We render them via plain <img>, but allow the host here in case
    // next/image is introduced later.
    remotePatterns: [
      { protocol: "https", hostname: "crests.football-data.org" },
      { protocol: "https", hostname: "**.football-data.org" },
    ],
  },
};

export default nextConfig;
