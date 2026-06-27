import { createHash } from 'node:crypto';
import { afterAll, beforeEach, describe, expect, it } from 'vitest';
import { createAuthRepository } from '@/repositories/auth.repository';
import { connectTestDb, truncateAll } from '../helpers/db';

// Mirror of the service's hashCode: the digest is bound to the user id so a
// leaked hash can't be replayed against another account. Duplicated here on
// purpose — the test pins the wire format the repo stores, independent of the
// service that produces it.
function hashCode(userId: string, code: string): Buffer {
  return createHash('sha256').update(`${userId}:${code}`).digest();
}

const MAX_ATTEMPTS = 5;
const TEN_MINUTES = 10 * 60 * 1000;

describe('authRepository.consumeToken', () => {
  const { db, client } = connectTestDb();
  const repo = createAuthRepository(db);

  beforeEach(() => truncateAll(client));
  afterAll(() => client.end({ timeout: 5 }));

  // Creates a user and a live login token for `code`, returning what a caller
  // needs to attempt a consume. `expiresInMs` lets a test mint an already
  // expired token.
  async function seedToken(code: string, expiresInMs = TEN_MINUTES) {
    const user = await repo.getOrCreateUser('alice@example.com');
    if (!user) throw new Error('seed failed: no user');
    const tokenHash = hashCode(user.id, code);
    await repo.createToken({
      tokenHash,
      userId: user.id,
      expiresAt: new Date(Date.now() + expiresInMs),
    });
    return { userId: user.id, tokenHash };
  }

  // The headline guarantee. consumeToken is a single UPDATE that flips
  // consumed_at only while the row is still valid/unused/under-cap and reports
  // the hit via RETURNING. Fire many at once against one token: Postgres
  // serializes the row writes, so exactly one UPDATE matches and the rest see
  // an already-consumed row. This is the property that makes the login code
  // safe to replay-race — if it ever regressed to select-then-update, several
  // of these would win.
  it('lets exactly one of many concurrent consumes win', async () => {
    const { tokenHash } = await seedToken('123456');

    const results = await Promise.all(
      Array.from({ length: 20 }, () => repo.consumeToken(tokenHash, MAX_ATTEMPTS)),
    );

    const winners = results.filter((r) => r !== null);
    expect(winners).toHaveLength(1);
  });

  it('returns the row once, then null on replay', async () => {
    const { userId, tokenHash } = await seedToken('123456');

    const first = await repo.consumeToken(tokenHash, MAX_ATTEMPTS);
    expect(first).toEqual({ userId });

    const replay = await repo.consumeToken(tokenHash, MAX_ATTEMPTS);
    expect(replay).toBeNull();
  });

  it('rejects an expired token', async () => {
    const { tokenHash } = await seedToken('123456', -1000); // expired 1s ago

    expect(await repo.consumeToken(tokenHash, MAX_ATTEMPTS)).toBeNull();
  });

  it('rejects a token once the attempt cap is reached', async () => {
    const { userId, tokenHash } = await seedToken('123456');

    // Each failed guess bumps the live token; after MAX_ATTEMPTS bumps the
    // attempts < cap guard no longer holds, so even the correct code is dead.
    for (let i = 0; i < MAX_ATTEMPTS; i++) {
      await repo.incrementLiveAttempts(userId);
    }

    expect(await repo.consumeToken(tokenHash, MAX_ATTEMPTS)).toBeNull();
  });

  it('rejects an unknown token hash', async () => {
    await seedToken('123456');

    const wrong = hashCode('00000000-0000-0000-0000-000000000000', '000000');
    expect(await repo.consumeToken(wrong, MAX_ATTEMPTS)).toBeNull();
  });
});
