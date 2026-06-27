import type { FastifyBaseLogger } from 'fastify';
import { db } from '@/db/client';
import { storage } from '@/lib/storage';
import { createAuthRepository } from '@/repositories/auth.repository';
import { createFilesRepository } from '@/repositories/files.repository';
import { createNotesRepository } from '@/repositories/notes.repository';
import { type AuthService, createAuthService } from '@/services/auth.service';
import { createFilesService, type FilesService } from '@/services/files.service';
import { createNotesService, type NotesService } from '@/services/notes.service';

export type Services = {
  authService: AuthService;
  notesService: NotesService;
  filesService: FilesService;
};

// Composition root: wires repositories and services together so server.ts only
// has to register the resulting routes.
//
// filesService depends on notesRepository (to authorize uploads against the
// owning note); notesService depends on filesService (to purge a deleted note's
// files). No cycle: notes → files → notes *repository*, not service.
export function createServices(logger: FastifyBaseLogger): Services {
  const authService = createAuthService({ repo: createAuthRepository(db), logger });

  const notesRepository = createNotesRepository(db);
  const filesRepository = createFilesRepository(db);
  const filesService = createFilesService({
    repo: filesRepository,
    notesRepo: notesRepository,
    storage,
    logger,
  });
  const notesService = createNotesService({
    repo: notesRepository,
    files: filesService,
    logger,
  });

  return { authService, notesService, filesService };
}
