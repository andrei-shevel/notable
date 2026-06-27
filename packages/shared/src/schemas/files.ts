import { z } from 'zod';

// Metadata row returned by the upload and get endpoints. The blob bytes are
// never inlined here — fetch them via GET /api/files/:id?type=file.
export const FileSchema = z.object({
  id: z.uuid(),
  filename: z.string(),
  contentType: z.string(),
  size: z.number().int().nonnegative(),
  createdAt: z.iso.datetime(),
});
export type FileMeta = z.infer<typeof FileSchema>;

export const FileIdParamsSchema = z.object({ id: z.uuid() });
export type FileIdParams = z.infer<typeof FileIdParamsSchema>;

// Upload binds the file to a note: POST /api/files?noteId=<uuid>. The note must
// belong to the uploader, and deleting the note removes the file.
export const FileUploadQuerySchema = z.object({ noteId: z.uuid() });
export type FileUploadQuery = z.infer<typeof FileUploadQuerySchema>;

// GET /api/files/:id returns JSON metadata by default. `?type=file` switches
// the response to the raw blob streamed with its stored content-type.
export const FileGetQuerySchema = z.object({
  type: z.enum(['file']).optional(),
});
export type FileGetQuery = z.infer<typeof FileGetQuerySchema>;
