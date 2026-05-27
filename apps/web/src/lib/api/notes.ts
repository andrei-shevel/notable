import ky from 'ky';

import type {
  CreateNoteRequest,
  Note,
  NoteListQuery,
  NoteListResponse,
  UpdateNoteRequest,
} from '@notable/shared';

export const notesApi = {
  create: (body: CreateNoteRequest) => ky.post<Note>('/api/notes', { json: body }),
  list: (query: NoteListQuery, signal?: AbortSignal) =>
    ky.get<NoteListResponse>('/api/notes', { searchParams: query, signal }),
  get: (id: string, signal?: AbortSignal) => ky.get<Note>(`/api/notes/${id}`, { signal }),
  update: (id: string, body: UpdateNoteRequest, signal?: AbortSignal) =>
    ky.patch<Note>(`/api/notes/${id}`, { json: body, signal }),
  delete: (id: string) => ky.delete(`/api/notes/${id}`),
};
