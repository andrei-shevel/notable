import type { JSONContent } from '@tiptap/core';
import { z } from 'zod';

// Optional filter applied to the list endpoint.
//   omitted  → not in trash
//   starred  → not in trash AND starred = true
//   trash    → trashed_at IS NOT NULL
export const NoteViewSchema = z.enum(['starred', 'trash']);
export type NoteView = z.infer<typeof NoteViewSchema>;

// Allow-list of sortable columns. Bounded so the parameter cannot be turned
// into arbitrary SQL via the API, and so we can pre-declare matching indexes.
export const NoteOrderFieldSchema = z.enum(['updatedAt', 'createdAt', 'title']);
export type NoteOrderField = z.infer<typeof NoteOrderFieldSchema>;

export const SortDirectionSchema = z.enum(['asc', 'desc']);
export type SortDirection = z.infer<typeof SortDirectionSchema>;

// Tiptap doc payload. Runtime validation is deliberately loose (Tiptap
// controls the shape on both ends, the server only stores it and derives FTS
// from the sibling body_text snapshot) but we annotate the inferred TS type
// as JSONContent so callers get useful completion without an extra cast.
export const TiptapDocSchema = z.custom<JSONContent>();

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
  view: NoteViewSchema.optional(),
  orderBy: NoteOrderFieldSchema.default('updatedAt'),
  orderDir: SortDirectionSchema.default('desc'),
  q: z.string().trim().min(1).max(200).optional(),
  limit: z.coerce.number().int().min(1).max(100).optional(),
  // Opaque cursor returned by a previous list call. Clients should treat as
  // a black box. Encoding embeds the field+direction it was issued under; the
  // server rejects cursors paired with a different (orderBy, orderDir).
  cursor: z.string().optional(),
});
export type NoteListQuery = z.infer<typeof NoteListQuerySchema>;

export const NoteListResponseSchema = z.object({
  items: z.array(NoteSchema),
  // null when the current page is the last one.
  nextCursor: z.string().nullable(),
});
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
