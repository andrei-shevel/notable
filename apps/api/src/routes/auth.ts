import { createHash, randomInt } from 'node:crypto';
import { and, eq, gt, isNull, lt, sql } from 'drizzle-orm';
import type { FastifyPluginAsyncZod } from 'fastify-type-provider-zod';

import {
  ErrorResponseSchema,
  LoginRequestSchema,
  LoginResponseSchema,
  LogoutResponseSchema,
  MeResponseSchema,
  VerifyRequestSchema,
  VerifyResponseSchema,
} from '@notable/shared';
import { db } from '../db/client.js';
import { authTokens, users } from '../db/schema.js';
import { sendLoginCode } from '../mail/loginCode.js';
import { requireUser } from '../plugins/auth.js';
import { SESSION_COOKIE } from '../plugins/jwt.js';

const SESSION_MAX_AGE_SECONDS = 60 * 60 * 24 * 30; // 30 days
const CODE_TTL_MS = 10 * 60 * 1000; // 10 minutes
const MAX_ATTEMPTS = 5;

// 6-digit codes are 1M combos. We rely on:
//   1. Per-token attempt cap (MAX_ATTEMPTS) — kills online brute force.
//   2. Per-user pruning of older live codes on each /login — only one
//      guessable target at a time.
//   3. Per-IP rate limits on /login and /verify — caps distributed guessing.
// hashCode binds the digest to the user_id so identical codes for two users
// can't collide on the primary key, and so a leaked hash can't be reused for
// a different account.
function generateCode(): string {
  return randomInt(0, 1_000_000).toString().padStart(6, '0');
}

function hashCode(userId: string, code: string): Buffer {
  return createHash('sha256').update(`${userId}:${code}`).digest();
}

const authRoutes: FastifyPluginAsyncZod = async (app) => {
  const isProd = process.env.NODE_ENV === 'production';

  app.post(
    '/login',
    {
      schema: {
        body: LoginRequestSchema,
        response: {
          200: LoginResponseSchema,
          500: ErrorResponseSchema,
        },
      },
      // 5 attempts per 15 minutes per IP. Anti-enumeration is handled by
      // always returning 200 regardless of whether the email exists.
      config: { rateLimit: { max: 5, timeWindow: '15 minutes' } },
    },
    async (req, reply) => {
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
        req.log.error({ email }, 'find-or-create user returned no row');
        return reply.code(500).send({ error: 'Internal server error' });
      }

      // Invalidate prior live codes for this user. Keeps the brute-force
      // surface to one code at a time per account and means re-requesting
      // genuinely supersedes the previous code.
      await db
        .delete(authTokens)
        .where(and(eq(authTokens.userId, user.id), isNull(authTokens.consumedAt)));

      const code = generateCode();
      const tokenHash = hashCode(user.id, code);
      const expiresAt = new Date(Date.now() + CODE_TTL_MS);

      await db.insert(authTokens).values({
        tokenHash,
        userId: user.id,
        expiresAt,
      });

      try {
        await sendLoginCode(email, code);
      } catch (err) {
        req.log.error({ err }, 'login-code email failed');
      }
      return { ok: true as const };
    },
  );

  app.post(
    '/verify',
    {
      schema: {
        body: VerifyRequestSchema,
        response: {
          200: VerifyResponseSchema,
          400: ErrorResponseSchema,
        },
      },
      // Defense-in-depth against distributed guessing across rotating IPs.
      // Per-token cap (MAX_ATTEMPTS) is the primary guard; this caps the
      // request volume a single IP can put through.
      config: { rateLimit: { max: 10, timeWindow: '15 minutes' } },
    },
    async (req, reply) => {
      const email = req.body.email.trim().toLowerCase();

      const [user] = await db
        .select({ id: users.id })
        .from(users)
        .where(eq(users.email, email));
      // Generic error to avoid leaking whether the email exists.
      if (!user) return reply.code(400).send({ error: 'Invalid code' });

      const tokenHash = hashCode(user.id, req.body.code);

      // Atomic consume: one UPDATE that flips consumed_at iff the row is
      // still valid, unused, and under the attempt cap. RETURNING tells us
      // whether the row was a hit. Prevents the classic select-then-update
      // race where the same code is replayed concurrently.
      const [consumed] = await db
        .update(authTokens)
        .set({ consumedAt: new Date() })
        .where(
          and(
            eq(authTokens.tokenHash, tokenHash),
            gt(authTokens.expiresAt, sql`now()`),
            isNull(authTokens.consumedAt),
            lt(authTokens.attempts, MAX_ATTEMPTS),
          ),
        )
        .returning({ userId: authTokens.userId });

      if (!consumed) {
        // Increment the attempt counter on every miss for the user's most
        // recent live code. We don't know which code the attacker was
        // targeting, so we bump whichever live row exists — that's enough
        // to enforce the cap because /login wipes prior live codes.
        await db
          .update(authTokens)
          .set({ attempts: sql`${authTokens.attempts} + 1` })
          .where(
            and(
              eq(authTokens.userId, user.id),
              gt(authTokens.expiresAt, sql`now()`),
              isNull(authTokens.consumedAt),
            ),
          );
        return reply.code(400).send({ error: 'Invalid code' });
      }

      const jwt = await reply.jwtSign({ sub: consumed.userId }, { expiresIn: '30d' });
      reply.setCookie(SESSION_COOKIE, jwt, {
        httpOnly: true,
        secure: isProd,
        sameSite: 'lax',
        path: '/',
        maxAge: SESSION_MAX_AGE_SECONDS,
      });
      return { ok: true as const };
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
          401: ErrorResponseSchema,
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
        return reply.code(401).send({ error: 'Unauthorized' });
      }
      return user;
    },
  );
};

export default authRoutes;
