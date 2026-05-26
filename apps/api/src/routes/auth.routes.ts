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
import { config } from '../config';
import { requireUser } from '../plugins/auth';
import { SESSION_COOKIE } from '../plugins/jwt';
import type { AuthService } from '../services/auth.service';

const SESSION_MAX_AGE_SECONDS = 60 * 60 * 24 * 30; // 30 days

type AuthRoutesOptions = { authService: AuthService };

export const authRoutes: FastifyPluginAsyncZod<AuthRoutesOptions> = async (app, opts) => {
  const { authService } = opts;
  const isProd = config.NODE_ENV === 'production';

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
    async (req) => {
      await authService.initiateLogin(req.body.email);
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
      // Per-token cap is the primary guard; this caps the request volume a
      // single IP can put through.
      config: { rateLimit: { max: 10, timeWindow: '15 minutes' } },
    },
    async (req, reply) => {
      const { userId } = await authService.verifyCode(req.body.email, req.body.code);
      const jwt = await reply.jwtSign({ sub: userId }, { expiresIn: '30d' });
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
    async (req) => {
      return await authService.getCurrentUser(req.user.id);
    },
  );
};
