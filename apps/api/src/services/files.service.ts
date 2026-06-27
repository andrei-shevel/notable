import { randomUUID } from 'node:crypto';
import { Transform, type Readable } from 'node:stream';
import { pipeline } from 'node:stream/promises';

import type { FastifyBaseLogger } from 'fastify';
import type { FileMeta } from '@notable/shared';
import { NotFoundError } from '@/errors/AppError';
import type { FileRow, FilesRepository } from '@/repositories/files.repository';
import type { NotesRepository } from '@/repositories/notes.repository';
import type { Storage } from '@/lib/storage';

// Drizzle returns a Date for created_at; the API contract is an ISO string.
// `key` is dropped here so the storage layout never leaks to clients.
function toApiShape(row: FileRow): FileMeta {
  return {
    id: row.id,
    filename: row.filename,
    contentType: row.contentType,
    size: row.size,
    createdAt: row.createdAt.toISOString(),
  };
}

export type UploadInput = {
  filename: string;
  contentType: string;
  body: Readable;
};

export function createFilesService(deps: {
  repo: FilesRepository;
  notesRepo: NotesRepository;
  storage: Storage;
  logger: FastifyBaseLogger;
}) {
  const { repo, notesRepo, storage, logger } = deps;

  return {
    async upload(userId: string, noteId: string, input: UploadInput): Promise<FileMeta> {
      // The file is bound to a note and cascades with it, so the note must
      // belong to the uploader — otherwise a user could attach (and later cause
      // the deletion of) files on someone else's note. findById is user-scoped.
      const note = await notesRepo.findById(userId, noteId);
      if (!note) throw new NotFoundError('Note not found');

      // Namespace keys by user and a random uuid: keeps one user's objects from
      // colliding with another's and makes the owner obvious in the bucket.
      const key = `${userId}/${randomUUID()}`;

      // The blob is streamed straight to object storage — never fully buffered
      // in memory — so we don't know its size up front. A pass-through tallies
      // bytes as they flow so the row can record an exact size.
      let size = 0;
      const counter = new Transform({
        transform(chunk, _enc, cb) {
          size += chunk.length;
          cb(null, chunk);
        },
      });

      // Pump source → counter in the background while storage.put drains the
      // counter into S3. If either side fails (e.g. the upload exceeds the
      // size limit and the source stream errors), pipeline tears down the
      // counter, storage.put rejects, and Promise.all surfaces the error —
      // before any row is written, so a row never points at a missing object.
      await Promise.all([
        pipeline(input.body, counter),
        storage.put(key, counter, input.contentType),
      ]);

      const row = await repo.create(userId, {
        noteId,
        key,
        filename: input.filename,
        contentType: input.contentType,
        size,
      });
      logger.debug(
        { userId, noteId, fileId: row.id, size, contentType: input.contentType },
        'file uploaded',
      );
      return toApiShape(row);
    },

    // Deletes every file belonging to a note — DB rows and the blobs in object
    // storage. Called when a note is hard-deleted. Object deletes are
    // best-effort: a failure leaves an orphan blob (rare, and reclaimable),
    // which beats failing the note deletion the user asked for. The DB rows
    // would also cascade via the note FK, but deleting them here keeps the row
    // and blob removal in one place.
    async deleteForNote(userId: string, noteId: string): Promise<void> {
      const deleted = await repo.deleteByNote(userId, noteId);
      await Promise.all(
        deleted.map((f) =>
          // Best-effort: the row is already gone, so a failed blob delete leaves
          // an orphan in object storage. Log it (rather than swallow silently)
          // so the leak is visible and reclaimable; don't fail the deletion.
          storage.delete(f.key).catch((err) => {
            logger.warn(
              { err, userId, noteId, key: f.key },
              'orphaned blob: storage delete failed',
            );
          }),
        ),
      );
    },

    // Copies a file into another note and returns the new file's metadata. Used
    // when an image is pasted from one note into another: the pasted node still
    // points at the source note's file, so we clone the blob (server-side copy)
    // and bind a fresh row to the destination note, keeping the one-file-per-
    // note invariant that delete-on-note-delete relies on. If the file already
    // belongs to the target note (same-note paste), it's returned unchanged so
    // we don't duplicate the blob.
    async cloneToNote(userId: string, fileId: string, noteId: string): Promise<FileMeta> {
      const source = await repo.findById(userId, fileId);
      if (!source) throw new NotFoundError('File not found');
      if (source.noteId === noteId) return toApiShape(source);

      const note = await notesRepo.findById(userId, noteId);
      if (!note) throw new NotFoundError('Note not found');

      const key = `${userId}/${randomUUID()}`;
      await storage.copy(source.key, key);
      const row = await repo.create(userId, {
        noteId,
        key,
        filename: source.filename,
        contentType: source.contentType,
        size: source.size,
      });
      return toApiShape(row);
    },

    async getMetadata(userId: string, id: string): Promise<FileMeta> {
      const row = await repo.findById(userId, id);
      if (!row) throw new NotFoundError();
      return toApiShape(row);
    },

    // Returns the metadata alongside a readable stream of the blob. The route
    // uses the metadata for the content-type / content-disposition headers.
    async getFile(userId: string, id: string): Promise<{ meta: FileMeta; stream: Readable }> {
      const row = await repo.findById(userId, id);
      if (!row) throw new NotFoundError();
      const stream = await storage.get(row.key);
      return { meta: toApiShape(row), stream };
    },
  };
}

export type FilesService = ReturnType<typeof createFilesService>;
