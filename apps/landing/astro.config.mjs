import { defineConfig } from 'astro/config';

// https://astro.build/config
export default defineConfig({
  // Output static HTML — Caddy serves the build folder from /srv-landing.
  output: 'static',
  // Strip the trailing slash on internal links; matches Caddy's
  // `try_files {path} {path}/ /index.html` fallback so /pricing resolves to
  // /pricing/index.html without a redirect.
  trailingSlash: 'ignore',
});
