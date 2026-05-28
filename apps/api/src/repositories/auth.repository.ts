import { and, eq, gt, isNull, lt, ne, sql } from 'drizzle-orm';
import type { db as DrizzleDb } from '../db/client';
import { authTokens, emailChangeTokens, users } from '../db/schema';

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

    // True when some *other* user already owns that email. citext unique
    // index handles case-insensitive matching for us.
    async isEmailTakenByOther(email: string, selfUserId: string): Promise<boolean> {
      const [row] = await db
        .select({ id: users.id })
        .from(users)
        .where(and(eq(users.email, email), ne(users.id, selfUserId)));
      return Boolean(row);
    },

    async setUserEmail(userId: string, email: string): Promise<User | null> {
      const [updated] = await db
        .update(users)
        .set({ email })
        .where(eq(users.id, userId))
        .returning({ id: users.id, email: users.email });
      return updated ?? null;
    },

    // Cascade FKs (notes, tags, note_tags, auth_tokens, email_change_tokens)
    // wipe owned rows.
    async deleteUser(userId: string): Promise<void> {
      await db.delete(users).where(eq(users.id, userId));
    },

    // --- email-change tokens ------------------------------------------------
    // Mirrors the login-token lifecycle (create → consume / increment-attempts
    // → expire) but each row carries the prospective `new_email`. Consuming
    // returns it so the service can update users.email in one step.
    async deleteLiveEmailChangeTokens(userId: string): Promise<void> {
      await db
        .delete(emailChangeTokens)
        .where(and(eq(emailChangeTokens.userId, userId), isNull(emailChangeTokens.consumedAt)));
    },

    async createEmailChangeToken(input: {
      tokenHash: Buffer;
      userId: string;
      newEmail: string;
      expiresAt: Date;
    }): Promise<void> {
      await db.insert(emailChangeTokens).values(input);
    },

    async consumeEmailChangeToken(
      tokenHash: Buffer,
      userId: string,
      maxAttempts: number,
    ): Promise<{ newEmail: string } | null> {
      const [consumed] = await db
        .update(emailChangeTokens)
        .set({ consumedAt: new Date() })
        .where(
          and(
            eq(emailChangeTokens.tokenHash, tokenHash),
            eq(emailChangeTokens.userId, userId),
            gt(emailChangeTokens.expiresAt, sql`now()`),
            isNull(emailChangeTokens.consumedAt),
            lt(emailChangeTokens.attempts, maxAttempts),
          ),
        )
        .returning({ newEmail: emailChangeTokens.newEmail });
      return consumed ?? null;
    },

    async incrementLiveEmailChangeAttempts(userId: string): Promise<void> {
      await db
        .update(emailChangeTokens)
        .set({ attempts: sql`${emailChangeTokens.attempts} + 1` })
        .where(
          and(
            eq(emailChangeTokens.userId, userId),
            gt(emailChangeTokens.expiresAt, sql`now()`),
            isNull(emailChangeTokens.consumedAt),
          ),
        );
    },
  };
}

export type AuthRepository = ReturnType<typeof createAuthRepository>;
