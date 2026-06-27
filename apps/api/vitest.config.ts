import { fileURLToPath, URL } from 'node:url';

import { defineConfig } from 'vitest/config';

// The suite runs against a real Postgres (via Testcontainers) so the
// database-specific behaviour the code relies on — atomic UPDATE...RETURNING,
// citext, the generated tsvector column, trigram search, FK cascades — is
// actually exercised rather than mocked away. One container is started in
// globalSetup and shared across files; see test/globalSetup.ts.
export default defineConfig({
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
  test: {
    include: ['test/**/*.test.ts'],
    globalSetup: ['./test/globalSetup.ts'],
    // All files share one Postgres container, and each truncates between tests.
    // Running files in parallel would let one file's TRUNCATE wipe another's
    // seeded data mid-test, so serialize at the file level. Tests within a file
    // already run sequentially.
    fileParallelism: false,
    // Dummy values so config.ts parses when the HTTP tests import the plugins
    // and routes. Nothing here is actually dialed: services are faked and the
    // DB tests connect via the container URL injected from globalSetup, not
    // config. JWT_SECRET is real enough (>=32 chars) to sign/verify test
    // sessions.
    env: {
      DATABASE_URL: 'postgres://unused:unused@localhost:5432/unused',
      JWT_SECRET: 'test-jwt-secret-please-only-for-tests-0123456789',
      SMTP_URL: 'smtp://localhost:2525',
      S3_ENDPOINT: 'http://localhost:9000',
      S3_BUCKET: 'test-bucket',
      S3_ACCESS_KEY: 'test',
      S3_SECRET_KEY: 'test',
    },
    // Container start + migrate on a cold image pull is slow; give hooks room.
    hookTimeout: 120_000,
    testTimeout: 30_000,
  },
});
