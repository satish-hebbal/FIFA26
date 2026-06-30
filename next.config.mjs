/** @type {import('next').NextConfig} */
const nextConfig = {
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
