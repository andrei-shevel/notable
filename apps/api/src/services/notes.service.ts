import type { CreateNoteRequest, Note, NoteView, UpdateNoteRequest } from '@notable/shared';
import { NotFoundError } from '../errors/AppError';
import type { NoteRow, NotesRepository } from '../repositories/notes.repository';

// Drizzle returns Date instances for timestamptz; the API contract is ISO
// strings. Centralising the mapping here keeps routes thin and means the
// serializerCompiler validates the same shape the client will see.
function toApiShape(row: NoteRow): Note {
  return {
    id: row.id,
    title: row.title,
    bodyJson: row.bodyJson,
    bodyText: row.bodyText,
    starred: row.starred,
    trashedAt: row.trashedAt ? row.trashedAt.toISOString() : null,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

export function createNotesService(deps: { repo: NotesRepository }) {
  const { repo } = deps;

  return {
    async list(userId: string, view: NoteView): Promise<Note[]> {
      const rows = await repo.listByView(userId, view);
      return rows.map(toApiShape);
    },

    async get(userId: string, id: string): Promise<Note> {
      const row = await repo.findById(userId, id);
      if (!row) throw new NotFoundError();
      return toApiShape(row);
    },

    async create(userId: string, input: CreateNoteRequest): Promise<Note> {
      const row = await repo.create(userId, input);
      return toApiShape(row);
    },

    async update(userId: string, id: string, patch: UpdateNoteRequest): Promise<Note> {
      // trashedAt arrives as `string | null | undefined`. undefined ⇒ leave
      // untouched; null ⇒ untrash; string ⇒ trash with that timestamp.
      const trashedAt =
        patch.trashedAt === undefined
          ? undefined
          : patch.trashedAt === null
            ? null
            : new Date(patch.trashedAt);

      const row = await repo.update(userId, id, {
        title: patch.title,
        bodyJson: patch.bodyJson,
        bodyText: patch.bodyText,
        starred: patch.starred,
        trashedAt,
      });
      if (!row) throw new NotFoundError();
      return toApiShape(row);
    },

    async delete(userId: string, id: string): Promise<void> {
      const deleted = await repo.delete(userId, id);
      if (!deleted) throw new NotFoundError();
    },
  };
}

export type NotesService = ReturnType<typeof createNotesService>;
