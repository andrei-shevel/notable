import { defineConfig } from 'vitest/config';

// The suite runs against a real Postgres (via Testcontainers) so the
// database-specific behaviour the code relies on — atomic UPDATE...RETURNING,
// citext, the generated tsvector column, trigram search, FK cascades — is
// actually exercised rather than mocked away. One container is started in
// globalSetup and shared across files; see test/globalSetup.ts.
export default defineConfig({
  test: {
    include: ['test/**/*.test.ts'],
    globalSetup: ['./test/globalSetup.ts'],
    // Container start + migrate on a cold image pull is slow; give hooks room.
    hookTimeout: 120_000,
    testTimeout: 30_000,
  },
});
