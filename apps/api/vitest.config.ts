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
    // All files share one Postgres container, and each truncates between tests.
    // Running files in parallel would let one file's TRUNCATE wipe another's
    // seeded data mid-test, so serialize at the file level. Tests within a file
    // already run sequentially.
    fileParallelism: false,
    // Container start + migrate on a cold image pull is slow; give hooks room.
    hookTimeout: 120_000,
    testTimeout: 30_000,
  },
});
