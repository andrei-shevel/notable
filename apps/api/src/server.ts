import { pathToFileURL } from 'node:url';
import multipart from '@fastify/multipart';
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
import { createStorage, s3 } from './lib/storage';
import cookiePlugin from './plugins/cookie';
import jwtPlugin from './plugins/jwt';
import ratelimitPlugin from './plugins/ratelimit';
import { createAuthRepository } from './repositories/auth.repository';
import { createFilesRepository } from './repositories/files.repository';
import { createNotesRepository } from './repositories/notes.repository';
import { authRoutes } from './routes/auth.routes';
import { filesRoutes } from './routes/files.routes';
import { notesRoutes } from './routes/notes.routes';
import { createAuthService } from './services/auth.service';
import { createFilesService } from './services/files.service';
import { createNotesService } from './services/notes.service';

// Hard cap on upload size. The file streams to object storage rather than
// being buffered, but the limit still bounds how much a single request can
// push and lets @fastify/multipart reject oversized uploads with a 413.
const MAX_UPLOAD_BYTES = 25 * 1024 * 1024;

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
  await app.register(multipart, { limits: { fileSize: MAX_UPLOAD_BYTES, files: 1 } });

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

  // filesService depends on notesRepository (to authorize uploads against the
  // owning note); notesService depends on filesService (to purge a deleted
  // note's files). No cycle: notes → files → notes *repository*, not service.
  const notesRepository = createNotesRepository(db);
  const filesRepository = createFilesRepository(db);
  const storage = createStorage({ client: s3, bucket: config.S3_BUCKET });
  const filesService = createFilesService({
    repo: filesRepository,
    notesRepo: notesRepository,
    storage,
  });
  const notesService = createNotesService({ repo: notesRepository, files: filesService });

  await app.register(authRoutes, { prefix: '/api/auth', authService });
  await app.register(notesRoutes, { prefix: '/api/notes', notesService });
  await app.register(filesRoutes, { prefix: '/api/files', filesService });

  return app;
}

async function start() {
  const app = await buildApp();

  // Create the storage bucket up front so the first upload doesn't fail against
  // a fresh MinIO instance (which starts with no buckets).
  try {
    await createStorage({ client: s3, bucket: config.S3_BUCKET }).ensureBucket();
  } catch (err) {
    app.log.error(err, 'failed to ensure storage bucket');
    process.exit(1);
  }

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
