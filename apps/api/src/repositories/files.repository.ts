import { and, eq } from 'drizzle-orm';
import type { db as DrizzleDb } from '@/db/client';
import { files } from '@/db/schema';

type DrizzleDB = typeof DrizzleDb;

export type FileRow = {
  id: string;
  noteId: string;
  key: string;
  filename: string;
  contentType: string;
  size: number;
  createdAt: Date;
};

// `key` and `noteId` are selected here (unlike the API shape) because the
// service needs the key to fetch the blob and noteId to detect a same-note
// clone. Neither reaches the client.
const fileColumns = {
  id: files.id,
  noteId: files.noteId,
  key: files.key,
  filename: files.filename,
  contentType: files.contentType,
  size: files.size,
  createdAt: files.createdAt,
};

export type CreateFileInput = {
  noteId: string;
  key: string;
  filename: string;
  contentType: string;
  size: number;
};

export function createFilesRepository(db: DrizzleDB) {
  return {
    async create(userId: string, input: CreateFileInput): Promise<FileRow> {
      const [row] = await db
        .insert(files)
        .values({ userId, ...input })
        .returning(fileColumns);
      if (!row) throw new Error('files insert returned no row');
      return row;
    },

    // Deletes every file row for a note and returns their storage keys so the
    // caller can delete the matching blobs. Scoped by user_id alongside
    // note_id — defense in depth, even though notes are already user-scoped.
    async deleteByNote(userId: string, noteId: string): Promise<{ key: string }[]> {
      return db
        .delete(files)
        .where(and(eq(files.userId, userId), eq(files.noteId, noteId)))
        .returning({ key: files.key });
    },

    // Authorization invariant: scoped by user_id so only the uploader can read
    // a file. A non-owner (or unknown id) gets null, which the service maps to
    // a 404 — no existence oracle.
    async findById(userId: string, id: string): Promise<FileRow | null> {
      const [row] = await db
        .select(fileColumns)
        .from(files)
        .where(and(eq(files.userId, userId), eq(files.id, id)));
      return row ?? null;
    },
  };
}

export type FilesRepository = ReturnType<typeof createFilesRepository>;
