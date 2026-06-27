import { randomUUID } from 'node:crypto';
import Fastify, { type FastifyInstance } from 'fastify';
import {
  serializerCompiler,
  validatorCompiler,
  type ZodTypeProvider,
} from 'fastify-type-provider-zod';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { InvalidCredentialsError, NotFoundError } from '@/errors/AppError';
import { registerErrorHandler } from '@/errors/handler';
import cookiePlugin from '@/plugins/cookie';
import jwtPlugin from '@/plugins/jwt';
import { authRoutes } from '@/routes/auth.routes';
import { notesRoutes } from '@/routes/notes.routes';
import type { AuthService } from '@/services/auth.service';
import type { NotesService } from '@/services/notes.service';

// Real UUIDs: the response serializer and the :id param both enforce
// z.uuid()'s RFC variant/version check, so hand-rolled ids like 1111… would
// fail validation (500 on serialize, 400 on the param).
const USER_ID = randomUUID();

// A response-schema-valid Note: the serializer validates outbound bodies, so a
// malformed fixture would surface as a 500 rather than the 200 we assert.
const NOTE = {
  id: randomUUID(),
  title: 'Hello',
  bodyJson: { type: 'doc', content: [] },
  bodyText: '',
  starred: false,
  trashedAt: null,
  createdAt: '2026-01-01T00:00:00.000Z',
  updatedAt: '2026-01-01T00:00:00.000Z',
};

function makeServices() {
  const auth = {
    initiateLogin: vi.fn(async () => {}),
    verifyCode: vi.fn(async () => ({ userId: USER_ID })),
    getCurrentUser: vi.fn(async () => ({ id: USER_ID, email: 'alice@example.com' })),
    requestEmailChange: vi.fn(async () => {}),
    confirmEmailChange: vi.fn(async () => ({ id: USER_ID, email: 'new@example.com' })),
    deleteAccount: vi.fn(async () => {}),
  };
  const notes = {
    list: vi.fn(async (_userId: string, _opts?: unknown) => ({ items: [NOTE], nextCursor: null })),
    get: vi.fn(async (_userId: string, _id: string) => NOTE),
    create: vi.fn(async (_userId: string, _input: unknown) => NOTE),
    update: vi.fn(async (_userId: string, _id: string, _patch: unknown) => NOTE),
    delete: vi.fn(async (_userId: string, _id: string) => {}),
  };
  return { auth, notes };
}

async function buildTestApp(services: ReturnType<typeof makeServices>): Promise<FastifyInstance> {
  // Mirrors the relevant slice of buildApp: zod compilers + error handler +
  // cookie/jwt, then the routes wired to fakes. No DB, S3, multipart, or
  // rate-limit — this exercises validation, auth gating, and error mapping.
  const app = Fastify().withTypeProvider<ZodTypeProvider>();
  app.setValidatorCompiler(validatorCompiler);
  app.setSerializerCompiler(serializerCompiler);
  registerErrorHandler(app);
  await app.register(cookiePlugin);
  await app.register(jwtPlugin);
  await app.register(authRoutes, {
    prefix: '/api/auth',
    authService: services.auth as unknown as AuthService,
  });
  await app.register(notesRoutes, {
    prefix: '/api/notes',
    notesService: services.notes as unknown as NotesService,
  });
  await app.ready();
  return app;
}

describe('http routes', () => {
  let services: ReturnType<typeof makeServices>;
  let app: FastifyInstance;
  let session: string;

  beforeEach(async () => {
    services = makeServices();
    app = await buildTestApp(services);
    // Mint a session the same way /verify does (sign { sub }).
    session = app.jwt.sign({ sub: USER_ID });
  });

  afterEach(() => app.close());

  describe('auth gating', () => {
    it('rejects a protected notes request without a session', async () => {
      const res = await app.inject({ method: 'GET', url: '/api/notes' });
      expect(res.statusCode).toBe(401);
      expect(res.json()).toEqual({ error: 'unauthorized' });
      expect(services.notes.list).not.toHaveBeenCalled();
    });

    it('rejects /auth/me without a session', async () => {
      const res = await app.inject({ method: 'GET', url: '/api/auth/me' });
      expect(res.statusCode).toBe(401);
    });

    it('rejects a tampered/garbage session token', async () => {
      const res = await app.inject({
        method: 'GET',
        url: '/api/notes',
        cookies: { session: 'not.a.jwt' },
      });
      expect(res.statusCode).toBe(401);
    });

    it('serves a protected request and threads the JWT sub through as the user id', async () => {
      const res = await app.inject({
        method: 'GET',
        url: '/api/notes',
        cookies: { session },
      });
      expect(res.statusCode).toBe(200);
      expect(res.json()).toEqual({ items: [NOTE], nextCursor: null });
      // The handler must call the service with the id decoded from the cookie.
      expect(services.notes.list.mock.calls[0]![0]).toBe(USER_ID);
    });
  });

  describe('request validation', () => {
    it('400s a malformed login body before reaching the service', async () => {
      const res = await app.inject({
        method: 'POST',
        url: '/api/auth/login',
        payload: { email: 'not-an-email' },
      });
      expect(res.statusCode).toBe(400);
      expect(services.auth.initiateLogin).not.toHaveBeenCalled();
    });

    it('400s a non-uuid note id param', async () => {
      const res = await app.inject({
        method: 'GET',
        url: '/api/notes/not-a-uuid',
        cookies: { session },
      });
      expect(res.statusCode).toBe(400);
      expect(services.notes.get).not.toHaveBeenCalled();
    });

    it('400s an out-of-range list limit', async () => {
      const res = await app.inject({
        method: 'GET',
        url: '/api/notes?limit=999',
        cookies: { session },
      });
      expect(res.statusCode).toBe(400);
    });
  });

  describe('happy paths', () => {
    it('accepts a valid login and delegates to the service', async () => {
      const res = await app.inject({
        method: 'POST',
        url: '/api/auth/login',
        payload: { email: 'alice@example.com' },
      });
      expect(res.statusCode).toBe(200);
      expect(res.json()).toEqual({ ok: true });
      expect(services.auth.initiateLogin).toHaveBeenCalledWith('alice@example.com');
    });

    it('sets an httpOnly session cookie on verify', async () => {
      const res = await app.inject({
        method: 'POST',
        url: '/api/auth/verify',
        payload: { email: 'alice@example.com', code: '123456' },
      });
      expect(res.statusCode).toBe(200);
      const setCookie = res.headers['set-cookie'];
      const cookieStr = Array.isArray(setCookie) ? setCookie.join(';') : String(setCookie);
      expect(cookieStr).toMatch(/session=/);
      expect(cookieStr).toMatch(/HttpOnly/i);
    });

    it('creates a note for the authenticated user', async () => {
      const res = await app.inject({
        method: 'POST',
        url: '/api/notes',
        cookies: { session },
        payload: { title: 'Hi' },
      });
      expect(res.statusCode).toBe(200);
      expect(res.json()).toMatchObject({ id: NOTE.id });
      expect(services.notes.create.mock.calls[0]![0]).toBe(USER_ID);
      expect(services.notes.create.mock.calls[0]![1]).toEqual({ title: 'Hi' });
    });
  });

  describe('error mapping', () => {
    it('maps a service NotFoundError to 404 with an error body', async () => {
      services.notes.get.mockRejectedValueOnce(new NotFoundError());
      const res = await app.inject({
        method: 'GET',
        url: `/api/notes/${NOTE.id}`,
        cookies: { session },
      });
      expect(res.statusCode).toBe(404);
      expect(res.json()).toEqual({ error: 'Not found' });
    });

    it('maps InvalidCredentialsError to a uniform 400 on verify', async () => {
      services.auth.verifyCode.mockRejectedValueOnce(new InvalidCredentialsError());
      const res = await app.inject({
        method: 'POST',
        url: '/api/auth/verify',
        payload: { email: 'alice@example.com', code: '000000' },
      });
      expect(res.statusCode).toBe(400);
      expect(res.json()).toEqual({ error: 'Invalid code' });
      expect(res.headers['set-cookie']).toBeUndefined();
    });
  });
});
