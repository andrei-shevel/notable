import Fastify from 'fastify';
import {
  serializerCompiler,
  validatorCompiler,
  type ZodTypeProvider,
} from 'fastify-type-provider-zod';
import { z } from 'zod';
import { sql } from './db/client.js';

const app = Fastify({
  logger: {
    level: process.env.LOG_LEVEL ?? 'info',
    transport:
      process.env.NODE_ENV === 'development'
        ? { target: 'pino-pretty' }
        : undefined,
  },
  disableRequestLogging: false,
}).withTypeProvider<ZodTypeProvider>();

app.setValidatorCompiler(validatorCompiler);
app.setSerializerCompiler(serializerCompiler);

app.get(
  '/api/health',
  {
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

const port = Number(process.env.PORT ?? 3000);

try {
  await app.listen({ host: '0.0.0.0', port });
} catch (err) {
  app.log.error(err);
  process.exit(1);
}

// Graceful shutdown so the postgres pool drains cleanly when the container
// receives SIGTERM (e.g. docker compose down, k8s rolling deploy).
for (const signal of ['SIGINT', 'SIGTERM'] as const) {
  process.on(signal, async () => {
    app.log.info({ signal }, 'shutting down');
    await app.close();
    await sql.end({ timeout: 5 });
    process.exit(0);
  });
}
