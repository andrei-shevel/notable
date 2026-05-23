import fp from 'fastify-plugin';
import jwt from '@fastify/jwt';

// Tell @fastify/jwt how to type request.user. We sign `{ sub: user_id }` to
// stay aligned with standard JWT claims, then re-shape it in `formatUser`
// so route code sees the friendlier `request.user.id`.
declare module '@fastify/jwt' {
  interface FastifyJWT {
    payload: { sub: string };
    user: { id: string };
  }
}

export const SESSION_COOKIE = 'session';

export default fp(async (app) => {
  const secret = process.env.JWT_SECRET;
  if (!secret) {
    throw new Error('JWT_SECRET is required');
  }
  if (secret.length < 32) {
    throw new Error('JWT_SECRET must be at least 32 characters');
  }

  await app.register(jwt, {
    secret,
    // Read the JWT from the session cookie instead of an Authorization
    // header. The cookie itself is unsigned at the cookie layer (`signed:
    // false`) because the JWT is already integrity-protected.
    cookie: { cookieName: SESSION_COOKIE, signed: false },
    formatUser: (payload) => ({ id: payload.sub }),
  });
});
