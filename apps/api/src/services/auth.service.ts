import { createHash, randomInt } from 'node:crypto';
import type { FastifyBaseLogger } from 'fastify';
import { InternalError, InvalidCredentialsError, UnauthorizedError } from '../errors/AppError';
import { sendLoginCode } from '../mail/loginCode';
import type { AuthRepository, User } from '../repositories/auth.repository';

const CODE_TTL_MS = 10 * 60 * 1000; // 10 minutes
const MAX_ATTEMPTS = 5;

// 6-digit codes are 1M combos. We rely on:
//   1. Per-token attempt cap (MAX_ATTEMPTS) — kills online brute force.
//   2. Per-user pruning of older live codes on each initiateLogin — only one
//      guessable target at a time.
//   3. Per-IP rate limits at the route layer — caps distributed guessing.
// hashCode binds the digest to the user_id so identical codes for two users
// can't collide on the primary key, and so a leaked hash can't be reused for
// a different account.
function generateCode(): string {
  return randomInt(0, 1_000_000).toString().padStart(6, '0');
}

function hashCode(userId: string, code: string): Buffer {
  return createHash('sha256').update(`${userId}:${code}`).digest();
}

function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

export function createAuthService(deps: { repo: AuthRepository; logger: FastifyBaseLogger }) {
  const { repo, logger } = deps;

  return {
    async initiateLogin(rawEmail: string): Promise<void> {
      const email = normalizeEmail(rawEmail);

      const user = await repo.getOrCreateUser(email);
      if (!user) {
        logger.error({ email }, 'find-or-create user returned no row');
        throw new InternalError();
      }

      // Invalidate prior live codes for this user. Keeps the brute-force
      // surface to one code at a time per account and means re-requesting
      // genuinely supersedes the previous code.
      await repo.deleteLiveTokens(user.id);

      const code = generateCode();
      const tokenHash = hashCode(user.id, code);
      const expiresAt = new Date(Date.now() + CODE_TTL_MS);

      await repo.createToken({ tokenHash, userId: user.id, expiresAt });

      // Swallow email errors: the token is already persisted, and surfacing
      // the failure would leak email-existence information to the caller.
      try {
        await sendLoginCode(email, code);
      } catch (err) {
        logger.error({ err }, 'login-code email failed');
      }
    },

    async verifyCode(rawEmail: string, code: string): Promise<{ userId: string }> {
      const email = normalizeEmail(rawEmail);

      const userId = await repo.findUserIdByEmail(email);
      // Generic error to avoid leaking whether the email exists.
      if (!userId) throw new InvalidCredentialsError();

      const tokenHash = hashCode(userId, code);
      const consumed = await repo.consumeToken(tokenHash, MAX_ATTEMPTS);

      if (!consumed) {
        await repo.incrementLiveAttempts(userId);
        throw new InvalidCredentialsError();
      }

      return { userId: consumed.userId };
    },

    async getCurrentUser(id: string): Promise<User> {
      const user = await repo.findUserById(id);
      // JWT valid but user row gone (account deletion / wiped DB). Treat
      // as unauthenticated rather than 500.
      if (!user) throw new UnauthorizedError();
      return user;
    },
  };
}

export type AuthService = ReturnType<typeof createAuthService>;
