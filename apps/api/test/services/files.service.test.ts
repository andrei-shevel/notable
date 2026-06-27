import { Readable } from 'node:stream';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { NotFoundError } from '../../src/errors/AppError';
import type { FileRow, FilesRepository } from '../../src/repositories/files.repository';
import type { NotesRepository } from '../../src/repositories/notes.repository';
import type { Storage } from '../../src/lib/storage';
import { createFilesService } from '../../src/services/files.service';

const USER = 'user-1';
const KEY_RE = /^user-1\/[0-9a-f-]{36}$/; // `${userId}/${uuid}`

function fileRow(over: Partial<FileRow> = {}): FileRow {
  return {
    id: 'file-1',
    noteId: 'note-A',
    key: 'user-1/aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
    filename: 'pic.png',
    contentType: 'image/png',
    size: 123,
    createdAt: new Date('2026-01-01T00:00:00Z'),
    ...over,
  };
}

// Storage fake whose `put` actually consumes the stream into an in-memory map —
// required, since the service relies on the consumer draining the counter, and
// it lets us assert exactly what bytes reached storage.
function makeStorage() {
  const blobs = new Map<string, Buffer>();
  return {
    blobs,
    put: vi.fn(async (key: string, body: Readable) => {
      const chunks: Buffer[] = [];
      for await (const chunk of body) chunks.push(chunk as Buffer);
      blobs.set(key, Buffer.concat(chunks));
    }),
    get: vi.fn(async () => Readable.from(['blob-bytes'])),
    delete: vi.fn(async () => {}),
    copy: vi.fn(async (src: string, dest: string) => {
      const data = blobs.get(src);
      if (data) blobs.set(dest, data);
    }),
    ensureBucket: vi.fn(async () => {}),
  };
}

function makeDeps() {
  const repo = {
    create: vi.fn(async (_userId: string, input: import('../../src/repositories/files.repository').CreateFileInput) =>
      fileRow({
        noteId: input.noteId,
        key: input.key,
        filename: input.filename,
        contentType: input.contentType,
        size: input.size,
      }),
    ),
    deleteByNote: vi.fn(async () => [] as { key: string }[]),
    findById: vi.fn(async () => null as FileRow | null),
  };
  const notesRepo = {
    findById: vi.fn(async () => ({ id: 'note-A' })),
  };
  const storage = makeStorage();
  return { repo, notesRepo, storage };
}

function build(deps: ReturnType<typeof makeDeps>) {
  return createFilesService({
    repo: deps.repo as unknown as FilesRepository,
    notesRepo: deps.notesRepo as unknown as NotesRepository,
    storage: deps.storage as unknown as Storage,
  });
}

describe('filesService', () => {
  let deps: ReturnType<typeof makeDeps>;
  let service: ReturnType<typeof createFilesService>;

  beforeEach(() => {
    deps = makeDeps();
    service = build(deps);
  });

  describe('upload', () => {
    const input = () => ({
      filename: 'pic.png',
      contentType: 'image/png',
      body: Readable.from([Buffer.from('hello '), Buffer.from('world')]), // 11 bytes
    });

    it('authorizes against the owning note before doing anything', async () => {
      deps.notesRepo.findById.mockResolvedValue(null as never);

      await expect(service.upload(USER, 'note-A', input())).rejects.toBeInstanceOf(NotFoundError);
      expect(deps.storage.put).not.toHaveBeenCalled();
      expect(deps.repo.create).not.toHaveBeenCalled();
    });

    it('streams to storage under a user-namespaced key and records the exact size', async () => {
      const result = await service.upload(USER, 'note-A', input());

      const putKey = deps.storage.put.mock.calls[0]![0];
      expect(putKey).toMatch(KEY_RE);
      expect(deps.storage.blobs.get(putKey)?.toString()).toBe('hello world');

      // The row is bound to the same key that was written, with the byte count
      // tallied from the stream (not supplied by the client).
      const [, createInput] = deps.repo.create.mock.calls[0]!;
      expect(createInput).toMatchObject({ noteId: 'note-A', key: putKey, size: 11 });
      expect(result.size).toBe(11);
    });

    it('writes the row only after the blob lands', async () => {
      await service.upload(USER, 'note-A', input());

      // Invocation order proves the row insert follows the storage write; the
      // reject test below proves it *depends* on the write succeeding.
      expect(deps.storage.put.mock.invocationCallOrder[0]!).toBeLessThan(
        deps.repo.create.mock.invocationCallOrder[0]!,
      );
    });

    it('never writes a row if the blob upload fails', async () => {
      deps.storage.put.mockImplementationOnce(async (_key: string, body: Readable) => {
        for await (const _chunk of body) {
          // drain so the pipeline settles, then fail as a truncated/oversized
          // upload would.
        }
        throw new Error('storage exploded');
      });

      await expect(service.upload(USER, 'note-A', input())).rejects.toThrow('storage exploded');
      expect(deps.repo.create).not.toHaveBeenCalled();
    });

    it('returns API metadata without leaking the storage key', async () => {
      const result = await service.upload(USER, 'note-A', input());
      expect(result).not.toHaveProperty('key');
      expect(result).not.toHaveProperty('noteId');
      expect(typeof result.createdAt).toBe('string');
    });
  });

  describe('deleteForNote', () => {
    it('removes every row and its blob', async () => {
      deps.repo.deleteByNote.mockResolvedValue([{ key: 'k1' }, { key: 'k2' }]);

      await service.deleteForNote(USER, 'note-A');

      expect(deps.repo.deleteByNote).toHaveBeenCalledWith(USER, 'note-A');
      expect(deps.storage.delete).toHaveBeenCalledWith('k1');
      expect(deps.storage.delete).toHaveBeenCalledWith('k2');
    });

    it('is best-effort: a blob delete failure does not throw', async () => {
      deps.repo.deleteByNote.mockResolvedValue([{ key: 'k1' }]);
      deps.storage.delete.mockRejectedValue(new Error('orphan blob'));

      await expect(service.deleteForNote(USER, 'note-A')).resolves.toBeUndefined();
    });
  });

  describe('cloneToNote', () => {
    it('rejects an unknown source file', async () => {
      deps.repo.findById.mockResolvedValue(null);
      await expect(service.cloneToNote(USER, 'missing', 'note-B')).rejects.toBeInstanceOf(
        NotFoundError,
      );
      expect(deps.storage.copy).not.toHaveBeenCalled();
    });

    it('short-circuits a same-note clone without copying the blob', async () => {
      const source = fileRow({ noteId: 'note-A' });
      deps.repo.findById.mockResolvedValue(source);

      const result = await service.cloneToNote(USER, source.id, 'note-A');

      expect(deps.storage.copy).not.toHaveBeenCalled();
      expect(deps.repo.create).not.toHaveBeenCalled();
      expect(result.id).toBe(source.id);
    });

    it('rejects when the destination note is not the user’s', async () => {
      deps.repo.findById.mockResolvedValue(fileRow({ noteId: 'note-A' }));
      deps.notesRepo.findById.mockResolvedValue(null as never);

      await expect(service.cloneToNote(USER, 'file-1', 'note-B')).rejects.toBeInstanceOf(
        NotFoundError,
      );
      expect(deps.storage.copy).not.toHaveBeenCalled();
    });

    it('copies the blob to a fresh key and binds a new row to the destination note', async () => {
      const source = fileRow({ noteId: 'note-A', key: 'user-1/src', filename: 'shared.png', size: 9 });
      deps.repo.findById.mockResolvedValue(source);

      const result = await service.cloneToNote(USER, source.id, 'note-B');

      const [srcKey, destKey] = deps.storage.copy.mock.calls[0]!;
      expect(srcKey).toBe('user-1/src');
      expect(destKey).toMatch(KEY_RE);
      expect(destKey).not.toBe(srcKey);

      const [, createInput] = deps.repo.create.mock.calls[0]!;
      expect(createInput).toMatchObject({
        noteId: 'note-B',
        key: destKey,
        filename: 'shared.png',
        contentType: source.contentType,
        size: 9,
      });
      expect(result).not.toHaveProperty('key');
    });
  });

  describe('reads', () => {
    it('getMetadata maps a row to API shape, or 404s', async () => {
      deps.repo.findById.mockResolvedValue(fileRow());
      await expect(service.getMetadata(USER, 'file-1')).resolves.toMatchObject({ id: 'file-1' });

      deps.repo.findById.mockResolvedValue(null);
      await expect(service.getMetadata(USER, 'nope')).rejects.toBeInstanceOf(NotFoundError);
    });

    it('getFile returns the blob stream for the row’s key', async () => {
      deps.repo.findById.mockResolvedValue(fileRow({ key: 'user-1/the-key' }));

      const { meta, stream } = await service.getFile(USER, 'file-1');

      expect(meta.id).toBe('file-1');
      expect(deps.storage.get).toHaveBeenCalledWith('user-1/the-key');
      expect(stream).toBeInstanceOf(Readable);
    });

    it('getFile 404s an unknown file before hitting storage', async () => {
      deps.repo.findById.mockResolvedValue(null);
      await expect(service.getFile(USER, 'nope')).rejects.toBeInstanceOf(NotFoundError);
      expect(deps.storage.get).not.toHaveBeenCalled();
    });
  });
});
