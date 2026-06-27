import { fileURLToPath } from 'node:url';
import { PostgreSqlContainer } from '@testcontainers/postgresql';
import { drizzle } from 'drizzle-orm/postgres-js';
import { migrate } from 'drizzle-orm/postgres-js/migrator';
import postgres from 'postgres';
import type { TestProject } from 'vitest/node';

// Started once for the whole run and torn down via the returned cleanup. The
// connection URL is handed to test files through Vitest's provide/inject
// channel (env vars set here don't cross into the worker processes). Vitest 4
// passes the TestProject to global setup; provide() lives on it.
export default async function setup({ provide }: TestProject) {
  const container = await new PostgreSqlContainer('postgres:16-alpine').start();
  const databaseUrl = container.getConnectionUri();

  // Apply the same Drizzle migrations the app ships, so tests see the real
  // schema (extensions, citext, generated columns, indexes) — not an
  // approximation. Resolved from this file so cwd doesn't matter.
  const migrationsFolder = fileURLToPath(new URL('../drizzle', import.meta.url));
  const migrationClient = postgres(databaseUrl, { max: 1, prepare: false });
  try {
    await migrate(drizzle(migrationClient), { migrationsFolder });
  } finally {
    await migrationClient.end({ timeout: 5 });
  }

  provide('databaseUrl', databaseUrl);

  return async () => {
    await container.stop();
  };
}
