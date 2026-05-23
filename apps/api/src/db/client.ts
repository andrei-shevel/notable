import postgres from 'postgres';

const url = process.env.DATABASE_URL;
if (!url) {
  throw new Error('DATABASE_URL is required');
}

// One pooled connection per server process. The pool size is conservative so
// PgBouncer (added later for horizontal scaling) doesn't have to chase
// runaway connection counts.
export const sql = postgres(url, {
  max: 10,
  prepare: false,
});
