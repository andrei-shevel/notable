import ky from 'ky';

import type { CreateNoteRequest, Note, NoteListQuery, NoteListResponse } from '@notable/shared';

export const notesApi = {
  create: (body: CreateNoteRequest) => ky.post<Note>('/api/notes', { json: body }),
  list: (query: NoteListQuery, signal?: AbortSignal) =>
    ky.get<NoteListResponse>('/api/notes', { searchParams: query, signal }),
  get: (id: string, signal?: AbortSignal) => ky.get<Note>(`/api/notes/${id}`, { signal }),
};
