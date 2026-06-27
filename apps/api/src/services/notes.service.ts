import type { FastifyBaseLogger } from 'fastify';
import type {
  CreateNoteRequest,
  Note,
  NoteListResponse,
  NoteOrderField,
  NoteView,
  SortDirection,
  UpdateNoteRequest,
} from '@notable/shared';
import type { JSONContent } from '@notable/editor/server';
import { BadRequestError, NotFoundError } from '@/errors/AppError';
import type { ListCursor, NoteRow, NotesRepository } from '@/repositories/notes.repository';

// Drizzle returns Date instances for timestamptz; the API contract is ISO
// strings. Centralising the mapping here keeps routes thin and means the
// serializerCompiler validates the same shape the client will see.
function toApiShape(row: NoteRow): Note {
  return {
    id: row.id,
    title: row.title,
    // Asserted at the DB→API boundary: Drizzle returns the jsonb column as
    // `unknown` since the database can't enforce structure, but every write
    // path stores a Tiptap doc, so callers can rely on the typed shape.
    bodyJson: row.bodyJson as JSONContent,
    bodyText: row.bodyText,
    starred: row.starred,
    trashedAt: row.trashedAt ? row.trashedAt.toISOString() : null,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

// Opaque cursor format: base64url(JSON({ f, d, v, i })). Short keys keep the
// URL parameter compact. f (field) and d (direction) are embedded so the
// server can reject a cursor reused with a different ordering — flipping
// either silently would skip or duplicate rows.
function encodeCursor(row: NoteRow, field: NoteOrderField, dir: SortDirection): string {
  const value = field === 'title' ? row.title : row[field].toISOString();
  return Buffer.from(JSON.stringify({ f: field, d: dir, v: value, i: row.id })).toString(
    'base64url',
  );
}

function decodeCursor(
  cursor: string,
  expectedField: NoteOrderField,
  expectedDir: SortDirection,
): ListCursor {
  let parsed: unknown;
  try {
    parsed = JSON.parse(Buffer.from(cursor, 'base64url').toString('utf8'));
  } catch {
    throw new BadRequestError('Invalid cursor');
  }
  if (typeof parsed !== 'object' || parsed === null) {
    throw new BadRequestError('Invalid cursor');
  }
  const p = parsed as { f?: unknown; d?: unknown; v?: unknown; i?: unknown };
  if (typeof p.i !== 'string' || typeof p.v !== 'string') {
    throw new BadRequestError('Invalid cursor');
  }
  if (p.f !== expectedField || p.d !== expectedDir) {
    throw new BadRequestError('Cursor does not match order');
  }

  if (expectedField === 'title') {
    return { field: 'title', value: p.v, id: p.i };
  }
  const date = new Date(p.v);
  if (Number.isNaN(date.getTime())) throw new BadRequestError('Invalid cursor');
  return { field: expectedField, value: date, id: p.i };
}

// Minimal slice of FilesService that notes deletion needs. Kept as a local
// interface (rather than importing FilesService) so the notes service has no
// dependency on the files service's shape beyond this one call.
type NoteFilesCleanup = {
  deleteForNote(userId: string, noteId: string): Promise<void>;
};

export function createNotesService(deps: {
  repo: NotesRepository;
  files: NoteFilesCleanup;
  logger: FastifyBaseLogger;
}) {
  const { repo, files, logger } = deps;

  return {
    async list(
      userId: string,
      opts: {
        orderBy: NoteOrderField;
        orderDir: SortDirection;
        view?: NoteView;
        q?: string;
        limit?: number;
        cursor?: string;
      },
    ): Promise<NoteListResponse> {
      const { orderBy, orderDir } = opts;
      const decoded = opts.cursor ? decodeCursor(opts.cursor, orderBy, orderDir) : undefined;
      const { rows, hasMore } = await repo.list(userId, {
        orderBy,
        orderDir,
        view: opts.view,
        q: opts.q,
        limit: opts.limit,
        cursor: decoded,
      });
      const lastRow = rows[rows.length - 1];
      return {
        items: rows.map(toApiShape),
        nextCursor: hasMore && lastRow ? encodeCursor(lastRow, orderBy, orderDir) : null,
      };
    },

    async get(userId: string, id: string): Promise<Note> {
      const row = await repo.findById(userId, id);
      if (!row) throw new NotFoundError();
      return toApiShape(row);
    },

    async create(userId: string, input: CreateNoteRequest): Promise<Note> {
      const row = await repo.create(userId, input);
      logger.debug({ userId, noteId: row.id }, 'note created');
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
      logger.debug({ userId, noteId: id }, 'note updated');
      return toApiShape(row);
    },

    async delete(userId: string, id: string): Promise<void> {
      const existing = await repo.findById(userId, id);
      if (!existing) {
        throw new NotFoundError();
      }
      if (existing.trashedAt === null) {
        // Soft delete (move to trash). Files are kept — the note can be
        // restored — and are only purged on the hard delete below.
        await repo.update(userId, id, { trashedAt: new Date() });
        logger.debug({ userId, noteId: id, mode: 'soft' }, 'note deleted');
      } else {
        // Hard delete. Remove the note's files (DB rows + blobs) first; the FK
        // cascade would drop the rows anyway, but only this reclaims the blobs
        // from object storage.
        await files.deleteForNote(userId, id);
        await repo.delete(userId, id);
        logger.debug({ userId, noteId: id, mode: 'hard' }, 'note deleted');
      }
    },
  };
}

export type NotesService = ReturnType<typeof createNotesService>;
