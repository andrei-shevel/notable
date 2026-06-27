import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import { config } from '@/config';
import * as schema from './schema';

// One pooled connection per server process. The pool size is conservative so
// PgBouncer (added later for horizontal scaling) doesn't have to chase
// runaway connection counts.
export const sql = postgres(config.DATABASE_URL, {
  max: 10,
  prepare: false,
});

export const db = drizzle(sql, { schema });
