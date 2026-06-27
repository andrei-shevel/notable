import type { FastifyBaseLogger } from 'fastify';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  BadRequestError,
  ConflictError,
  InternalError,
  InvalidCredentialsError,
  UnauthorizedError,
} from '@/errors/AppError';
import type { AuthRepository } from '@/repositories/auth.repository';
import { createAuthService } from '@/services/auth.service';

// Mock the mail layer: the service imports these directly rather than taking
// them as deps, so this is the only seam. Mocking them also keeps the real
// modules — which pull in config (S3/SMTP env) — out of the import graph, so
// these stay pure unit tests with no container.
vi.mock('../../src/mail/loginCode', () => ({ sendLoginCode: vi.fn() }));
vi.mock('../../src/mail/emailChangeCode', () => ({ sendEmailChangeCode: vi.fn() }));

import { sendEmailChangeCode } from '@/mail/emailChangeCode';
import { sendLoginCode } from '@/mail/loginCode';

const USER = { id: 'user-1', email: 'alice@example.com' };

// A fully stubbed repository. Each method is a spy; beforeEach wires the happy
// path, individual tests override the one branch they exercise.
function makeRepo() {
  return {
    getOrCreateUser: vi.fn(),
    deleteLiveTokens: vi.fn(),
    createToken: vi.fn(),
    findUserIdByEmail: vi.fn(),
    consumeToken: vi.fn(),
    incrementLiveAttempts: vi.fn(),
    findUserById: vi.fn(),
    isEmailTakenByOther: vi.fn(),
    setUserEmail: vi.fn(),
    deleteUser: vi.fn(),
    deleteLiveEmailChangeTokens: vi.fn(),
    createEmailChangeToken: vi.fn(),
    consumeEmailChangeToken: vi.fn(),
    incrementLiveEmailChangeAttempts: vi.fn(),
  };
}

const logger = {
  error: vi.fn(),
  info: vi.fn(),
  warn: vi.fn(),
  debug: vi.fn(),
  trace: vi.fn(),
  fatal: vi.fn(),
} as unknown as FastifyBaseLogger;

describe('authService', () => {
  let repo: ReturnType<typeof makeRepo>;
  let service: ReturnType<typeof createAuthService>;

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(sendLoginCode).mockResolvedValue(undefined);
    vi.mocked(sendEmailChangeCode).mockResolvedValue(undefined);

    repo = makeRepo();
    // Happy-path defaults.
    repo.getOrCreateUser.mockResolvedValue(USER);
    repo.findUserIdByEmail.mockResolvedValue(USER.id);
    repo.consumeToken.mockResolvedValue({ userId: USER.id });
    repo.findUserById.mockResolvedValue(USER);
    repo.isEmailTakenByOther.mockResolvedValue(false);
    repo.setUserEmail.mockResolvedValue(USER);
    repo.consumeEmailChangeToken.mockResolvedValue({ newEmail: 'new@example.com' });

    service = createAuthService({ repo: repo as unknown as AuthRepository, logger });
  });

  describe('initiateLogin', () => {
    it('supersedes prior codes then persists a fresh 6-digit code', async () => {
      await service.initiateLogin('alice@example.com');

      expect(repo.deleteLiveTokens).toHaveBeenCalledWith(USER.id);
      expect(repo.createToken).toHaveBeenCalledTimes(1);
      const [createArg] = repo.createToken.mock.calls[0]!;
      expect(createArg).toEqual(
        expect.objectContaining({ userId: USER.id, tokenHash: expect.any(Buffer) }),
      );
      expect(createArg.expiresAt).toBeInstanceOf(Date);

      expect(sendLoginCode).toHaveBeenCalledTimes(1);
      const [, code] = vi.mocked(sendLoginCode).mock.calls[0]!;
      expect(code).toMatch(/^\d{6}$/);
    });

    it('normalizes the email before lookup and delivery', async () => {
      await service.initiateLogin('  Alice@Example.COM  ');

      expect(repo.getOrCreateUser).toHaveBeenCalledWith('alice@example.com');
      expect(vi.mocked(sendLoginCode).mock.calls[0]![0]).toBe('alice@example.com');
    });

    it('throws InternalError and skips token creation if the user upsert returns nothing', async () => {
      repo.getOrCreateUser.mockResolvedValue(null);

      await expect(service.initiateLogin('alice@example.com')).rejects.toBeInstanceOf(InternalError);
      expect(repo.createToken).not.toHaveBeenCalled();
      expect(sendLoginCode).not.toHaveBeenCalled();
    });

    it('swallows email failures — the token is already persisted', async () => {
      vi.mocked(sendLoginCode).mockRejectedValue(new Error('smtp down'));

      await expect(service.initiateLogin('alice@example.com')).resolves.toBeUndefined();
      expect(repo.createToken).toHaveBeenCalledTimes(1);
      expect(logger.error).toHaveBeenCalled();
    });
  });

  describe('verifyCode', () => {
    it('returns the userId when the code is consumed', async () => {
      await expect(service.verifyCode('alice@example.com', '123456')).resolves.toEqual({
        userId: USER.id,
      });
    });

    it('rejects an unknown email without ever touching the token table', async () => {
      repo.findUserIdByEmail.mockResolvedValue(null);

      await expect(service.verifyCode('ghost@example.com', '123456')).rejects.toBeInstanceOf(
        InvalidCredentialsError,
      );
      expect(repo.consumeToken).not.toHaveBeenCalled();
    });

    it('bumps the attempt counter and rejects on a wrong code', async () => {
      repo.consumeToken.mockResolvedValue(null);

      await expect(service.verifyCode('alice@example.com', '000000')).rejects.toBeInstanceOf(
        InvalidCredentialsError,
      );
      expect(repo.incrementLiveAttempts).toHaveBeenCalledWith(USER.id);
    });

    // The anti-enumeration property: an unknown email and a wrong code must be
    // indistinguishable to the caller — same error type, same message.
    it('returns an identical error for unknown-email and wrong-code', async () => {
      repo.findUserIdByEmail.mockResolvedValueOnce(null);
      const unknownEmail = await service.verifyCode('ghost@example.com', '123456').catch((e) => e);

      repo.consumeToken.mockResolvedValueOnce(null);
      const wrongCode = await service.verifyCode('alice@example.com', '000000').catch((e) => e);

      expect(unknownEmail).toBeInstanceOf(InvalidCredentialsError);
      expect(wrongCode).toBeInstanceOf(InvalidCredentialsError);
      expect(unknownEmail.message).toBe(wrongCode.message);
      expect(unknownEmail.statusCode).toBe(wrongCode.statusCode);
    });
  });

  describe('getCurrentUser', () => {
    it('returns the user when present', async () => {
      await expect(service.getCurrentUser(USER.id)).resolves.toEqual(USER);
    });

    it('treats a missing user row as unauthorized, not a 500', async () => {
      repo.findUserById.mockResolvedValue(null);
      await expect(service.getCurrentUser('user-1')).rejects.toBeInstanceOf(UnauthorizedError);
    });
  });

  describe('requestEmailChange', () => {
    it('supersedes pending changes then sends a code to the new address', async () => {
      await service.requestEmailChange(USER.id, '  New@Example.com ');

      expect(repo.deleteLiveEmailChangeTokens).toHaveBeenCalledWith(USER.id);
      expect(repo.createEmailChangeToken).toHaveBeenCalledTimes(1);
      expect(repo.createEmailChangeToken.mock.calls[0]![0]).toEqual(
        expect.objectContaining({ userId: USER.id, newEmail: 'new@example.com' }),
      );
      // The code goes to the new address — that's what proves control of it.
      expect(vi.mocked(sendEmailChangeCode).mock.calls[0]![0]).toBe('new@example.com');
    });

    it('rejects when the requester no longer exists', async () => {
      repo.findUserById.mockResolvedValue(null);
      await expect(service.requestEmailChange(USER.id, 'new@example.com')).rejects.toBeInstanceOf(
        UnauthorizedError,
      );
    });

    it('rejects changing to your own current email', async () => {
      await expect(service.requestEmailChange(USER.id, 'ALICE@example.com')).rejects.toBeInstanceOf(
        BadRequestError,
      );
      expect(repo.createEmailChangeToken).not.toHaveBeenCalled();
    });

    it('rejects an email already owned by someone else', async () => {
      repo.isEmailTakenByOther.mockResolvedValue(true);
      await expect(service.requestEmailChange(USER.id, 'taken@example.com')).rejects.toBeInstanceOf(
        ConflictError,
      );
      expect(repo.createEmailChangeToken).not.toHaveBeenCalled();
    });

    it('swallows email failures after persisting the token', async () => {
      vi.mocked(sendEmailChangeCode).mockRejectedValue(new Error('smtp down'));
      await expect(
        service.requestEmailChange(USER.id, 'new@example.com'),
      ).resolves.toBeUndefined();
      expect(repo.createEmailChangeToken).toHaveBeenCalledTimes(1);
      expect(logger.error).toHaveBeenCalled();
    });
  });

  describe('confirmEmailChange', () => {
    it('swaps the email and kills old sessions on success', async () => {
      const updated = { id: USER.id, email: 'new@example.com' };
      repo.setUserEmail.mockResolvedValue(updated);

      await expect(
        service.confirmEmailChange(USER.id, 'new@example.com', '123456'),
      ).resolves.toEqual(updated);

      expect(repo.setUserEmail).toHaveBeenCalledWith(USER.id, 'new@example.com');
      // Old email must no longer be able to mint a session.
      expect(repo.deleteLiveTokens).toHaveBeenCalledWith(USER.id);
    });

    it('bumps attempts and rejects on a wrong code', async () => {
      repo.consumeEmailChangeToken.mockResolvedValue(null);
      await expect(
        service.confirmEmailChange(USER.id, 'new@example.com', '000000'),
      ).rejects.toBeInstanceOf(InvalidCredentialsError);
      expect(repo.incrementLiveEmailChangeAttempts).toHaveBeenCalledWith(USER.id);
    });

    // Someone could have claimed the address between request and confirm.
    it('re-checks uniqueness at swap time', async () => {
      repo.isEmailTakenByOther.mockResolvedValue(true);
      await expect(
        service.confirmEmailChange(USER.id, 'new@example.com', '123456'),
      ).rejects.toBeInstanceOf(ConflictError);
      expect(repo.setUserEmail).not.toHaveBeenCalled();
    });

    it('throws InternalError if the update unexpectedly affects no row', async () => {
      repo.setUserEmail.mockResolvedValue(null);
      await expect(
        service.confirmEmailChange(USER.id, 'new@example.com', '123456'),
      ).rejects.toBeInstanceOf(InternalError);
    });
  });

  describe('deleteAccount', () => {
    it('delegates to the repository', async () => {
      await service.deleteAccount(USER.id);
      expect(repo.deleteUser).toHaveBeenCalledWith(USER.id);
    });
  });
});
