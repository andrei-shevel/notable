import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import { inject } from 'vitest';

import * as schema from '@/db/schema';

export type TestDb = ReturnType<typeof connectTestDb>;

// Opens a Drizzle-wrapped connection pool to the already-running test container
// (globalSetup started and migrated it). We build the client directly here
// rather than importing src/db/client so the repositories can be tested without
// booting the full app config — which would demand S3/SMTP env vars irrelevant
// to a database test. The pool has a few connections so concurrency tests get
// genuine parallelism, not a serialized single socket.
export function connectTestDb() {
  const client = postgres(inject('databaseUrl'), { max: 5, prepare: false });
  const db = drizzle(client, { schema });
  return { db, client };
}

// Wipes every table between tests. CASCADE clears FK-dependent rows regardless
// of the order listed; all PKs are uuids so RESTART IDENTITY is just hygiene.
export async function truncateAll(client: postgres.Sql) {
  await client`TRUNCATE TABLE
    users, notes, files, tags, note_tags, auth_tokens, email_change_tokens
    RESTART IDENTITY CASCADE`;
}
