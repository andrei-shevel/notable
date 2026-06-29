import fp from 'fastify-plugin';
import rateLimit from '@fastify/rate-limit';
import { Redis } from 'ioredis';
import { config } from '@/config';

// `global: false` so routes opt-in via `config.rateLimit`. Today only the auth
// routes throttle (see auth.routes.ts) — e.g. POST /api/auth/login at 5 per
// 15min per IP — to slow magic-link/code flooding; other endpoints stay
// unthrottled until we have reason to clamp them.
//
// Store: in-memory by default, which is correct for a single api container.
// When REDIS_URL is set the limiter uses a shared Redis store instead, so the
// per-IP windows are enforced across every replica and survive restarts. Set
// REDIS_URL once you run more than one api instance behind a load balancer.
export default fp(async (app) => {
  if (!config.REDIS_URL) {
    await app.register(rateLimit, { global: false });
    return;
  }

  // connectTimeout + maxRetriesPerRequest stop a slow or unreachable Redis from
  // stalling requests. @fastify/rate-limit's skipOnError (default true) then
  // lets the request through when the store errors, so a Redis outage degrades
  // to "unthrottled" rather than failing every request.
  const redis = new Redis(config.REDIS_URL, {
    connectTimeout: 500,
    maxRetriesPerRequest: 1,
  });
  redis.on('error', (err) => app.log.error({ err }, 'rate-limit redis error'));

  // The plugin uses the client we hand it but never closes it (it didn't open
  // it), so quit it ourselves when the app shuts down.
  app.addHook('onClose', async () => {
    await redis.quit();
  });

  await app.register(rateLimit, { global: false, redis });
  app.log.info('rate-limit store: redis');
});
