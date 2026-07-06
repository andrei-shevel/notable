import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  // Static export — Caddy serves the `out/` folder from /srv-landing; there is
  // no Node server for the landing in production.
  output: 'export',
  // @notable/ui ships raw TypeScript + SCSS modules; Next compiles it like
  // local source.
  transpilePackages: ['@notable/ui'],
};

export default nextConfig;
