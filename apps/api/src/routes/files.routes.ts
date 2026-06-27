import type { FastifyPluginAsyncZod } from 'fastify-type-provider-zod';

import {
  ErrorResponseSchema,
  FileGetQuerySchema,
  FileIdParamsSchema,
  FileSchema,
  FileUploadQuerySchema,
} from '@notable/shared';
import { BadRequestError, PayloadTooLargeError } from '@/errors/AppError';
import { requireUser } from '@/plugins/auth';
import type { FilesService } from '@/services/files.service';

type FilesRoutesOptions = { filesService: FilesService };

export const filesRoutes: FastifyPluginAsyncZod<FilesRoutesOptions> = async (app, opts) => {
  const { filesService } = opts;

  // Every route in this plugin requires an authenticated user — see the same
  // pattern in notes.routes.ts.
  app.addHook('preHandler', requireUser);

  // Multipart upload. The file stream (`data.file`) is handed straight to the
  // service, which pipes it to object storage without buffering it in memory.
  // `@fastify/multipart` is registered globally in server.ts; it caps the
  // stream at the size limit and errors (413) past it. A 413 from there
  // propagates through the upload pipeline.
  app.post(
    '/',
    {
      schema: {
        consumes: ['multipart/form-data'],
        querystring: FileUploadQuerySchema,
        response: {
          200: FileSchema,
          400: ErrorResponseSchema,
          401: ErrorResponseSchema,
          404: ErrorResponseSchema,
          413: ErrorResponseSchema,
        },
      },
    },
    async (req) => {
      const data = await req.file();
      if (!data) throw new BadRequestError('No file provided');
      // busboy emits 'limit' (and sets file.truncated) when the stream hits the
      // configured size cap, then ends the stream *cleanly* — so without this
      // the upload would silently store a truncated blob. Destroying the stream
      // with a 413 propagates through the upload pipeline and aborts the
      // multipart upload before any row is written.
      data.file.on('limit', () => {
        data.file.destroy(new PayloadTooLargeError('File exceeds the upload size limit'));
      });
      return await filesService.upload(req.user.id, req.query.noteId, {
        filename: data.filename,
        contentType: data.mimetype,
        body: data.file,
      });
    },
  );

  // Clones an existing file into another note: POST /api/files/:id/clone?noteId=
  // The source file must belong to the user, as must the destination note.
  // Used when an image is pasted across notes so the copy is owned by its new
  // note (and cleaned up with it).
  app.post(
    '/:id/clone',
    {
      schema: {
        params: FileIdParamsSchema,
        querystring: FileUploadQuerySchema,
        response: {
          200: FileSchema,
          401: ErrorResponseSchema,
          404: ErrorResponseSchema,
        },
      },
    },
    async (req) => {
      return await filesService.cloneToNote(req.user.id, req.params.id, req.query.noteId);
    },
  );

  // Default: JSON metadata from the table. `?type=file` streams the blob back
  // with its stored content-type. Authorization lives in the service/repo,
  // which scope every lookup to req.user.id and 404 otherwise.
  app.get(
    '/:id',
    {
      schema: {
        params: FileIdParamsSchema,
        querystring: FileGetQuerySchema,
        response: {
          // Declared for the metadata branch. When the handler returns the blob
          // stream instead, Fastify pipes it directly and skips this serializer.
          200: FileSchema,
          401: ErrorResponseSchema,
          404: ErrorResponseSchema,
        },
      },
    },
    async (req, reply) => {
      if (req.query.type === 'file') {
        const { meta, stream } = await filesService.getFile(req.user.id, req.params.id);
        reply
          .header('content-type', meta.contentType)
          .header('content-length', meta.size)
          .header('content-disposition', `inline; filename="${encodeURIComponent(meta.filename)}"`);
        // `as never`: the zod type provider types send() against the 200
        // metadata schema, but Fastify pipes stream payloads directly (skipping
        // that serializer), so this is sound at runtime.
        return reply.send(stream as never);
      }
      return await filesService.getMetadata(req.user.id, req.params.id);
    },
  );
};
