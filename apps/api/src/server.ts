import { pathToFileURL } from 'node:url';
import multipart from '@fastify/multipart';
import Fastify, { type FastifyInstance } from 'fastify';
import {
  serializerCompiler,
  validatorCompiler,
  type ZodTypeProvider,
} from 'fastify-type-provider-zod';
import { config } from '@/config';
import { createServices } from '@/container';
import { registerErrorHandler } from '@/errors/handler';
import { ensureBucket, registerGracefulShutdown } from '@/lib/lifecycle';
import { buildLoggerOptions, genReqId } from '@/lib/logger';
import cookiePlugin from '@/plugins/cookie';
import jwtPlugin from '@/plugins/jwt';
import ratelimitPlugin from '@/plugins/ratelimit';
import { authRoutes } from '@/routes/auth.routes';
import { filesRoutes } from '@/routes/files.routes';
import { healthRoutes } from '@/routes/health.routes';
import { notesRoutes } from '@/routes/notes.routes';

// Hard cap on upload size. The file streams to object storage rather than
// being buffered, but the limit still bounds how much a single request can
// push and lets @fastify/multipart reject oversized uploads with a 413.
const MAX_UPLOAD_BYTES = 25 * 1024 * 1024;

export async function buildApp(): Promise<FastifyInstance> {
  const app = Fastify({
    logger: buildLoggerOptions(),
    genReqId,
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

  await app.register(healthRoutes);

  const { authService, notesService, filesService } = createServices(app.log);

  await app.register(authRoutes, { prefix: '/api/auth', authService });
  await app.register(notesRoutes, { prefix: '/api/notes', notesService });
  await app.register(filesRoutes, { prefix: '/api/files', filesService });

  return app;
}

async function start() {
  const app = await buildApp();

  await ensureBucket(app);

  try {
    await app.listen({ host: '0.0.0.0', port: config.PORT });
  } catch (err) {
    app.log.error(err);
    process.exit(1);
  }

  registerGracefulShutdown(app);
}

// Run when invoked directly (tsx src/server.ts), but stay importable for tests.
const entry = process.argv[1];
if (entry && import.meta.url === pathToFileURL(entry).href) {
  await start();
}
