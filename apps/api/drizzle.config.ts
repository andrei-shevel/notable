import { defineConfig } from 'drizzle-kit';

// DATABASE_URL is only required for `drizzle-kit migrate` / `pull` / `push`
// (anything that touches a live database). It's optional for `generate`,
// which only reads the TS schema, so we don't throw at import time.
export default defineConfig({
  schema: './src/db/schema.ts',
  out: './drizzle',
  dialect: 'postgresql',
  dbCredentials: { url: process.env.DATABASE_URL ?? '' },
  strict: true,
  verbose: true,
});
