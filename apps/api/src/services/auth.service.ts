import { createHash, randomInt } from 'node:crypto';
import type { FastifyBaseLogger } from 'fastify';
import {
  BadRequestError,
  ConflictError,
  InternalError,
  InvalidCredentialsError,
  UnauthorizedError,
} from '@/errors/AppError';
import { sendEmailChangeCode } from '@/mail/emailChangeCode';
import { sendLoginCode } from '@/mail/loginCode';
import type { AuthRepository, User } from '@/repositories/auth.repository';

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

// Distinct prefix + new-email binding keeps email-change codes from being
// usable as login codes (and vice versa), and from being redirected to a
// different target address.
function hashEmailChangeCode(userId: string, newEmail: string, code: string): Buffer {
  return createHash('sha256').update(`emailchange:${userId}:${newEmail}:${code}`).digest();
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

    async requestEmailChange(userId: string, rawEmail: string): Promise<void> {
      const email = normalizeEmail(rawEmail);

      const user = await repo.findUserById(userId);
      if (!user) throw new UnauthorizedError();
      if (user.email.toLowerCase() === email) {
        throw new BadRequestError('That is already your email');
      }
      if (await repo.isEmailTakenByOther(email, userId)) {
        throw new ConflictError('Email is already in use');
      }

      // Supersede any prior pending change for this user so there's only one
      // live target email at a time.
      await repo.deleteLiveEmailChangeTokens(userId);

      const code = generateCode();
      const tokenHash = hashEmailChangeCode(userId, email, code);
      const expiresAt = new Date(Date.now() + CODE_TTL_MS);

      await repo.createEmailChangeToken({ tokenHash, userId, newEmail: email, expiresAt });

      // Code goes to the *new* address — that's the whole point: prove the
      // user controls it before we cut over.
      try {
        await sendEmailChangeCode(email, code);
      } catch (err) {
        logger.error({ err }, 'email-change code email failed');
      }
    },

    async confirmEmailChange(userId: string, rawEmail: string, code: string): Promise<User> {
      const email = normalizeEmail(rawEmail);
      const tokenHash = hashEmailChangeCode(userId, email, code);

      const consumed = await repo.consumeEmailChangeToken(tokenHash, userId, MAX_ATTEMPTS);
      if (!consumed) {
        await repo.incrementLiveEmailChangeAttempts(userId);
        throw new InvalidCredentialsError();
      }

      // Re-check uniqueness at swap time: someone else could have claimed
      // this email between request and confirm.
      if (await repo.isEmailTakenByOther(consumed.newEmail, userId)) {
        throw new ConflictError('Email is already in use');
      }

      const updated = await repo.setUserEmail(userId, consumed.newEmail);
      if (!updated) throw new InternalError();

      // Old email can no longer mint a session.
      await repo.deleteLiveTokens(userId);

      return updated;
    },

    async deleteAccount(userId: string): Promise<void> {
      await repo.deleteUser(userId);
    },
  };
}

export type AuthService = ReturnType<typeof createAuthService>;
