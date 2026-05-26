import { and, eq, gt, isNull, lt, sql } from 'drizzle-orm';
import type { db as DrizzleDb } from '../db/client';
import { authTokens, users } from '../db/schema';

export type DrizzleDB = typeof DrizzleDb;

export type User = { id: string; email: string };

export function createAuthRepository(db: DrizzleDB) {
  return {
    // Find-or-create in one round-trip. `DO UPDATE SET email = EXCLUDED.email`
    // is a no-op write whose only purpose is forcing RETURNING to fire on
    // both branches (insert and conflict).
    async getOrCreateUser(email: string): Promise<User | null> {
      const [user] = await db
        .insert(users)
        .values({ email })
        .onConflictDoUpdate({ target: users.email, set: { email } })
        .returning({ id: users.id, email: users.email });
      return user ?? null;
    },

    async deleteLiveTokens(userId: string): Promise<void> {
      await db
        .delete(authTokens)
        .where(and(eq(authTokens.userId, userId), isNull(authTokens.consumedAt)));
    },

    async createToken(input: {
      tokenHash: Buffer;
      userId: string;
      expiresAt: Date;
    }): Promise<void> {
      await db.insert(authTokens).values(input);
    },

    async findUserIdByEmail(email: string): Promise<string | null> {
      const [user] = await db.select({ id: users.id }).from(users).where(eq(users.email, email));
      return user?.id ?? null;
    },

    // Atomic consume: one UPDATE that flips consumed_at iff the row is still
    // valid, unused, and under the attempt cap. RETURNING tells us whether
    // the row was a hit. Prevents the classic select-then-update race where
    // the same code is replayed concurrently.
    async consumeToken(tokenHash: Buffer, maxAttempts: number): Promise<{ userId: string } | null> {
      const [consumed] = await db
        .update(authTokens)
        .set({ consumedAt: new Date() })
        .where(
          and(
            eq(authTokens.tokenHash, tokenHash),
            gt(authTokens.expiresAt, sql`now()`),
            isNull(authTokens.consumedAt),
            lt(authTokens.attempts, maxAttempts),
          ),
        )
        .returning({ userId: authTokens.userId });
      return consumed ?? null;
    },

    // Bump the attempt counter on the user's most recent live code. We
    // don't know which code the attacker was targeting, so we bump whichever
    // live row exists — that's enough to enforce the cap because /login
    // wipes prior live codes.
    async incrementLiveAttempts(userId: string): Promise<void> {
      await db
        .update(authTokens)
        .set({ attempts: sql`${authTokens.attempts} + 1` })
        .where(
          and(
            eq(authTokens.userId, userId),
            gt(authTokens.expiresAt, sql`now()`),
            isNull(authTokens.consumedAt),
          ),
        );
    },

    async findUserById(id: string): Promise<User | null> {
      const [user] = await db
        .select({ id: users.id, email: users.email })
        .from(users)
        .where(eq(users.id, id));
      return user ?? null;
    },
  };
}

export type AuthRepository = ReturnType<typeof createAuthRepository>;
