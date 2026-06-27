import type { FastifyReply, FastifyRequest } from 'fastify';

// preHandler attached to every protected route. Verifies the session JWT
// from the cookie and short-circuits with 401 on any failure. Successful
// verification populates `request.user = { id }` via the `formatUser`
// configured in plugins/jwt.ts.
export async function requireUser(req: FastifyRequest, reply: FastifyReply) {
  try {
    await req.jwtVerify();
  } catch {
    return reply.code(401).send({ error: 'unauthorized' });
  }
  // Bind the authenticated user onto the request logger so every subsequent
  // line for this request — service logs and the request-completion log
  // included — is attributable to a user without re-passing the id everywhere.
  req.log = req.log.child({ userId: req.user.id });
}
