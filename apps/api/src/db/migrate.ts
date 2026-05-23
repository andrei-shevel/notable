// Standalone migration runner used by the api container's entrypoint and by
// `pnpm --filter @notable/api db:migrate` on the host. Kept separate from
// server.ts so migrations can finish (and fail loudly) before Fastify even
// tries to bind a port.

import { drizzle } from 'drizzle-orm/postgres-js';
import { migrate } from 'drizzle-orm/postgres-js/migrator';
import postgres from 'postgres';

const url = process.env.DATABASE_URL;
if (!url) {
  throw new Error('DATABASE_URL is required');
}

// max=1 because the migrator opens a single advisory-locked connection;
// anything higher just wastes sockets for a one-shot script.
const client = postgres(url, { max: 1, prepare: false });

try {
  await migrate(drizzle(client), { migrationsFolder: './drizzle' });
} finally {
  await client.end({ timeout: 5 });
}
