import type { FastifyError, FastifyInstance } from 'fastify';
import { hasZodFastifySchemaValidationErrors } from 'fastify-type-provider-zod';
import { AppError } from './AppError';

export function registerErrorHandler(app: FastifyInstance) {
  app.setErrorHandler<FastifyError>((err, req, reply) => {
    // Fastify's Zod validation failures already carry the right status code
    // (400) and a `validation` array. Let the default handler format them.
    if (hasZodFastifySchemaValidationErrors(err)) {
      return reply.send(err);
    }

    if (err instanceof AppError) {
      return reply.code(err.statusCode).send({ error: err.message });
    }

    // Rate-limit, JWT, and other Fastify errors come with a statusCode but
    // we still want to log unexpected 5xx — they signal real bugs.
    const statusCode = err.statusCode ?? 500;
    if (statusCode >= 500) {
      req.log.error({ err }, 'unhandled error');
      return reply.code(500).send({ error: 'Internal server error' });
    }

    return reply.code(statusCode).send({ error: err.message });
  });
}
