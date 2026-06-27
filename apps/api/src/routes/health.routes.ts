import type { FastifyPluginAsyncZod } from 'fastify-type-provider-zod';
import { z } from 'zod';
import { sql } from '@/db/client';

export const healthRoutes: FastifyPluginAsyncZod = async (app) => {
  app.get(
    '/api/health',
    {
      // Liveness/readiness probes hit this on a tight interval; logging every
      // routine 200 would drown the log. `warn` keeps the noise out while still
      // surfacing the request log if the handler ever errors.
      logLevel: 'warn',
      schema: {
        response: {
          200: z.object({ db: z.literal('ok') }),
        },
      },
    },
    async () => {
      await sql`select 1`;
      return { db: 'ok' as const };
    },
  );
};
