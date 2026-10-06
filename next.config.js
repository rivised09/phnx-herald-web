/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // How long the client router may reuse a segment it has already fetched.
  // Without this every back/forward re-asks the server, which means re-asking
  // the database, which is the slow part of the roster. 30s only ever covers
  // navigation the user has just made; every mutation already ends in
  // router.refresh(), which throws the cached trees away.
  experimental: {
    staleTimes: {
      dynamic: 30,
      static: 180,
    },
  },
  // The Prisma client opens a native engine at runtime, so it has to stay in
  // node_modules instead of being folded into the server bundle.
  serverExternalPackages: ['@prisma/client', 'prisma'],
  images: {
    remotePatterns: [
      { protocol: 'https', hostname: 'cdn.discordapp.com' },
    ],
  },
};

module.exports = nextConfig;
