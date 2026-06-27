import { afterAll, beforeEach, describe, expect, it } from 'vitest';
import { notes, users } from '../../src/db/schema';
import {
  createNotesRepository,
  type ListCursor,
  type NoteOrderField,
  type NoteRow,
  type SortDirection,
} from '../../src/repositories/notes.repository';
import { connectTestDb, truncateAll } from '../helpers/db';

// Distinct day-of-month timestamps for the two date fields. Kept apart (Jan vs
// Jun) so a createdAt value can never accidentally equal an updatedAt value.
const created = (day: number) => new Date(Date.UTC(2026, 0, day));
const updated = (day: number) => new Date(Date.UTC(2026, 5, day));

// Six notes engineered so EVERY orderable field carries tie pairs:
//   title:     apple×2, banana×2          createdAt: T1×2, T2×2, T3×2
//   updatedAt: U1×2, U2×2, U3×2
// That forces every ordering to lean on the id tiebreaker, which is exactly
// the keyset-pagination edge that gaps/duplicates would hide in.
const SPECS = [
  { title: 'apple', createdAt: created(1), updatedAt: updated(2) },
  { title: 'apple', createdAt: created(1), updatedAt: updated(1) },
  { title: 'banana', createdAt: created(2), updatedAt: updated(2) },
  { title: 'banana', createdAt: created(3), updatedAt: updated(1) },
  { title: 'cherry', createdAt: created(2), updatedAt: updated(3) },
  { title: 'date', createdAt: created(3), updatedAt: updated(3) },
];

const COMBOS: Array<[NoteOrderField, SortDirection]> = [
  ['createdAt', 'asc'],
  ['createdAt', 'desc'],
  ['updatedAt', 'asc'],
  ['updatedAt', 'desc'],
  ['title', 'asc'],
  ['title', 'desc'],
];

// The cursor the service would mint from a page's last row, built straight from
// the row (no encode/decode round-trip — that's the service's concern).
function cursorFromRow(row: NoteRow, orderBy: NoteOrderField): ListCursor {
  switch (orderBy) {
    case 'title':
      return { field: 'title', value: row.title, id: row.id };
    case 'createdAt':
      return { field: 'createdAt', value: row.createdAt, id: row.id };
    case 'updatedAt':
      return { field: 'updatedAt', value: row.updatedAt, id: row.id };
  }
}

describe('notesRepository.list pagination', () => {
  const { db, client } = connectTestDb();
  const repo = createNotesRepository(db);
  let userId: string;

  beforeEach(async () => {
    await truncateAll(client);
    const [user] = await db
      .insert(users)
      .values({ email: 'owner@example.com' })
      .returning({ id: users.id });
    if (!user) throw new Error('seed failed: no user');
    userId = user.id;
    await db.insert(notes).values(SPECS.map((s) => ({ userId, ...s })));
  });

  afterAll(() => client.end({ timeout: 5 }));

  // Pages through with the given size, threading each page's last row back in
  // as the next cursor — the exact loop a client performs.
  async function walkAll(
    owner: string,
    orderBy: NoteOrderField,
    orderDir: SortDirection,
    pageSize: number,
  ): Promise<string[]> {
    const ids: string[] = [];
    let cursor: ListCursor | undefined;
    // Bound the loop so a hasMore-always-true regression fails fast instead of
    // hanging the suite.
    for (let guard = 0; guard < 100; guard++) {
      const { rows, hasMore } = await repo.list(owner, {
        orderBy,
        orderDir,
        limit: pageSize,
        cursor,
      });
      ids.push(...rows.map((r) => r.id));
      if (!hasMore) return ids;
      const last = rows[rows.length - 1];
      if (!last) throw new Error('hasMore was true but the page was empty');
      cursor = cursorFromRow(last, orderBy);
    }
    throw new Error('walkAll did not terminate — likely a hasMore/cursor bug');
  }

  it.each(COMBOS)(
    'a paged walk reproduces the full ordering exactly (orderBy=%s dir=%s)',
    async (orderBy, orderDir) => {
      // Unpaginated list = trusted oracle: one ORDER BY, no cursor logic.
      const oracle = (await repo.list(userId, { orderBy, orderDir })).rows.map((r) => r.id);
      expect(oracle).toHaveLength(SPECS.length);

      // Page sizes that divide the set evenly (2), don't (4 ⇒ 4+2), and the
      // worst case for ties (1 ⇒ a fresh cursor at every boundary).
      for (const pageSize of [1, 2, 4]) {
        const walked = await walkAll(userId, orderBy, orderDir, pageSize);
        expect(walked, `pageSize=${pageSize}`).toEqual(oracle);
      }
    },
  );

  it('reports hasMore until the last page', async () => {
    const opts = { orderBy: 'createdAt', orderDir: 'asc' } as const;

    const page = await repo.list(userId, { ...opts, limit: 2 });
    expect(page.rows).toHaveLength(2);
    expect(page.hasMore).toBe(true);

    // limit one short of the total still has more...
    expect((await repo.list(userId, { ...opts, limit: SPECS.length - 1 })).hasMore).toBe(true);
    // ...and a limit equal to the total does not (the +1 probe finds nothing).
    const full = await repo.list(userId, { ...opts, limit: SPECS.length });
    expect(full.rows).toHaveLength(SPECS.length);
    expect(full.hasMore).toBe(false);
  });

  it('returns every row with hasMore=false when no limit is given', async () => {
    const { rows, hasMore } = await repo.list(userId, { orderBy: 'updatedAt', orderDir: 'desc' });
    expect(rows).toHaveLength(SPECS.length);
    expect(hasMore).toBe(false);
  });

  it('ignores a cursor whose field disagrees with orderBy', async () => {
    // The service rejects this with a 400 before the repo sees it; at the repo
    // level a mismatched cursor simply doesn't filter, so the page starts over.
    const firstPage = await repo.list(userId, { orderBy: 'createdAt', orderDir: 'asc', limit: 3 });
    const lastRow = firstPage.rows[firstPage.rows.length - 1];
    if (!lastRow) throw new Error('expected a non-empty first page');

    const withMismatchedCursor = await repo.list(userId, {
      orderBy: 'createdAt',
      orderDir: 'asc',
      limit: 3,
      cursor: { field: 'title', value: lastRow.title, id: lastRow.id },
    });

    expect(withMismatchedCursor.rows.map((r) => r.id)).toEqual(firstPage.rows.map((r) => r.id));
  });

  it('scopes results to the owner', async () => {
    const [other] = await db
      .insert(users)
      .values({ email: 'intruder@example.com' })
      .returning({ id: users.id });
    if (!other) throw new Error('seed failed: no other user');
    await db.insert(notes).values({ userId: other.id, title: 'not yours' });

    const mine = await walkAll(userId, 'createdAt', 'asc', 2);
    expect(mine).toHaveLength(SPECS.length);

    const theirs = await repo.list(other.id, { orderBy: 'createdAt', orderDir: 'asc' });
    expect(theirs.rows).toHaveLength(1);
  });
});
