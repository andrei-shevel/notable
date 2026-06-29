import fastifySwagger from '@fastify/swagger';
import fastifySwaggerUi from '@fastify/swagger-ui';
import fp from 'fastify-plugin';
import { jsonSchemaTransform, jsonSchemaTransformObject } from 'fastify-type-provider-zod';

// OpenAPI docs, generated from the same Zod schemas that already validate and
// serialize every route (via fastify-type-provider-zod). No second source of
// truth: `jsonSchemaTransform` converts each route's Zod `schema` into the
// JSON-Schema the OpenAPI document needs, so the spec can never drift from
// what the API actually accepts and returns.
//
// Must register before the routes so @fastify/swagger's onRoute hook can
// observe each schema as it's added. The Swagger UI is mounted at /api/docs so
// it sits under the path Caddy already proxies (`/api/*`) in production.
export default fp(async (app) => {
  await app.register(fastifySwagger, {
    openapi: {
      info: {
        title: 'Notable API',
        description: 'HTTP API for Notable, generated from the shared Zod schemas.',
        version: '0.0.0',
      },
      // Auth is a JWT carried in the httpOnly `session` cookie. Declaring the
      // scheme lets the docs show which routes require a session.
      components: {
        securitySchemes: {
          sessionCookie: {
            type: 'apiKey',
            in: 'cookie',
            name: 'session',
          },
        },
      },
    },
    // Turn the per-route Zod schemas (and the top-level document) into the
    // JSON-Schema dialect OpenAPI expects.
    transform: jsonSchemaTransform,
    transformObject: jsonSchemaTransformObject,
  });

  await app.register(fastifySwaggerUi, {
    routePrefix: '/api/docs',
  });
});
