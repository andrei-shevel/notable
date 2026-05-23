import fp from 'fastify-plugin';
import rateLimit from '@fastify/rate-limit';

// `global: false` so routes opt-in via `config.rateLimit`. Step 7 only uses
// this on POST /api/auth/login (5 per 15min per IP) to slow magic-link
// flooding; other endpoints stay unthrottled until we have reason to clamp
// them. State is in-memory — fine for a single api container; swap to the
// Redis store if we ever run more than one replica.
export default fp(async (app) => {
  await app.register(rateLimit, { global: false });
});
