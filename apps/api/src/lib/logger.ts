import { randomUUID } from 'node:crypto';
import type { IncomingMessage } from 'node:http';
import type { FastifyRequest, FastifyServerOptions } from 'fastify';
import { config } from '@/config';

// Fastify/pino logging configuration, kept out of the bootstrap in server.ts so
// the (security-sensitive) serializer and redaction rules live in one place.
export function buildLoggerOptions(): FastifyServerOptions['logger'] {
  return {
    level: config.LOG_LEVEL,
    transport: config.NODE_ENV === 'development' ? { target: 'pino-pretty' } : undefined,
    // Custom serializers keep each request/response line small and — for the
    // request — emit only an allowlist of headers. An allowlist (rather than
    // redacting known-bad keys) is what guarantees the session JWT, which rides
    // in the `cookie` header, can never reach the log sink even if a new
    // sensitive header is added later.
    serializers: {
      req(req: FastifyRequest) {
        return {
          method: req.method,
          url: req.url,
          // Low-cardinality route pattern (e.g. /api/notes/:id) for grouping.
          routeUrl: req.routeOptions?.url,
          remoteAddress: req.ip,
          host: req.headers.host,
          userAgent: req.headers['user-agent'],
        };
      },
      res(res: { statusCode: number }) {
        return { statusCode: res.statusCode };
      },
    },
    // Defense in depth: censor secrets at any ad-hoc log site that dumps raw
    // headers or an error carrying them, beyond what the serializers above
    // already drop.
    redact: {
      paths: [
        'req.headers.cookie',
        'req.headers.authorization',
        'res.headers["set-cookie"]',
        'headers.cookie',
        'headers.authorization',
      ],
      censor: '[redacted]',
    },
  };
}

// Correlate logs across a proxy or client retry: honor an inbound x-request-id,
// otherwise mint a uuid. Replaces Fastify's default in-process counter, which
// resets on restart and collides across replicas.
export function genReqId(req: IncomingMessage): string {
  const header = req.headers['x-request-id'];
  return (Array.isArray(header) ? header[0] : header) ?? randomUUID();
}
