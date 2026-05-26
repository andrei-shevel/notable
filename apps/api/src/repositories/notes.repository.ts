import { and, desc, eq, isNotNull, isNull, type SQL } from 'drizzle-orm';
import type { db as DrizzleDb } from '../db/client';
import { notes } from '../db/schema';

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

export type NoteView = 'all' | 'starred' | 'trash';

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
    async listByView(userId: string, view: NoteView): Promise<NoteRow[]> {
      const trashedFilter: SQL =
        view === 'trash' ? isNotNull(notes.trashedAt) : isNull(notes.trashedAt);
      const starredFilter: SQL | undefined =
        view === 'starred' ? eq(notes.starred, true) : undefined;

      return db
        .select(noteColumns)
        .from(notes)
        .where(and(eq(notes.userId, userId), trashedFilter, starredFilter))
        .orderBy(desc(notes.updatedAt));
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
