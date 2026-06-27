import type { FastifyPluginAsyncZod } from 'fastify-type-provider-zod';

import {
  CreateNoteRequestSchema,
  DeleteNoteResponseSchema,
  ErrorResponseSchema,
  NoteIdParamsSchema,
  NoteListQuerySchema,
  NoteListResponseSchema,
  NoteSchema,
  UpdateNoteRequestSchema,
} from '@notable/shared';
import { requireUser } from '@/plugins/auth';
import type { NotesService } from '@/services/notes.service';

type NotesRoutesOptions = { notesService: NotesService };

export const notesRoutes: FastifyPluginAsyncZod<NotesRoutesOptions> = async (app, opts) => {
  const { notesService } = opts;

  // Encapsulation: this hook only fires for routes registered inside this
  // plugin, so a future route added below is gated by default — no chance
  // of forgetting `preHandler: requireUser` on a new handler.
  app.addHook('preHandler', requireUser);

  app.get(
    '/',
    {
      schema: {
        querystring: NoteListQuerySchema,
        response: {
          200: NoteListResponseSchema,
          401: ErrorResponseSchema,
        },
      },
    },
    async (req) => {
      return await notesService.list(req.user.id, {
        orderBy: req.query.orderBy,
        orderDir: req.query.orderDir,
        view: req.query.view,
        q: req.query.q,
        limit: req.query.limit,
        cursor: req.query.cursor,
      });
    },
  );

  app.post(
    '/',
    {
      schema: {
        body: CreateNoteRequestSchema,
        response: {
          200: NoteSchema,
          401: ErrorResponseSchema,
        },
      },
    },
    async (req) => {
      return await notesService.create(req.user.id, req.body);
    },
  );

  app.get(
    '/:id',
    {
      schema: {
        params: NoteIdParamsSchema,
        response: {
          200: NoteSchema,
          401: ErrorResponseSchema,
          404: ErrorResponseSchema,
        },
      },
    },
    async (req) => {
      return await notesService.get(req.user.id, req.params.id);
    },
  );

  app.patch(
    '/:id',
    {
      schema: {
        params: NoteIdParamsSchema,
        body: UpdateNoteRequestSchema,
        response: {
          200: NoteSchema,
          401: ErrorResponseSchema,
          404: ErrorResponseSchema,
        },
      },
    },
    async (req) => {
      return await notesService.update(req.user.id, req.params.id, req.body);
    },
  );

  app.delete(
    '/:id',
    {
      schema: {
        params: NoteIdParamsSchema,
        response: {
          200: DeleteNoteResponseSchema,
          401: ErrorResponseSchema,
          404: ErrorResponseSchema,
        },
      },
    },
    async (req) => {
      await notesService.delete(req.user.id, req.params.id);
      return { ok: true as const };
    },
  );
};
