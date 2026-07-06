import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  // Static export — Caddy serves the `out/` folder from /srv-landing; there is
  // no Node server for the landing in production.
  output: 'export',
  // natural ships raw TypeScript + SCSS modules; Next compiles it like
  // local source.
  transpilePackages: ['natural'],
};

export default nextConfig;
