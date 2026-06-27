import { and, asc, desc, eq, isNotNull, isNull, sql, type AnyColumn, type SQL } from 'drizzle-orm';
import type { db as DrizzleDb } from '@/db/client';
import { notes } from '@/db/schema';

type DrizzleDB = typeof DrizzleDb;

export type NoteRow = {
  id: string;
  title: string;
  bodyJson: unknown;
  bodyText: string;
  starred: boolean;
  trashedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
};

// Selecting an explicit column set keeps `search_tsv` (a generated tsvector
// that isn't useful to clients and serializes awkwardly) off the wire.
const noteColumns = {
  id: notes.id,
  title: notes.title,
  bodyJson: notes.bodyJson,
  bodyText: notes.bodyText,
  starred: notes.starred,
  trashedAt: notes.trashedAt,
  createdAt: notes.createdAt,
  updatedAt: notes.updatedAt,
};

export type NoteView = 'starred' | 'trash';
export type NoteOrderField = 'updatedAt' | 'createdAt' | 'title';
export type SortDirection = 'asc' | 'desc';

// Discriminated by `field` so the service can reject a cursor paired with a
// different `orderBy` than the one that produced it. The value type matches
// the underlying column type.
export type ListCursor =
  | { field: 'updatedAt'; value: Date; id: string }
  | { field: 'createdAt'; value: Date; id: string }
  | { field: 'title'; value: string; id: string };

// Allow-list mapping the API field name to its Drizzle column. Acts as a
// type-checked guard against unsupported columns being plugged into ORDER BY
// or the cursor row comparison.
const ORDER_COLUMNS: Record<NoteOrderField, AnyColumn> = {
  updatedAt: notes.updatedAt,
  createdAt: notes.createdAt,
  title: notes.title,
};

export type CreateNoteInput = {
  title?: string;
  bodyJson?: unknown;
  bodyText?: string;
};

export type UpdateNoteInput = {
  title?: string;
  bodyJson?: unknown;
  bodyText?: string;
  starred?: boolean;
  trashedAt?: Date | null;
};

export function createNotesRepository(db: DrizzleDB) {
  return {
    // Authorization invariant: every query filters by user_id. An audit grep
    // for `notes.userId` is enough to confirm coverage across this file.
    async list(
      userId: string,
      opts: {
        orderBy: NoteOrderField;
        orderDir: SortDirection;
        view?: NoteView;
        q?: string;
        limit?: number;
        cursor?: ListCursor;
      },
    ): Promise<{ rows: NoteRow[]; hasMore: boolean }> {
      const { orderBy, orderDir, view, q, limit, cursor } = opts;
      // `view` omitted ⇒ non-trashed. 'trash' ⇒ only trashed. 'starred' ⇒
      // non-trashed AND starred.
      const trashedFilter: SQL =
        view === 'trash' ? isNotNull(notes.trashedAt) : isNull(notes.trashedAt);
      const starredFilter: SQL | undefined =
        view === 'starred' ? eq(notes.starred, true) : undefined;
      // Search ORs two strategies so search-as-you-type and natural-language
      // queries both work:
      //   1. websearch_to_tsquery on search_tsv — stemming + quoted phrases +
      //      OR + -negation. Misses substrings ("te" doesn't match "test")
      //      because tsvectors store whole lexemes.
      //   2. ILIKE on title + body_text — catches substring/prefix. Wildcards
      //      in user input are escaped so a literal `%` doesn't sweep up
      //      everything.
      // Indexes: notes_search_idx (GIN on search_tsv) serves branch 1,
      // notes_trgm_idx (GIN on body_text gin_trgm_ops) serves the body half
      // of branch 2. Title ILIKE falls back to a seq scan, bounded by the
      // per-user filter — add `gin (title gin_trgm_ops)` if latency shows up.
      let searchFilter: SQL | undefined;
      if (q) {
        const pattern = `%${q.replace(/[\\%_]/g, '\\$&')}%`;
        searchFilter = sql`(
          ${notes.searchTsv} @@ websearch_to_tsquery('english', ${q})
          OR ${notes.title} ILIKE ${pattern}
          OR ${notes.bodyText} ILIKE ${pattern}
        )`;
      }

      // Cursor row comparison must agree with the ORDER BY direction so each
      // page is strictly past the previous one. id is the tiebreaker that
      // makes the comparison a total order — without it, rows sharing the
      // lead column value could repeat across pages.
      const orderColumn = ORDER_COLUMNS[orderBy];
      const dirFn = orderDir === 'desc' ? desc : asc;
      const orderClauses = [dirFn(orderColumn), dirFn(notes.id)];

      let cursorFilter: SQL | undefined;
      if (cursor && cursor.field === orderBy) {
        const cursorValue =
          cursor.value instanceof Date ? cursor.value.toISOString() : cursor.value;
        const cmp = orderDir === 'desc' ? sql`<` : sql`>`;
        cursorFilter = sql`(${orderColumn}, ${notes.id}) ${cmp} (${cursorValue}, ${cursor.id})`;
      }
      // Field/direction mismatches against the cursor are rejected with 400
      // in the service before we ever get here.

      // Fetch one extra row so we can tell whether another page exists without
      // a separate count query.
      const query = db
        .select(noteColumns)
        .from(notes)
        .where(
          and(eq(notes.userId, userId), trashedFilter, starredFilter, searchFilter, cursorFilter),
        )
        .orderBy(...orderClauses);

      if (limit === undefined) {
        return { rows: await query, hasMore: false };
      }
      const fetched = await query.limit(limit + 1);
      const hasMore = fetched.length > limit;
      return { rows: hasMore ? fetched.slice(0, limit) : fetched, hasMore };
    },

    async findById(userId: string, id: string): Promise<NoteRow | null> {
      const [row] = await db
        .select(noteColumns)
        .from(notes)
        .where(and(eq(notes.userId, userId), eq(notes.id, id)));
      return row ?? null;
    },

    async create(userId: string, input: CreateNoteInput): Promise<NoteRow> {
      // Omit body_json from the insert when the client didn't send one so
      // Postgres applies the schema default (`{"type":"doc","content":[]}`).
      const values: { userId: string; title?: string; bodyJson?: unknown; bodyText?: string } = {
        userId,
        title: input.title ?? '',
        bodyText: input.bodyText ?? '',
      };
      if (input.bodyJson !== undefined) values.bodyJson = input.bodyJson;

      const [row] = await db.insert(notes).values(values).returning(noteColumns);
      if (!row) throw new Error('notes insert returned no row');
      return row;
    },

    async update(userId: string, id: string, patch: UpdateNoteInput): Promise<NoteRow | null> {
      const set: Partial<typeof notes.$inferInsert> = { updatedAt: new Date() };
      if (patch.title !== undefined) set.title = patch.title;
      if (patch.bodyJson !== undefined) set.bodyJson = patch.bodyJson;
      if (patch.bodyText !== undefined) set.bodyText = patch.bodyText;
      if (patch.starred !== undefined) set.starred = patch.starred;
      if (patch.trashedAt !== undefined) set.trashedAt = patch.trashedAt;

      const [row] = await db
        .update(notes)
        .set(set)
        .where(and(eq(notes.userId, userId), eq(notes.id, id)))
        .returning(noteColumns);
      return row ?? null;
    },

    async delete(userId: string, id: string): Promise<boolean> {
      const deleted = await db
        .delete(notes)
        .where(and(eq(notes.userId, userId), eq(notes.id, id)))
        .returning({ id: notes.id });
      return deleted.length > 0;
    },
  };
}

export type NotesRepository = ReturnType<typeof createNotesRepository>;
