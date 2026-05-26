import { z } from 'zod';

// Which slice of the user's notes the list endpoint should return.
//   all      → not in trash
//   starred  → not in trash AND starred = true
//   trash    → trashed_at IS NOT NULL
export const NoteViewSchema = z.enum(['all', 'starred', 'trash']);
export type NoteView = z.infer<typeof NoteViewSchema>;

// Tiptap doc payload. Deliberately loose: Tiptap controls the shape on both
// ends, the server only stores it and derives FTS from the sibling body_text
// snapshot. Tightening this would just break harmlessly when Tiptap adds new
// node types.
export const TiptapDocSchema = z.unknown();

export const NoteSchema = z.object({
  id: z.uuid(),
  title: z.string(),
  bodyJson: TiptapDocSchema,
  bodyText: z.string(),
  starred: z.boolean(),
  trashedAt: z.iso.datetime().nullable(),
  createdAt: z.iso.datetime(),
  updatedAt: z.iso.datetime(),
});
export type Note = z.infer<typeof NoteSchema>;

export const NoteListQuerySchema = z.object({
  view: NoteViewSchema.default('all'),
});
export type NoteListQuery = z.infer<typeof NoteListQuerySchema>;

export const NoteListResponseSchema = z.array(NoteSchema);
export type NoteListResponse = z.infer<typeof NoteListResponseSchema>;

export const NoteIdParamsSchema = z.object({ id: z.uuid() });
export type NoteIdParams = z.infer<typeof NoteIdParamsSchema>;

export const CreateNoteRequestSchema = z.object({
  title: z.string().max(500).optional(),
  bodyJson: TiptapDocSchema.optional(),
  bodyText: z.string().optional(),
});
export type CreateNoteRequest = z.infer<typeof CreateNoteRequestSchema>;

// All fields optional; the route applies only the keys present so a client
// can PATCH a single field (e.g. just `starred`) without resending the body.
// `trashedAt: null` untrashes; an ISO string trashes; omitted leaves as-is.
export const UpdateNoteRequestSchema = z.object({
  title: z.string().max(500).optional(),
  bodyJson: TiptapDocSchema.optional(),
  bodyText: z.string().optional(),
  starred: z.boolean().optional(),
  trashedAt: z.iso.datetime().nullable().optional(),
});
export type UpdateNoteRequest = z.infer<typeof UpdateNoteRequestSchema>;

export const DeleteNoteResponseSchema = z.object({ ok: z.literal(true) });
export type DeleteNoteResponse = z.infer<typeof DeleteNoteResponseSchema>;
