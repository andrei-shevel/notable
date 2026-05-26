import { pathToFileURL } from 'node:url';
import Fastify, { type FastifyInstance } from 'fastify';
import {
  serializerCompiler,
  validatorCompiler,
  type ZodTypeProvider,
} from 'fastify-type-provider-zod';
import { z } from 'zod';
import { config } from './config';
import { db, sql } from './db/client';
import { registerErrorHandler } from './errors/handler';
import cookiePlugin from './plugins/cookie';
import jwtPlugin from './plugins/jwt';
import ratelimitPlugin from './plugins/ratelimit';
import { createAuthRepository } from './repositories/auth.repository';
import { createNotesRepository } from './repositories/notes.repository';
import { authRoutes } from './routes/auth.routes';
import { notesRoutes } from './routes/notes.routes';
import { createAuthService } from './services/auth.service';
import { createNotesService } from './services/notes.service';

export async function buildApp(): Promise<FastifyInstance> {
  const app = Fastify({
    logger: {
      level: config.LOG_LEVEL,
      transport: config.NODE_ENV === 'development' ? { target: 'pino-pretty' } : undefined,
    },
    disableRequestLogging: false,
  }).withTypeProvider<ZodTypeProvider>();

  app.setValidatorCompiler(validatorCompiler);
  app.setSerializerCompiler(serializerCompiler);
  registerErrorHandler(app);

  // Order matters: cookie must register before jwt (jwt reads the cookie),
  // and rate-limit before any route that opts in via `config.rateLimit`.
  await app.register(cookiePlugin);
  await app.register(jwtPlugin);
  await app.register(ratelimitPlugin);

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

  const authRepository = createAuthRepository(db);
  const authService = createAuthService({ repo: authRepository, logger: app.log });

  const notesRepository = createNotesRepository(db);
  const notesService = createNotesService({ repo: notesRepository });

  await app.register(authRoutes, { prefix: '/api/auth', authService });
  await app.register(notesRoutes, { prefix: '/api/notes', notesService });

  return app;
}

async function start() {
  const app = await buildApp();

  try {
    await app.listen({ host: '0.0.0.0', port: config.PORT });
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
}

// Run when invoked directly (tsx src/server.ts), but stay importable for tests.
const entry = process.argv[1];
if (entry && import.meta.url === pathToFileURL(entry).href) {
  await start();
}
