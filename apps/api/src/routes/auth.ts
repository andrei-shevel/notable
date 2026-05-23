import { createHash, randomBytes } from 'node:crypto';
import { and, eq, gt, isNull, sql } from 'drizzle-orm';
import type { FastifyPluginAsyncZod } from 'fastify-type-provider-zod';
import { z } from 'zod';
import {
  LoginRequestSchema,
  LoginResponseSchema,
  LogoutResponseSchema,
  MeResponseSchema,
} from '@notable/shared';
import { db } from '../db/client.js';
import { authTokens, users } from '../db/schema.js';
import { sendMagicLink } from '../mail/magicLink.js';
import { requireUser } from '../plugins/auth.js';
import { SESSION_COOKIE } from '../plugins/jwt.js';

const SESSION_MAX_AGE_SECONDS = 60 * 60 * 24 * 30; // 30 days
const TOKEN_TTL_MS = 15 * 60 * 1000; // 15 minutes
const TOKEN_BYTES = 32;

const VerifyQuerySchema = z.object({ token: z.string().min(1).max(256) });

const authRoutes: FastifyPluginAsyncZod = async (app) => {
  const publicUrl = process.env.PUBLIC_URL;
  if (!publicUrl) {
    throw new Error('PUBLIC_URL is required');
  }
  const isProd = process.env.NODE_ENV === 'production';

  app.post(
    '/login',
    {
      schema: {
        body: LoginRequestSchema,
        response: { 200: LoginResponseSchema },
      },
      // 5 attempts per 15 minutes per IP. Anti-enumeration is handled by
      // always returning 200 regardless of whether the email exists.
      config: { rateLimit: { max: 5, timeWindow: '15 minutes' } },
    },
    async (req) => {
      const email = req.body.email.trim().toLowerCase();

      // Find-or-create in one round-trip. `DO UPDATE SET email = EXCLUDED.email`
      // is a no-op write whose only purpose is forcing RETURNING to fire on
      // both branches (insert and conflict).
      const [user] = await db
        .insert(users)
        .values({ email })
        .onConflictDoUpdate({ target: users.email, set: { email } })
        .returning();
      if (!user) {
        // Shouldn't happen — ON CONFLICT DO UPDATE always returns a row.
        // Log loudly but stay quiet to the client.
        req.log.error({ email }, 'find-or-create user returned no row');
        return { ok: true as const };
      }

      const tokenBytes = randomBytes(TOKEN_BYTES);
      const token = tokenBytes.toString('base64url');
      const tokenHash = createHash('sha256').update(tokenBytes).digest();
      const expiresAt = new Date(Date.now() + TOKEN_TTL_MS);

      await db.insert(authTokens).values({
        tokenHash,
        userId: user.id,
        expiresAt,
      });

      const url = `${publicUrl}/api/auth/verify?token=${token}`;
      try {
        await sendMagicLink(email, url);
      } catch (err) {
        // SMTP failures are an infra issue, not a client one. Log and stay
        // silent to avoid leaking deliverability signal.
        req.log.error({ err }, 'magic-link email failed');
      }
      return { ok: true as const };
    },
  );

  app.get(
    '/verify',
    {
      schema: { querystring: VerifyQuerySchema },
    },
    async (req, reply) => {
      // base64url decode is lenient; an invalid payload yields a short
      // buffer which we reject by length below.
      const tokenBytes = Buffer.from(req.query.token, 'base64url');
      if (tokenBytes.length !== TOKEN_BYTES) {
        return reply.redirect(`${publicUrl}/login?error=invalid`);
      }
      const tokenHash = createHash('sha256').update(tokenBytes).digest();

      // Atomic consume: one UPDATE that flips consumed_at iff the row is
      // still valid and unused. The optional RETURNING tells us whether
      // the row was a hit. Prevents the classic select-then-update race
      // where the same token is replayed concurrently.
      const [consumed] = await db
        .update(authTokens)
        .set({ consumedAt: new Date() })
        .where(
          and(
            eq(authTokens.tokenHash, tokenHash),
            gt(authTokens.expiresAt, sql`now()`),
            isNull(authTokens.consumedAt),
          ),
        )
        .returning({ userId: authTokens.userId });

      if (!consumed) {
        return reply.redirect(`${publicUrl}/login?error=invalid`);
      }

      const jwt = await reply.jwtSign({ sub: consumed.userId }, { expiresIn: '30d' });
      reply.setCookie(SESSION_COOKIE, jwt, {
        httpOnly: true,
        secure: isProd,
        sameSite: 'lax',
        path: '/',
        maxAge: SESSION_MAX_AGE_SECONDS,
      });
      return reply.redirect(`${publicUrl}/`);
    },
  );

  app.post(
    '/logout',
    { schema: { response: { 200: LogoutResponseSchema } } },
    async (_req, reply) => {
      reply.clearCookie(SESSION_COOKIE, { path: '/' });
      return { ok: true as const };
    },
  );

  app.get(
    '/me',
    {
      preHandler: requireUser,
      schema: {
        response: {
          200: MeResponseSchema,
          401: z.object({ error: z.string() }),
        },
      },
    },
    async (req, reply) => {
      const [user] = await db
        .select({ id: users.id, email: users.email })
        .from(users)
        .where(eq(users.id, req.user.id));
      if (!user) {
        // JWT valid but user row gone (account deletion / wiped DB). Treat
        // as unauthenticated rather than 500.
        return reply.code(401).send({ error: 'unauthorized' });
      }
      return user;
    },
  );
};

export default authRoutes;
